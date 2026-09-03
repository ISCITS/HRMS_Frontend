/*
Functional responsibility:
- Reserve a single database entry point for future production data access.

Inputs:
- Database configuration will be supplied when persistence is introduced.

Output:
- Shared db placeholder module for server-side repositories.

Failure behavior:
- Throws if used before a real database client is configured.
*/
export function getDb() {
  throw new Error("Database client is not configured yet.");
}
