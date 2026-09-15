import { Suspense } from "react";

import SessionExpiredClient from "./SessionExpiredClient";

export default function SessionExpiredPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SessionExpiredClient />
    </Suspense>
  );
}
