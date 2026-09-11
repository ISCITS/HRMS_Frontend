import { NextResponse } from "next/server";

// API skeleton route for employee collection
export async function GET() {
  return NextResponse.json({ message: "Get employees placeholder" }, { status: 501 });
}

export async function POST() {
  return NextResponse.json({ message: "Create employee placeholder" }, { status: 501 });
}