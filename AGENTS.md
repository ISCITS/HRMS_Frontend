# HRMS Frontend — Codex Agent Rules

## Project
Next.js 16 (App Router) HRMS frontend. TypeScript 5, React 19, Material-UI v5, react-hook-form + Yup, Axios. Multi-tenant with cookie-based session and CSRF-protected encrypted API calls.

## Useful commands
```bash
# Start dev server
npm run dev

# Production build
npm run build

# Lint
npm run lint

# Type check
npx tsc --noEmit
```

## Architecture — enforce strictly
```
app/                     # Next.js pages/routes (thin — compose only)
features/<feature>/      # Feature modules (co-located)
  ├─ components/         # UI components for this feature
  ├─ hooks/              # Custom React hooks
  ├─ services/           # API call wrappers (callAPI only)
  └─ types/              # TypeScript types
components/              # Shared/cross-feature components
lib/                     # Pure utilities, axiosInstance, auth helpers
config/                  # App config, env, routes, API constants
models/                  # Shared TypeScript type definitions
```

| Layer | Responsibility | Must NOT |
|-------|----------------|----------|
| Pages (`app/`) | Compose feature components | Contain logic, state, or API calls |
| Feature components | Render UI, consume hooks | Call services or axios directly |
| Hooks | Fetch via services, manage loading/error state | Call axios directly, contain UI |
| Services | Wrap `callAPI()` | Contain state, hooks, or UI |
| `lib/` | Pure utilities | Contain React hooks or components |

## Naming conventions (Hungarian notation — mandatory on every identifier)
| Prefix | Type | Example |
|--------|------|---------|
| `str` | string | `strEmployeeCode`, `strEmail`, `strPathname` |
| `int` | number / integer | `intEmployeeID`, `intDepartmentID` |
| `flt` | float | `fltBaseSalary` |
| `bln` | boolean | `blnIsActive`, `blnIsWorker` |
| `lst` | array / list | `lstRoles`, `lstActions`, `lstChildren` |
| `dic` | object / dict | `dicAllowedActions`, `dicConstant` |
| `obj` | complex object | `objUser`, `objPayload`, `objError` |
| `fn` | function / callback | `fnOnConfirm`, `fnAction`, `fnOnSuccess` |
| `dt` | date | `dtDateOfBirth`, `dtDateOfJoining` |

Apply to ALL variables, parameters, state variables, and props — no exceptions.

## File naming
- Components: PascalCase `.tsx` → `EmployeeMasterListPanel.tsx`
- Hooks: camelCase, `use` prefix `.ts` → `useActionRights.ts`
- Services: camelCase, `Service` suffix `.ts` → `employeeService.ts`
- Types: PascalCase `.ts` → `EmployeeTypes.ts`
- Pages: Next.js convention → `app/employees/page.tsx`

## Code patterns

### Service
```typescript
import { callAPI } from "@/lib/apiClient";
import { ApiRequestMethod } from "@/Common/enums/AppEnums";
import { apiConstants } from "@/config";

const employeeService = {
  getEmployee: async (intEmployeeID: number) => {
    return callAPI<EmployeeDetail>({
      strEndpoint: apiConstants.EMPLOYEE_DETAIL,
      strMethod: ApiRequestMethod.GET,
      objParams: { intEmployeeID },
    });
  },
};
export default employeeService;
```

### Hook
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
  // render only
}
```

### Form (react-hook-form + Yup)
```typescript
const objSchema = yup.object({ strName: yup.string().required() });
const { register, handleSubmit, formState: { errors } } = useForm({ resolver: yupResolver(objSchema) });
```

## API response envelope
All API calls return `ApiEnvelope<T>`:
```typescript
{ ResultCode: ApiResultCode; Msg: string; Data: T; RequestId: string; }
```
Always check `ResultCode` before using `Data`.

## State management
- No Redux, no Zustand — React hooks only.
- Cross-component communication: custom DOM events with `hrms:` prefix.
- Auth state from cookies via `lib/auth.ts` — never from local state.

## Checklist for a new feature
1. `features/<feature>/types/` — TypeScript types
2. `features/<feature>/services/<feature>Service.ts` — API via `callAPI()`
3. `features/<feature>/hooks/use<Feature>.ts` — data hook
4. `features/<feature>/components/<Feature>Panel.tsx` — UI
5. `app/<route>/page.tsx` — Next.js page
6. `config/constants.ts` — new API endpoint constant if needed

## Rules
- Never use `any` — use proper TypeScript types or `unknown`.
- Never call `axios` directly — always use `callAPI()` from `lib/apiClient.ts`.
- Never store secrets in source — `.env.local` only.
- Use MUI components, not raw HTML where a MUI equivalent exists.
- Use `react-hook-form` + Yup for all forms.
- Gate UI actions behind `useActionRights` hook (RBAC).
- No `console.log` in committed code.
- Path alias `@/` → `src/` — always use it, never `../../` relative traversals.
- Comments only for non-obvious WHY, never for what the code does.
