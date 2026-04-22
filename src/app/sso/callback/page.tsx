import { Suspense } from "react";

import SsoCallbackClient from "./SsoCallbackClient";

export default function SsoCallbackPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SsoCallbackClient />
    </Suspense>
  );
}
