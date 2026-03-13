import { NextResponse } from "next/server";

// API skeleton route for payroll run actions
export async function POST() {
  return NextResponse.json({ message: "Run payroll placeholder" }, { status: 501 });
}
