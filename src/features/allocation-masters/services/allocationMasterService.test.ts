import { describe, expect, it } from "vitest";

import { checkLogoFile, LOGO_MAX_BYTES } from "@/features/allocation-masters/services/allocationMasterService";

describe("checkLogoFile", () => {
  it.each(["image/png", "image/jpeg", "image/jpg", "image/webp", "IMAGE/PNG"])("accepts %s", (strType) => {
    expect(checkLogoFile({ type: strType, size: 2048 })).toBeNull();
  });

  it("refuses other types, empty files and files over 512 KB", () => {
    expect(checkLogoFile({ type: "image/gif", size: 2048 })).toContain("PNG, JPG or WEBP");
    expect(checkLogoFile({ type: "application/pdf", size: 2048 })).toContain("PNG, JPG or WEBP");
    expect(checkLogoFile({ type: "image/png", size: 0 })).toContain("empty");
    expect(checkLogoFile({ type: "image/png", size: LOGO_MAX_BYTES })).toBeNull();
    expect(checkLogoFile({ type: "image/png", size: LOGO_MAX_BYTES + 1 })).toContain("512 KB");
  });
});
