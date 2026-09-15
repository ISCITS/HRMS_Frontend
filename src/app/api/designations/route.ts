import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "Get designations placeholder" }, { status: 501 });
}

export async function POST() {
  return NextResponse.json({ message: "Create designation placeholder" }, { status: 501 });
}
