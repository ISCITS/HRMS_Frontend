export const enMessages = {
  auth: {
    genericTitle: "Sign in to your workforce command center",
    genericSubtitle: "Use your work email for shared-database local login.",
    tenantTitle: "Tenant workspace sign in",
    tenantSubtitle: "Your tenant is pre-resolved so we can route you to the right HRMS environment.",
    loginIdLabel: "Work email or login ID",
    tenantLabel: "Tenant UUID",
    passwordLabel: "Password",
    emailLabel: "Work email",
    invalidTenant: "We couldn't find a tenant for this UUID.",
    inactiveTenant: "This tenant is currently inactive. Please contact your administrator.",
    lockedUser: "Your account is locked. Please contact your administrator.",
    genericLoginNotAllowed: "Generic login is not enabled for this tenant setup.",
    ssoButton: "Continue with SSO",
    localButton: "Sign in securely",
    genericButton: "Continue to workspace",
    backToGeneric: "Use generic sign in",
    backToTenant: "Use tenant sign in",
    ssoCallbackTitle: "Completing your secure sign-in",
    ssoCallbackSubtitle: "We're validating your identity and preparing your workspace."
  },
  shell: {
    workspace: "Workspace",
    searchPlaceholder: "Search people, payroll, or actions",
    signOut: "Sign out",
    quickActions: "Quick actions",
    welcome: "Welcome back",
    menuTitle: "Navigation"
  },
  dashboard: {
    title: "People operations at a glance",
    subtitle: "Your landing view adapts to role permissions and tenant context in real time.",
    menuEmpty: "No modules are currently assigned to this user.",
    homeCardTitle: "Default landing route",
    homeCardSubtitle: "Backend-driven redirect logic keeps the first meaningful action in reach."
  }
} as const;
