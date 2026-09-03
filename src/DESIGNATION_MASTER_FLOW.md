# Designation Master

## Purpose

This frontend module introduces a designation master aligned to `tbldesignation` from:

- `DB_Script/HRMS_DB/tables/public.tbldesignation.sql`
- `DB_Script/HRMS_DB/tables/public.tbldesignationtext.sql`

## Fields Exposed In UI

- `designation_code`
- `designation_name`
- `is_active`

## Hidden/System Fields

- `id`
- `record_uuid`
- `tenant_id`
- `added_on`
- `added_by`
- `last_modified_on`
- `last_modified_by`

## Current Implementation Scope

- Frontend route: `/designations`
- Frontend component: modal-based add/edit master panel
- Frontend API placeholders added under `src/app/api/designations/*`
- Dashboard and user-management quick actions link directly to the designation master

## Current Limitation

The current repo still lacks backend CRUD endpoints for master modules such as designation. The added page follows the same existing placeholder/local-state pattern already used by other master modules in this frontend.
