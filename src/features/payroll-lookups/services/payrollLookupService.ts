import { authHelpers } from "@/lib/auth";
import { masterApiService, type PayrollLookupOptionApiRecord } from "@/services/master/MasterApiService";

export type PayrollLookupOption = {
  intID: number;
  strValueCode: string;
  strDisplayName: string;
  strDescription: string | null;
  intDisplayOrder: number;
  blnIsActive: boolean;
};

function mapLookupOption(dicOption: PayrollLookupOptionApiRecord): PayrollLookupOption {
  return {
    intID: dicOption.intID,
    strValueCode: dicOption.strValueCode,
    strDisplayName: dicOption.strDisplayName,
    strDescription: dicOption.strDescription ?? null,
    intDisplayOrder: Number(dicOption.intDisplayOrder ?? 0),
    blnIsActive: Boolean(dicOption.blnIsActive ?? true),
  };
}

export const payrollLookupService = {
  async getDomainOptions(
    strDomainCode: string,
    intLanguageID?: number | null,
    strLanguageCode?: string | null,
  ): Promise<PayrollLookupOption[]> {
    const objResult = await masterApiService.getPayrollLookupOptions(
      strDomainCode,
      intLanguageID ?? authHelpers.getLanguageID(),
      strLanguageCode,
    );
    return objResult.Data.map(mapLookupOption);
  },
};
