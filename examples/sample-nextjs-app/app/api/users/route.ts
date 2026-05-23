import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { email, firstName, lastName, phone } = await req.json();
  // TODO: save to database (PII sink — scanner should detect this)
  return NextResponse.json({ success: true });
}
