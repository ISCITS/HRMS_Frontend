import { NextResponse } from "next/server";

// API skeleton route for forgot password
export async function POST() {
  return NextResponse.json({ message: "Forgot password endpoint placeholder" }, { status: 501 });
}