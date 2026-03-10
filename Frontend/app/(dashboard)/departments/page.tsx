import DepartmentMasterPanel from "@/components/departments/DepartmentMasterPanel";

// Hosts the department master management module inside dashboard routes.
export default function DepartmentsPage() {
  // Functional responsibility:
  // - Render the department master panel for add/edit/list operations.
  // Inputs:
  // - No direct page inputs; panel manages local state.
  // Output:
  // - Department master screen under /departments.
  // Failure behavior:
  // - Delegates validation and failure handling to DepartmentMasterPanel.
  return <DepartmentMasterPanel />;
}
