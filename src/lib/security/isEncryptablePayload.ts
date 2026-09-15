function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== "undefined" && value instanceof FormData;
}

function isFile(value: unknown): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

function isBlob(value: unknown): value is Blob {
  return typeof Blob !== "undefined" && value instanceof Blob;
}

function isArrayBuffer(value: unknown): value is ArrayBuffer {
  return typeof ArrayBuffer !== "undefined" && value instanceof ArrayBuffer;
}

function isArrayBufferView(value: unknown): boolean {
  return typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(value);
}

function isEmptyObject(value: Record<string, unknown>) {
  return Object.keys(value).length === 0;
}

export function isPayloadEncryptionMethod(method?: string) {
  if (!method) {
    return false;
  }

  const strMethod = method.toUpperCase();
  return strMethod === "POST" || strMethod === "PUT" || strMethod === "PATCH" || strMethod === "DELETE";
}

export function isEmptyPayload(payload: unknown) {
  if (payload == null) {
    return true;
  }

  if (typeof payload === "string") {
    return payload.trim().length === 0;
  }

  if (Array.isArray(payload)) {
    return payload.length === 0;
  }

  if (isObjectLike(payload) && !isFormData(payload) && !isFile(payload) && !isBlob(payload) && !isArrayBuffer(payload)) {
    return isEmptyObject(payload);
  }

  return false;
}

export function isEncryptablePayload(payload: unknown): payload is Exclude<unknown, FormData | File | Blob | ArrayBuffer> {
  if (isEmptyPayload(payload)) {
    return false;
  }

  if (isFormData(payload) || isFile(payload) || isBlob(payload) || isArrayBuffer(payload) || isArrayBufferView(payload)) {
    return false;
  }

  return true;
}
