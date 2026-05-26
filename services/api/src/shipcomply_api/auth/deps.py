from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError

from shipcomply_api.auth.jwt import verify_clerk_token

_bearer = HTTPBearer(auto_error=False)


class CurrentUser:
    def __init__(self, clerk_user_id: str, org_id: str, role: str, raw_claims: dict):
        self.clerk_user_id = clerk_user_id
        self.org_id = org_id
        self.role = role
        self.raw_claims = raw_claims


async def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> CurrentUser:
    if not creds:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    try:
        claims = await verify_clerk_token(creds.credentials)
    except JWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {e}")

    clerk_user_id = claims.get("sub", "")
    # Clerk puts org membership in `o.id` inside the JWT when using org tokens
    org_id = (claims.get("o") or {}).get("id") or claims.get("org_id", "")
    role = (claims.get("o") or {}).get("rol") or claims.get("org_role", "member")
    return CurrentUser(clerk_user_id=clerk_user_id, org_id=org_id, role=role, raw_claims=claims)


async def require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role not in ("admin", "org:admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
    return user
