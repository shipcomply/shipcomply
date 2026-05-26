"""Clerk webhook handler — syncs Org/User into Neon DB on signup events."""
import logging
from fastapi import APIRouter, Request, HTTPException
from sqlalchemy import select
from svix.webhooks import Webhook, WebhookVerificationError

from shipcomply_api.config import settings
from shipcomply_api.db.session import AsyncSessionLocal
from shipcomply_api.db.models import Org, User

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/api/webhooks/clerk")
async def clerk_webhook(request: Request):
    raw_body = await request.body()

    if not settings.clerk_webhook_secret:
        raise HTTPException(status_code=503, detail="Webhook endpoint not configured")
    else:
        try:
            wh = Webhook(settings.clerk_webhook_secret)
            wh.verify(
                raw_body,
                {
                    "svix-id": request.headers.get("svix-id", ""),
                    "svix-timestamp": request.headers.get("svix-timestamp", ""),
                    "svix-signature": request.headers.get("svix-signature", ""),
                },
            )
        except WebhookVerificationError:
            raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event = await request.json()
    event_type: str = event.get("type", "")
    data: dict = event.get("data", {})

    async with AsyncSessionLocal() as db:
        if event_type == "organization.created":
            clerk_org_id = data.get("id", "")
            existing = await db.scalar(select(Org).where(Org.clerk_org_id == clerk_org_id))
            if not existing:
                org = Org(
                    clerk_org_id=clerk_org_id,
                    name=data.get("name", ""),
                    slug=data.get("slug") or clerk_org_id,
                )
                db.add(org)
                await db.commit()
                logger.info("Created org clerk_org_id=%s", clerk_org_id)

        elif event_type == "user.created":
            clerk_user_id = data.get("id", "")
            email = (data.get("email_addresses") or [{}])[0].get("email_address", "")

            existing_user = await db.scalar(select(User).where(User.clerk_user_id == clerk_user_id))
            if not existing_user:
                shadow_org = Org(
                    clerk_org_id=f"personal_{clerk_user_id}",
                    name=email or clerk_user_id,
                    slug=f"personal-{clerk_user_id}",
                )
                db.add(shadow_org)
                await db.flush()

                user = User(
                    clerk_user_id=clerk_user_id,
                    org_id=shadow_org.id,
                    email=email,
                    role="owner",
                )
                db.add(user)
                await db.commit()
                logger.info("Created user+shadow_org clerk_user_id=%s", clerk_user_id)

        elif event_type == "organizationMembership.created":
            member_data = data.get("public_user_data", {})
            clerk_user_id = member_data.get("user_id", "")
            clerk_org_id = data.get("organization", {}).get("id", "")
            role = data.get("role", "member")

            org = await db.scalar(select(Org).where(Org.clerk_org_id == clerk_org_id))
            if not org:
                logger.warning("organizationMembership.created: org %s not in DB yet", clerk_org_id)
                return {"status": "org_not_found"}

            existing_user = await db.scalar(select(User).where(User.clerk_user_id == clerk_user_id))
            if not existing_user:
                user = User(
                    clerk_user_id=clerk_user_id,
                    org_id=org.id,
                    email=member_data.get("identifier", ""),
                    role=role,
                )
                db.add(user)
                await db.commit()
                logger.info("Added user %s to org %s", clerk_user_id, clerk_org_id)
            else:
                existing_user.org_id = org.id
                existing_user.role = role
                await db.commit()

    return {"status": "ok"}
