"use client";

import { Paper, Tab, Tabs } from "@mui/material";
import { useRouter } from "next/navigation";

const lstTabs = [
  { strCode: "settlements", strLabel: "Settlements", strRoute: "/payroll/fnf-settlements" },
  { strCode: "register", strLabel: "F&F Register", strRoute: "/payroll/fnf-settlements/register" },
  { strCode: "payslips", strLabel: "F&F Payslips", strRoute: "/payroll/fnf-settlements/payslips" },
  { strCode: "report", strLabel: "F&F Report", strRoute: "/payroll/fnf-settlements/report" },
] as const;

export type FNFModuleTabCode = (typeof lstTabs)[number]["strCode"];

/** Tabs shared by the Full & Final screens (each tab is its own route, so links and refresh work). */
export default function FNFModuleTabs({ strActive }: { strActive: FNFModuleTabCode }) {
  const objRouter = useRouter();
  const intActive = Math.max(0, lstTabs.findIndex((objTab) => objTab.strCode === strActive));
  return (
    <Paper sx={{ borderRadius: "10px !important", boxShadow: "none", border: "1px solid #e2e8f0", mb: 1.5 }}>
      <Tabs value={intActive} onChange={(_, intIndex: number) => objRouter.push(lstTabs[intIndex].strRoute)} variant="scrollable" aria-label="Full and Final Settlement screens" sx={{ minHeight: 44, px: 1 }}>
        {lstTabs.map((objTab) => (
          <Tab key={objTab.strCode} label={objTab.strLabel} data-control-id={`payroll.fnf.tabs.${objTab.strCode}.tab`} sx={{ minHeight: 44, textTransform: "none", fontWeight: 600 }} />
        ))}
      </Tabs>
    </Paper>
  );
}
