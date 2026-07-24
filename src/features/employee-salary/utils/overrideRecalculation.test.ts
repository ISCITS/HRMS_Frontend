import type { EmployeeSalaryOverrideFormValue } from "@/features/employee-salary/types";
import {
  syncCalculatedOverrideRowsFromPreview,
  usesAutoCalculatedOverrideValue,
} from "@/features/employee-salary/utils/overrideRecalculation";
import type { EmployeeSalaryStructureComponentOption } from "@/features/employee-salary/types";

function assertEqual(objActual: unknown, objExpected: unknown, strMessage: string) {
  if (objActual !== objExpected) {
    throw new Error(`${strMessage}: expected '${String(objExpected)}' but received '${String(objActual)}'.`);
  }
}

function createOverride(dicPartial: Partial<EmployeeSalaryOverrideFormValue>): EmployeeSalaryOverrideFormValue {
  return {
    intSalaryComponentID: 0,
    strComponentName: "Component",
    blnAllowManualOverride: true,
    strValueSource: "fixed",
    strFormulaExpression: "",
    strBasisComponentName: "",
    strPayslipSectionSnapshotCode: null,
    strLwpTreatmentSnapshotCode: null,
    strLwpReducedAmountHandlingSnapshotCode: null,
    decAmountMonthly: "",
    decAmountAnnual: "",
    decPercentageValue: "",
    strDefaultMonthly: "",
    strDefaultAnnual: "",
    strDefaultPercentage: "",
    strRemarks: "",
    ...dicPartial,
  };
}

function createStructureComponent(dicPartial: Partial<EmployeeSalaryStructureComponentOption>): EmployeeSalaryStructureComponentOption {
  return {
    intSalaryComponentID: 0,
    strComponentCode: null,
    strComponentName: null,
    strComponentCategory: null,
    strValueSource: "fixed",
    blnAllowManualOverride: true,
    intLineOrder: 0,
    ...dicPartial,
  };
}

export function testUsesAutoCalculatedOverrideValueRecognizesPercentAndFormulaRows() {
  assertEqual(usesAutoCalculatedOverrideValue("percentage"), true, "Percentage rows should be treated as calculated");
  assertEqual(usesAutoCalculatedOverrideValue("formula"), true, "Formula rows should be treated as calculated");
  assertEqual(usesAutoCalculatedOverrideValue("fixed"), false, "Fixed rows should not be treated as calculated");
}

export function testSyncCalculatedOverrideRowsFromPreviewUpdatesPercentRowsAfterFixedChange() {
  const lstOverrides = [
    createOverride({
      intSalaryComponentID: 1,
      strComponentName: "Basic",
      strValueSource: "fixed",
      decAmountAnnual: "600000",
      decAmountMonthly: "50000",
      strDefaultAnnual: "600000",
      strDefaultMonthly: "50000",
    }),
    createOverride({
      intSalaryComponentID: 2,
      strComponentName: "HRA",
      strValueSource: "percentage",
      decAmountAnnual: "240000",
      decAmountMonthly: "20000",
      strDefaultAnnual: "240000",
      strDefaultMonthly: "20000",
      strDefaultPercentage: "40",
    }),
  ];

  const lstUpdated = syncCalculatedOverrideRowsFromPreview(lstOverrides, [
    { intSalaryComponentID: 2, decAmountAnnual: 300000, decAmountMonthly: 25000, decPercentageValue: 50 },
  ]);

  assertEqual(lstUpdated[1].decAmountAnnual, "300000", "Percent row revised annual should refresh from preview");
  assertEqual(lstUpdated[1].strDefaultMonthly, "25000", "Percent row default monthly should refresh from preview");
  assertEqual(lstUpdated[1].strDefaultPercentage, "50", "Percent row percentage should stay aligned with preview");
}

export function testSyncCalculatedOverrideRowsFromPreviewUpdatesFormulaRowsAfterFixedChange() {
  const lstOverrides = [
    createOverride({
      intSalaryComponentID: 1,
      strComponentName: "Basic",
      strValueSource: "fixed",
      decAmountAnnual: "720000",
      decAmountMonthly: "60000",
      strDefaultAnnual: "720000",
      strDefaultMonthly: "60000",
    }),
    createOverride({
      intSalaryComponentID: 3,
      strComponentName: "Special Allowance",
      strValueSource: "formula",
      decAmountAnnual: "120000",
      decAmountMonthly: "10000",
      strDefaultAnnual: "120000",
      strDefaultMonthly: "10000",
    }),
  ];

  const lstUpdated = syncCalculatedOverrideRowsFromPreview(lstOverrides, [
    { intSalaryComponentID: 3, decAmountAnnual: 180000, decAmountMonthly: 15000 },
  ]);

  assertEqual(lstUpdated[1].decAmountAnnual, "180000", "Formula row revised annual should refresh from preview");
  assertEqual(lstUpdated[1].strDefaultMonthly, "15000", "Formula row default monthly should refresh from preview");
}

export function testSyncCalculatedOverrideRowsFromPreviewDoesNotUpdateUnrelatedOrFixedRows() {
  const dicFixedOverride = createOverride({
    intSalaryComponentID: 1,
    strComponentName: "Basic",
    strValueSource: "fixed",
    decAmountAnnual: "840000",
    decAmountMonthly: "70000",
    strDefaultAnnual: "840000",
    strDefaultMonthly: "70000",
  });
  const dicPercentOverride = createOverride({
    intSalaryComponentID: 2,
    strComponentName: "HRA",
    strValueSource: "percentage",
    decAmountAnnual: "336000",
    decAmountMonthly: "28000",
    strDefaultAnnual: "336000",
    strDefaultMonthly: "28000",
    strDefaultPercentage: "40",
  });
  const dicUnrelatedFormulaOverride = createOverride({
    intSalaryComponentID: 3,
    strComponentName: "Bonus",
    strValueSource: "formula",
    decAmountAnnual: "50000",
    decAmountMonthly: "4166.67",
    strDefaultAnnual: "50000",
    strDefaultMonthly: "4166.67",
  });

  const lstUpdated = syncCalculatedOverrideRowsFromPreview(
    [dicFixedOverride, dicPercentOverride, dicUnrelatedFormulaOverride],
    [{ intSalaryComponentID: 2, decAmountAnnual: 360000, decAmountMonthly: 30000, decPercentageValue: 42.86 }]
  );

  assertEqual(lstUpdated[0].decAmountAnnual, "840000", "Fixed row should not be overwritten by calculated refresh");
  assertEqual(lstUpdated[1].decAmountAnnual, "360000", "Matching calculated row should update");
  assertEqual(lstUpdated[2].decAmountAnnual, "50000", "Unrelated calculated row should remain unchanged");
  assertEqual(lstUpdated[2].strDefaultMonthly, "4166.67", "Unrelated row default monthly should remain unchanged");
}

export function testSyncCalculatedOverrideRowsFromPreviewRecalculatesBasicToHraToEpfDependencyChain() {
  const lstOverrides = [
    createOverride({
      intSalaryComponentID: 1,
      strComponentName: "Basic Salary",
      strValueSource: "fixed",
      decAmountAnnual: "380000",
      decAmountMonthly: "31666.67",
      strDefaultAnnual: "480000",
      strDefaultMonthly: "40000",
    }),
    createOverride({
      intSalaryComponentID: 2,
      strComponentName: "House Rent Allowance",
      strValueSource: "Percentage",
      strBasisComponentName: "Basic Salary",
      decPercentageValue: "50",
      decAmountAnnual: "240000",
      decAmountMonthly: "20000",
      strDefaultAnnual: "240000",
      strDefaultMonthly: "20000",
      strDefaultPercentage: "50",
    }),
    createOverride({
      intSalaryComponentID: 3,
      strComponentName: "Employer Provident Fund",
      strValueSource: "Formula",
      strFormulaExpression: "(BASIC + HRA) * 0.1",
      decAmountAnnual: "72000",
      decAmountMonthly: "6000",
      strDefaultAnnual: "72000",
      strDefaultMonthly: "6000",
    }),
  ];

  const lstStructureComponents = [
    createStructureComponent({
      intSalaryComponentID: 1,
      strComponentCode: "BASIC",
      strComponentName: "Basic Salary",
      strValueSource: "Fixed",
    }),
    createStructureComponent({
      intSalaryComponentID: 2,
      strComponentCode: "HRA",
      strComponentName: "House Rent Allowance",
      strValueSource: "Percentage",
      intBasisComponentID: 1,
      decPercentageValue: 50,
    }),
    createStructureComponent({
      intSalaryComponentID: 3,
      strComponentCode: "EPF",
      strComponentName: "Employer Provident Fund",
      strValueSource: "Formula",
      strFormulaExpression: "(BASIC + HRA) * 0.1",
    }),
  ];

  const lstUpdated = syncCalculatedOverrideRowsFromPreview(lstOverrides, [], lstStructureComponents);

  assertEqual(lstUpdated[1].decAmountAnnual, "190000", "HRA revised annual should recalculate from Basic Salary");
  assertEqual(lstUpdated[1].decAmountMonthly, "15833.33", "HRA revised monthly should recalculate from Basic Salary");
  assertEqual(lstUpdated[1].strDefaultMonthly, "15833.33", "HRA default monthly should reflect recalculated amount");
  assertEqual(lstUpdated[2].decAmountAnnual, "57000", "EPF revised annual should recalculate from Basic and HRA");
  assertEqual(lstUpdated[2].decAmountMonthly, "4750", "EPF revised monthly should recalculate from formula result");
  assertEqual(lstUpdated[2].strDefaultMonthly, "4750", "EPF default monthly should reflect recalculated formula result");
}

export function testSyncCalculatedOverrideRowsFromPreviewDoesNotReuseStaleCalculatedAmountsWhenBaseAnnualChanges() {
  const lstOverrides = [
    createOverride({
      intSalaryComponentID: 1,
      strComponentName: "Basic Salary",
      strValueSource: "Fixed",
      decAmountAnnual: "380000",
      decAmountMonthly: "31666.67",
      strDefaultAnnual: "480000",
      strDefaultMonthly: "40000",
    }),
    createOverride({
      intSalaryComponentID: 2,
      strComponentName: "House Rent Allowance",
      strValueSource: "Percentage",
      strBasisComponentName: "Basic Salary",
      decPercentageValue: "50",
      decAmountAnnual: "240000",
      decAmountMonthly: "20000",
      strDefaultAnnual: "240000",
      strDefaultMonthly: "20000",
      strDefaultPercentage: "50",
    }),
  ];

  const lstStructureComponents = [
    createStructureComponent({
      intSalaryComponentID: 1,
      strComponentCode: "BASIC",
      strComponentName: "Basic Salary",
      strValueSource: "Fixed",
    }),
    createStructureComponent({
      intSalaryComponentID: 2,
      strComponentCode: "HRA",
      strComponentName: "House Rent Allowance",
      strValueSource: "Percentage",
      intBasisComponentID: 1,
      decPercentageValue: 50,
    }),
  ];

  const lstUpdated = syncCalculatedOverrideRowsFromPreview(lstOverrides, [], lstStructureComponents);

  assertEqual(lstUpdated[1].decAmountAnnual, "190000", "Calculated percentage row should recompute from the edited annual base");
  assertEqual(lstUpdated[1].decAmountMonthly, "15833.33", "Calculated percentage row monthly value should recompute from the edited annual base");
}
