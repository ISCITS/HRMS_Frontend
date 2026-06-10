# HRMS Frontend — Claude Code Rules

## Project Overview
Next.js 16 (App Router) HRMS frontend. TypeScript 5, React 19, Material-UI v5, react-hook-form + Yup, Axios. Multi-tenant with cookie-based session and CSRF-protected encrypted API calls.

## Architecture — Strict Layer Order
```
app/ (Next.js pages/routes)
  └─ features/<feature>/
       ├─ components/   — UI components for this feature
       ├─ hooks/        — custom React hooks (data fetching, state)
       ├─ services/     — API call wrappers
       └─ types/        — TypeScript types for this feature
  └─ components/        — shared/cross-feature components
  └─ lib/               — utilities, axios instance, auth helpers
  └─ config/            — app config, env, routes, constants
  └─ models/            — shared TypeScript type definitions
```

- **Pages (`app/`)**: Thin — just compose feature components. No business logic.
- **Feature components**: UI only. Consume hooks for data and actions.
- **Hooks**: Fetch data via services, manage loading/error state. No direct axios calls.
- **Services**: Wrap `callAPI()` calls. No UI, no hooks, no state.
- **`lib/`**: Pure utilities — no React, no hooks.

Never call axios directly from a component or page. Always go through a service → hook chain.

## Naming Conventions (Hungarian Notation — Mandatory)
| Prefix | Type | Example |
|--------|------|---------|
| `str` | string | `strEmployeeCode`, `strPathname`, `strEmail` |
| `int` | number / integer | `intEmployeeID`, `intDepartmentID` |
| `flt` | float | `fltBaseSalary` |
| `bln` | boolean | `blnIsActive`, `blnIsWorker` |
| `lst` | array / list | `lstRoles`, `lstActions`, `lstChildren` |
| `dic` | object / dictionary | `dicAllowedActions`, `dicConstant` |
| `obj` | complex object / instance | `objUser`, `objPayload`, `objError` |
| `fn` | function / callback | `fnOnConfirm`, `fnAction`, `fnOnSuccess` |
| `dt` | date | `dtDateOfBirth`, `dtDateOfJoining` |

Apply to ALL variables, parameters, state variables, and props — no exceptions.

## File Naming
| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase `.tsx` | `EmployeeMasterListPanel.tsx` |
| Hooks | camelCase, `use` prefix `.ts` | `useActionRights.ts` |
| Services | camelCase, `Service` suffix `.ts` | `employeeService.ts` |
| Types/Models | PascalCase `.ts` | `AuthModels.ts`, `EmployeeTypes.ts` |
| Pages | Next.js convention (`page.tsx`, `layout.tsx`) | `app/employees/page.tsx` |
| Utilities | camelCase `.ts` | `normalizeLabelModuleName.ts` |

## Code Patterns

### API call (service layer)
```typescript
import { callAPI } from "@/lib/apiClient";
import { ApiRequestMethod } from "@/Common/enums/AppEnums";

const employeeService = {
  getEmployee: async (intEmployeeID: number) => {
    return callAPI<EmployeeDetail>({
      strEndpoint: apiConstants.EMPLOYEE_DETAIL,
      strMethod: ApiRequestMethod.GET,
      objParams: { intEmployeeID },
    });
  },
};
```

### Custom hook (data fetching)
```typescript
export function useEmployee(intEmployeeID: number) {
  const [objEmployee, setObjEmployee] = useState<EmployeeDetail | null>(null);
  const [blnLoading, setBlnLoading] = useState(false);

  useEffect(() => {
    setBlnLoading(true);
    employeeService.getEmployee(intEmployeeID)
      .then(setObjEmployee)
      .finally(() => setBlnLoading(false));
  }, [intEmployeeID]);

  return { objEmployee, blnLoading };
}
```

### Component
```typescript
export default function EmployeeDetailPanel({ intEmployeeID }: { intEmployeeID: number }) {
  const { objEmployee, blnLoading } = useEmployee(intEmployeeID);
  // render only — no direct API calls
}
```

### Form (react-hook-form + Yup)
```typescript
const objSchema = yup.object({ strName: yup.string().required() });
const { register, handleSubmit } = useForm({ resolver: yupResolver(objSchema) });
```

## API Response Envelope
All API responses return `ApiEnvelope<T>`:
```typescript
interface ApiEnvelope<T> {
  ResultCode: ApiResultCode;
  Msg: string;
  Data: T;
  RequestId: string;
}
```
Always check `ResultCode` before using `Data`.

## State Management
- **No Redux, no Zustand.** Use React hooks only (`useState`, `useCallback`, `useMemo`, `useEffect`).
- Feature-local state stays inside feature hooks/components.
- Cross-feature communication: custom DOM events (`hrms:*` prefix).
- Auth state: read from cookies (`hrms_access_token`, `hrms_tenant_uuid`, `hrms_user_context`) via `lib/auth.ts`.

## Checklist for a New Feature
1. `features/<feature>/types/` — TypeScript types
2. `features/<feature>/services/<feature>Service.ts` — API calls via `callAPI()`
3. `features/<feature>/hooks/use<Feature>.ts` — data fetching hook
4. `features/<feature>/components/<Feature>Panel.tsx` — UI component(s)
5. `app/<route>/page.tsx` — Next.js page composing the components
6. `config/constants.ts` — add API endpoint constant if new

## Rules
- Never use `any` — use proper TypeScript types or `unknown`.
- Never call `axios` directly — use `callAPI()` from `lib/apiClient.ts`.
- Never store secrets in source — use `.env.local` variables only.
- Use MUI components, not raw HTML where an MUI equivalent exists.
- Use `react-hook-form` + `Yup` for all forms.
- Use `useActionRights` hook to gate UI actions behind role-based permissions.
- No `console.log` in committed code.
- Comments only for non-obvious WHY, never for what the code does.
- Path alias `@/` maps to `src/` — always use it, never relative `../../` traversals.
- Add proper comments in code while working on anything new or modifying any existing code.
