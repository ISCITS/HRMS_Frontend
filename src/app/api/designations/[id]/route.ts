import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "Get designation placeholder" }, { status: 501 });
}

export async function PUT() {
  return NextResponse.json({ message: "Update designation placeholder" }, { status: 501 });
}
