import { NextResponse } from "next/server";

// API skeleton route for single department operations.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  /*
  Functional responsibility:
  - Placeholder for fetching one department by id.
  
  Inputs:
  - Route param id from request context.
  
  Output:
  - 501 placeholder response with requested id.
  
  Failure behavior:
  - Returns stable 501 response for unimplemented endpoint.
  */
  const dicParams = await params;
  return NextResponse.json({ message: `Get department ${dicParams.id} placeholder` }, { status: 501 });
}

export async function PUT(_: Request, { params }: { params: Promise<{ id: string }> }) {
  /*
  Functional responsibility:
  - Placeholder for updating one department by id.
  
  Inputs:
  - Route param id and request body (not parsed in placeholder).
  
  Output:
  - 501 placeholder response with requested id.
  
  Failure behavior:
  - Returns stable 501 response for unimplemented endpoint.
  */
  const dicParams = await params;
  return NextResponse.json({ message: `Update department ${dicParams.id} placeholder` }, { status: 501 });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  /*
  Functional responsibility:
  - Placeholder for deleting one department by id.
  
  Inputs:
  - Route param id from request context.
  
  Output:
  - 501 placeholder response with requested id.
  
  Failure behavior:
  - Returns stable 501 response for unimplemented endpoint.
  */
  const dicParams = await params;
  return NextResponse.json({ message: `Delete department ${dicParams.id} placeholder` }, { status: 501 });
}
