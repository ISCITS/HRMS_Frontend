import { NextResponse } from "next/server";

// Handles logout by clearing auth cookie and redirecting to login.
export async function GET(req: Request) {
  // Functional responsibility:
  // - Invalidate user session cookie on logout request.
  // Inputs:
  // - Incoming GET request for /logout.
  // Output:
  // - Redirect response to /login with cleared hrms_auth cookie.
  // Failure behavior:
  // - If cookie is already absent, response still redirects safely to /login.
  const strLoginUrl = new URL("/login", req.url);
  const dicResponse = NextResponse.redirect(strLoginUrl);
  dicResponse.cookies.set("hrms_auth", "", { path: "/", maxAge: 0 });
  return dicResponse;
}
