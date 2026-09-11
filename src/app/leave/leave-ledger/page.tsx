import EssLeaveLedgerPanel from "@/features/leave/components/EssLeaveLedgerPanel";

// HR Leave Ledger: same panel as ESS, in HR mode (all employees selectable, empty until one is chosen).
export default function HrLeaveLedgerPage() {
  return <EssLeaveLedgerPanel blnHrMode />;
}
