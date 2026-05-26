// Server action — scanner should detect 'use server' + PII params
"use server";

export async function createUser(data: {
  email: string;
  firstName: string;
  phone: string;
}) {
  // Stub: persist user
  console.log("Creating user:", data.email);
}
