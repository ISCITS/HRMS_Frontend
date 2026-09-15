"use client";

import ReimbursementClaimEditorPage from "@/features/reimbursements/components/ReimbursementClaimEditorPage";

export default function ReimbursementClaimDetailPage({ strClaimID, blnEditableRoute = false }: { strClaimID: string; blnEditableRoute?: boolean }) {
  return <ReimbursementClaimEditorPage strClaimID={strClaimID} strMode={blnEditableRoute ? "edit" : "detail"} />;
}
