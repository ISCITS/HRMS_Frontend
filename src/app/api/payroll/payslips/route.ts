import { NextResponse } from "next/server";

// API skeleton route for payslip listing and generation
export async function GET() {
  return NextResponse.json({ message: "Get payslips placeholder" }, { status: 501 });
}

export async function POST() {
  return NextResponse.json({ message: "Generate payslip placeholder" }, { status: 501 });
}
