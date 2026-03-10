# HRMS Template (Next.js + MUI)

A complete Human Resource Management System UI template built with:
- Next.js (App Router)
- TypeScript
- Material UI v5+

## Features
- Authentication pages: Login, Signup, Forgot Password
- Dashboard layout with AppBar + responsive Drawer
- Employee Management: list, details, add, edit
- Department Master: add/edit department records with validation
- Department Master (Inline): add/edit department directly inside table rows
- Leave Management: list, apply, approve (UI skeleton)
- Attendance tracker UI
- Payroll module: overview, run payroll, and payslips
- Profile page
- Settings page
- Light/Dark theme toggle
- API route skeletons under `app/api/*`

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Structure

- `app/` App Router pages, layouts, and API routes
- `components/` reusable UI + module-specific components
- `lib/theme.ts` MUI theme configuration

## Notes
- This is a frontend template with API route placeholders.
- Replace mock data with real backend integration.
