import { NextResponse } from "next/server";

// API skeleton route for login
export async function POST() {
  return NextResponse.json({ message: "Login endpoint placeholder" }, { status: 501 });
}