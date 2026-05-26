// API route — stores user PII to DB (ORM sink)
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, firstName, lastName, phone, address, postalCode, dateOfBirth } = body;

  // Stub: save to database — scanner detects as PII sink
  // prisma.user.create({ data: { email, firstName, lastName, phone, address, dateOfBirth } })

  return NextResponse.json({ success: true });
}
