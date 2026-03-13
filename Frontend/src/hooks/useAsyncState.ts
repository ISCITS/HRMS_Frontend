"use client";

import { useState } from "react";

type AsyncStatus = "idle" | "loading" | "success" | "error";

/*
Functional responsibility:
- Track lightweight async lifecycle state for client actions.

Inputs:
- Optional initial status for the async state machine.

Output:
- Current status flags plus helpers to transition between states.

Failure behavior:
- No thrown errors; consumers decide how to handle operation failures.
*/
export function useAsyncState(initialStatus: AsyncStatus = "idle") {
  const [status, setStatus] = useState<AsyncStatus>(initialStatus);

  return {
    status,
    isIdle: status === "idle",
    isLoading: status === "loading",
    isSuccess: status === "success",
    isError: status === "error",
    setIdle: () => setStatus("idle"),
    setLoading: () => setStatus("loading"),
    setSuccess: () => setStatus("success"),
    setError: () => setStatus("error")
  };
}

