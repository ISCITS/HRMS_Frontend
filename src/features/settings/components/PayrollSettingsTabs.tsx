"use client";

import { Paper, Tab, Tabs } from "@mui/material";

/** The Payroll settings, each in its own tab (one opens at a time). */
export const LST_PAYROLL_SETTINGS_TABS = [
  { strCode: "payslip-format", strLabel: "Payslip Format" },
  { strCode: "fnf-format", strLabel: "F&F Report Format" },
  { strCode: "ctc-format", strLabel: "CTC Format" },
  { strCode: "arrears", strLabel: "Arrears" },
  { strCode: "fnf-rules", strLabel: "F&F Rules" },
] as const;

export type PayrollSettingsTabCode = (typeof LST_PAYROLL_SETTINGS_TABS)[number]["strCode"];

type Props = {
  strActive: PayrollSettingsTabCode;
  onChange: (strTab: PayrollSettingsTabCode) => void;
};

export default function PayrollSettingsTabs({ strActive, onChange }: Props) {
  const intActive = Math.max(0, LST_PAYROLL_SETTINGS_TABS.findIndex((objTab) => objTab.strCode === strActive));
  return (
    <Paper sx={{ borderRadius: "8px !important", boxShadow: "none", border: "1px solid #dfe9f5" }}>
      <Tabs
        value={intActive}
        onChange={(_objEvent, intIndex: number) => onChange(LST_PAYROLL_SETTINGS_TABS[intIndex].strCode)}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="Payroll settings"
        sx={{ minHeight: 44, px: 1 }}
      >
        {LST_PAYROLL_SETTINGS_TABS.map((objTab) => (
          <Tab
            key={objTab.strCode}
            label={objTab.strLabel}
            id={`settings-payroll-tab-${objTab.strCode}`}
            aria-controls={`settings-payroll-panel-${objTab.strCode}`}
            data-control-id={`settings.payroll.tabs.${objTab.strCode}.tab`}
            sx={{ minHeight: 44, textTransform: "none", fontWeight: 600 }}
          />
        ))}
      </Tabs>
    </Paper>
  );
}
