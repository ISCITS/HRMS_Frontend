export type ReimbursementClaimStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "released"
  | "resubmitted"
  | "approved"
  | "partially_approved"
  | "rejected"
  | "locked"
  | "pushed_to_payroll"
  | "paid";

export type ReimbursementItemStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "partially_approved"
  | "rejected"
  | "proof_pending"
  | "released"
  | "locked"
  | "pushed_to_payroll"
  | "paid";

export type ReimbursementProofStatus = "pending" | "verified" | "rejected";
export type ReimbursementTaxTreatment = "taxable" | "exempt" | "proof_based";

export type ReimbursementCategoryOption = {
  intID: number;
  strCategoryCode: string;
  strCategoryName: string;
  intSalaryComponentID?: number | null;
  strTaxTreatment: ReimbursementTaxTreatment;
  blnProofRequired: boolean;
  decMaxClaimAmount?: number | null;
  decMaxItemAmount?: number | null;
};

export type ReimbursementSalaryComponentOption = {
  intID: number;
  strComponentCode: string;
  strComponentName: string;
  strTaxTreatment?: ReimbursementTaxTreatment | null;
  blnDeclarationRequired?: boolean | null;
  blnProofRequired?: boolean | null;
};

export type ReimbursementOptionsDto = {
  lstCategories: ReimbursementCategoryOption[];
  lstSalaryComponents: ReimbursementSalaryComponentOption[];
};

export type ReimbursementProofDto = {
  intID: number;
  strDocumentType: string;
  strFileName?: string | null;
  strFileMimeType?: string | null;
  intFileSizeBytes?: number | null;
  strVerificationStatus: ReimbursementProofStatus;
  strVerificationRemarks?: string | null;
};

export type ReimbursementProofPreviewDto = {
  intProofID: number;
  strFileName: string;
  strMimeType: string;
  strBase64Content: string;
  intFileSizeBytes: number;
};

export type ReimbursementClaimItemDto = {
  intID: number;
  intReimbursementCategoryID?: number | null;
  intSalaryComponentID?: number | null;
  strReimbursementTypeName?: string | null;
  dtExpenseDate?: string | null;
  strExpenseDescription?: string | null;
  decClaimedAmount: number;
  decApprovedAmount: number;
  decRejectedAmount: number;
  decTaxableAmount: number;
  decExemptAmount: number;
  strTaxTreatment: ReimbursementTaxTreatment;
  blnProofRequired: boolean;
  strItemStatus: ReimbursementItemStatus;
  strEmployeeRemarks?: string | null;
  strReviewerRemarks?: string | null;
  lstProofs: ReimbursementProofDto[];
};

export type ReimbursementClaimDto = {
  intID: number;
  intEmployeeID?: number | null;
  strEmployeeCode?: string | null;
  strEmployeeName?: string | null;
  strCompanyName?: string | null;
  strDepartmentName?: string | null;
  strLocationName?: string | null;
  strClaimNumber?: string | null;
  strClaimCode?: string | null;
  strClaimTitle?: string | null;
  strClaimStatus: ReimbursementClaimStatus;
  strFinancialYearCode?: string | null;
  intPayrollRunID?: number | null;
  dtClaimDate?: string | null;
  decClaimedAmount: number;
  decApprovedAmount: number;
  decRejectedAmount: number;
  decTaxableAmount: number;
  decExemptAmount: number;
  strEmployeeRemarks?: string | null;
  strReviewerRemarks?: string | null;
  dtSubmittedOn?: string | null;
  lstItems?: ReimbursementClaimItemDto[];
};

export type ReimbursementClaimRequest = {
  strClaimTitle?: string | null;
  strFinancialYearCode?: string | null;
  intPayrollRunID?: number | null;
  dtClaimDate?: string | null;
  strEmployeeRemarks?: string | null;
};

export type ReimbursementClaimItemRequest = {
  intSalaryComponentID?: number | null;
  dtExpenseDate?: string | null;
  strExpenseDescription?: string | null;
  decClaimedAmount: number;
  strTaxTreatment: ReimbursementTaxTreatment;
  blnProofRequired: boolean;
  strEmployeeRemarks?: string | null;
};
