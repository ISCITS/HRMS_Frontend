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
export type ReimbursementType = "ctc_based" | "non_ctc_based" | "none";
export type ReimbursementSettlementMode = "payroll" | "finance" | "none";

export type ReimbursementSalaryComponentOption = {
  intID: number;
  strComponentCode: string;
  strComponentName: string;
  strTaxTreatment?: ReimbursementTaxTreatment | null;
  blnDeclarationRequired?: boolean | null;
  blnProofRequired?: boolean | null;
  strReimbursementType?: ReimbursementType | null;
  strSettlementMode?: ReimbursementSettlementMode | null;
  intPayslipSectionID?: number | null;
  strPayslipSection?: string | null;
  intLwpTreatmentID?: number | null;
  strLwpTreatment?: string | null;
  strLwpTreatmentCode?: string | null;
  intLwpReducedAmountHandlingID?: number | null;
  strLwpReducedAmountHandling?: string | null;
  strLwpReducedAmountHandlingCode?: string | null;
  decAnnualLimit?: number | null;
  decMonthlyLimit?: number | null;
  decAllocatedLimit?: number | null;
  decAlreadyClaimed?: number | null;
  decBalanceAvailable?: number | null;
};

export type ReimbursementOptionsDto = {
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

export type ReimbursementClaimItemDto = {
  intID: number;
  intSalaryComponentID?: number | null;
  strReimbursementTypeName?: string | null;
  strReimbursementType?: ReimbursementType | null;
  strSettlementMode?: ReimbursementSettlementMode | null;
  intPayslipSectionID?: number | null;
  strPayslipSection?: string | null;
  intLwpTreatmentID?: number | null;
  strLwpTreatment?: string | null;
  strLwpTreatmentCode?: string | null;
  intLwpReducedAmountHandlingID?: number | null;
  strLwpReducedAmountHandling?: string | null;
  strLwpReducedAmountHandlingCode?: string | null;
  decAnnualLimit?: number | null;
  decMonthlyLimit?: number | null;
  decAllocatedLimit?: number | null;
  decAlreadyClaimed?: number | null;
  decBalanceAvailable?: number | null;
  decEligibleBalance?: number | null;
  strProofStatus?: string | null;
  strPayrollImpact?: string | null;
  strFinanceStatus?: string | null;
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
  strRecordUUID: string;
  intEmployeeID?: number | null;
  strEmployeeCode?: string | null;
  strEmployeeName?: string | null;
  strCompanyName?: string | null;
  strDepartmentName?: string | null;
  strLocationName?: string | null;
  strClaimNumber?: string | null;
  strClaimCode?: string | null;
  strClaimTitle?: string | null;
  reimbursement_claim_name?: string | null;
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
  strReimbursementType?: ReimbursementType | null;
  strSettlementMode?: ReimbursementSettlementMode | null;
  strFinanceStatus?: string | null;
  strPayrollImpact?: string | null;
  strFinanceSettlement?: string | null;
};

export type ReimbursementClaimRequest = {
  intEmployeeID?: number | null;
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
