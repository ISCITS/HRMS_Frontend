import { NextRequest, NextResponse } from "next/server";

import { callBackendApi } from "@/lib/BackendApi";
import type { ModuleLabelsResponse } from "@/features/labels/types";

export async function GET(objRequest: NextRequest) {
  const objSearchParams = objRequest.nextUrl.searchParams;
  const strLanguageID = objSearchParams.get("language_id");
  const strModuleName = objSearchParams.get("module_name");

  if (!strLanguageID || !strModuleName) {
    return NextResponse.json(
      { message: "language_id and module_name are required." },
      { status: 400 }
    );
  }

  try {
    const objLabels = await callBackendApi<ModuleLabelsResponse>(
      `/api/v1/labels?language_id=${encodeURIComponent(strLanguageID)}&module_name=${encodeURIComponent(strModuleName)}`,
      {
        method: "GET",
        cache: "no-store"
      }
    );

    return NextResponse.json(objLabels, { status: 200 });
  } catch (objError) {
    return NextResponse.json(
      {
        message: objError instanceof Error ? objError.message : "Unable to load labels."
      },
      { status: 502 }
    );
  }
}
