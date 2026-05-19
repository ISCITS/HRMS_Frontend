"use client";

import ReimbursementClaimEditorPage from "@/features/reimbursements/components/ReimbursementClaimEditorPage";

export default function ReimbursementClaimDetailPage({ intClaimID, blnEditableRoute = false }: { intClaimID: number; blnEditableRoute?: boolean }) {
  return <ReimbursementClaimEditorPage intClaimID={intClaimID} strMode={blnEditableRoute ? "edit" : "detail"} />;
}
