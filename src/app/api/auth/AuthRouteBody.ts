import { decryptPayload } from "@/lib/security/decryptPayload";

export type EncryptedRouteBody = {
  payload?: string;
};

export async function normalizeAuthRouteBody<TBody extends EncryptedRouteBody>(objBody: unknown) {
  if (
    objBody &&
    typeof objBody === "object" &&
    "payload" in objBody &&
    typeof (objBody as EncryptedRouteBody).payload === "string" &&
    (objBody as EncryptedRouteBody).payload?.trim()
  ) {
    return decryptPayload<TBody>((objBody as EncryptedRouteBody).payload ?? "");
  }

  return objBody as TBody;
}
