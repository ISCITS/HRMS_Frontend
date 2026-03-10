import DepartmentMasterInlinePanel from "@/components/departments/DepartmentMasterInlinePanel";

// Hosts inline-edit department master module under dashboard routes.
export default function DepartmentsInlinePage() {
  // Functional responsibility:
  // - Render the inline department master panel with row-level add/edit behavior.
  // Inputs:
  // - No direct page inputs; panel handles form/grid state.
  // Output:
  // - Inline department management screen under /departments-inline.
  // Failure behavior:
  // - Validation and save failure behavior is handled inside panel component.
  return <DepartmentMasterInlinePanel />;
}
