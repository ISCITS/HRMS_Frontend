import { NextResponse } from "next/server";

// API skeleton route for leave requests
export async function GET() {
  return NextResponse.json({ message: "Get leave requests placeholder" }, { status: 501 });
}

export async function POST() {
  return NextResponse.json({ message: "Create leave request placeholder" }, { status: 501 });
}