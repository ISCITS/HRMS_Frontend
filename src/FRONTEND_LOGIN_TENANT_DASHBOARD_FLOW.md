# Frontend Login, Tenant Resolution, and Dashboard Module

## Folder Structure

```text
src
|-- app
|   |-- (auth)
|   |   |-- login/page.tsx
|   |   `-- t/[tenantUuid]/login/page.tsx
|   |-- api/auth
|   |   |-- AuthProxy.ts
|   |   |-- login/route.ts
|   |   |-- login/generic/route.ts
|   |   |-- tenant/[tenantUuid]/route.ts
|   |   |-- sso/redirect/[tenantUuid]/route.ts
|   |   |-- sso/callback/route.ts
|   |   |-- me/route.ts
|   |   |-- menu/route.ts
|   |   `-- logout/route.ts
|   |-- dashboard/page.tsx
|   |-- home/page.tsx
|   `-- sso/callback/page.tsx
|-- components
|   |-- auth/AuthLoginExperience.tsx
|   |-- dashboard/DashboardLanding.tsx
|   |-- layout/AppShell.tsx
|   `-- navigation/DynamicMenu.tsx
|-- i18n/messages/en.ts
|-- lib
|   |-- auth.ts
|   |-- BackendApi.ts
|   `-- RouteGuard.ts
|-- models/AuthModels.ts
`-- services/auth/AuthApiService.ts
```

## Overall Login Flow

### Tenant-based login

1. User opens `/t/{tenantUuid}/login`.
2. Frontend calls `GET /api/auth/tenant/{tenantUuid}`.
3. Tenant context is shown before sign-in starts.
4. Frontend submits credentials to `POST /api/auth/login`.
5. Next.js route handler proxies to backend and stores the access token in an HTTP-only cookie.
6. Frontend redirects to backend-provided `strHomeRoute`, defaulting to `/dashboard`.

### Generic login

1. User opens `/login`.
2. Frontend submits email and password to `POST /api/auth/login/generic`.
3. Next.js route handler stores the access token securely in cookie storage.
4. Frontend redirects to the backend-provided home route.

### SSO-ready flow

1. Tenant login page shows an SSO button when `blnSsoEnabled` is true.
2. Frontend calls `GET /api/auth/sso/redirect/{tenantUuid}`.
3. Browser is redirected to the identity provider.
4. Callback lands on `/sso/callback`.
5. Frontend calls `GET /api/auth/sso/callback` through the local proxy route.
6. Proxy stores the access token in an HTTP-only cookie and redirects into the app.

## Tenant Resolution

### How tenant is identified

- Tenant-aware login is route-based: `/t/{tenantUuid}/login`.
- Frontend resolves tenant before showing local or SSO actions.

### How Common DB is used

- Frontend never talks to Common DB directly.
- It uses frontend API routes that proxy backend tenant-resolution endpoints.

### How datastore switching works

- Frontend is datastore-agnostic.
- Backend resolves datastore and tenant mode.
- Frontend only reacts to the resulting tenant metadata and login options.

## Backend Architecture

### DAL design and reuse strategy

- Frontend assumes backend owns DAL complexity.
- `AuthProxy.ts` acts as the frontend BFF layer and isolates cookie/token handling from UI code.

### Service layer design

- `AuthApiService.ts` is the client-facing service.
- Route handlers under `src/app/api/auth/*` are the proxy boundary.
- UI components stay focused on state, validation, and rendering.

### JWT and security approach

- Access token is not stored in `localStorage` or plain client state.
- Next.js route handlers store it in an HTTP-only cookie.
- Middleware checks the auth cookie before protected routes render.

## Session Management

### Redis session usage

- Redis remains backend-managed.
- Frontend works through authenticated API calls only.

### DB session audit

- `tblusersession` remains backend-managed.
- Frontend logout calls `POST /api/auth/logout` so backend can revoke the audited session.

## Dynamic Menu

### How roles and permissions are used

- Frontend fetches `GET /api/auth/menu`.
- Menu content is fully backend-driven.
- UI does not hardcode role logic for navigation visibility.

### How menu is built and returned

- Backend sends module name, route, permission codes, and home flag.
- `DynamicMenu.tsx` renders the menu from that payload.
- `DashboardLanding.tsx` also uses the same response to surface module cards and landing actions.

## Database Changes

### New tables and columns

- No direct frontend database changes exist.
- Frontend assumes backend changes for:
  `tbltenant`
  `tbltenant_route`
  `tbltenant_datastore`
  `tbltenant_auth_mode`
  `tbltenant_identity_provider`
  `tbluser.sso_login_mapping`
  `tblusersession.login_method`
  `tblusersession.identity_provider_id`

### Stored procedures and functions

- Frontend does not depend on stored procedures.
- It depends only on the documented API contract.

## Flow Explanation

### Tenant sign-in sequence

1. Load tenant-aware page.
2. Resolve tenant.
3. Show local and optional SSO entry points.
4. Submit credentials.
5. Proxy route stores token cookie.
6. Protected shell fetches `/api/auth/me` and `/api/auth/menu`.
7. Dashboard renders based on current user and dynamic modules.

### Protected route sequence

1. Middleware checks for auth cookie.
2. `AppShell` loads current user and menu.
3. Header shows user and tenant context.
4. Side navigation renders dynamically from backend permissions.

### Logout sequence

1. User clicks logout in the shell header.
2. Frontend calls `POST /api/auth/logout`.
3. Proxy clears auth cookies.
4. Backend invalidates the runtime session.
5. Frontend redirects to `/login`.

## Why This Design

- HTTP-only cookies are safer than browser storage for bearer tokens.
- A local BFF proxy keeps backend URLs and auth headers out of page components.
- Dynamic menu rendering keeps authorization logic backend-owned and easier to evolve.
- Tenant-aware and generic login live in one visual system, which reduces onboarding friction for users and developers.
