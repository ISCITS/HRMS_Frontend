import { NextResponse } from "next/server";

// API skeleton route for attendance
export async function GET() {
  return NextResponse.json({ message: "Get attendance records placeholder" }, { status: 501 });
}

export async function POST() {
  return NextResponse.json({ message: "Create attendance record placeholder" }, { status: 501 });
}