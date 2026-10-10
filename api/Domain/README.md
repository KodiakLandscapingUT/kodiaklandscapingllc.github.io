# Controller domain layer

Controllers own HTTP routes, model binding/validation, authentication policies,
status codes, and response headers. They delegate use cases to scoped domain
classes named `<Resource>Domain<HttpVerb>`. Domain classes do not use
`HttpContext`, MVC results, or claims.

## Role groups

| Folder | Domains | Access |
| --- | --- | --- |
| `Public` | `ApplicationDomainPost`, `HealthDomainGet` | Public application submission and health |
| `Admin` | `ApplicationDomainGet`, `ApplicationDomainPost`, `StaffDomainPost` | Application review/reveal; member or manager invitations |
| `Manager` | `StaffDomainGet`, `StaffDomainPost`, `TaskDomainGet`, `TaskDomainPost`, `TaskDomainPatch`, `TaskDomainDelete` | Staff directory and task management; managers invite members only |
| `Member` | `TaskDomainGet`, `TaskDomainPatch` | Assigned-task listing and status-only updates |
| `Staff` | `StaffDomainGet` | Own profile for any authenticated staff role |
| `Staff` | `TimeCardDomainGet`, `TimeCardDomainPost` | Own payroll profile/history and weekly submission |
| `Admin` | `TimeCardDomainGet`, `TimeCardDomainPatch` | All timecards, employee ID/rate administration, and approval/rejection |
| `Shared` | Mapping and persistence helpers | No controller entry points |

Admins inherit manager-level task/directory access. Those identical operations
share the `Manager` domains instead of duplicating rules in `Admin`. Invitations
are separate because admin and manager permissions differ.

## Rules for additions

- Add a focused class for the role and verb; register it in `AddDomains`.
- Keep role checks in the domain as well as the controller policy. Never rely on
  choosing the right controller alone for authorization.
- Pass the authenticated staff read DTO from the controller, never an actor or
  role submitted in a request body.
- Keep member updates separate from management updates to prevent title,
  reassignment, description, or due-date changes by members.
- Reuse shared projection/persistence helpers without moving role decisions into
  the helpers.
- Firebase token verification/bootstrap stays in `Authentication`; encryption
  stays in `Services`. Neither is an HTTP-specific domain.
- Preserve existing routes, read/write DTOs, collection names, encryption
  envelopes, and auditing order.

## Timecard behavior

- Workweeks start Monday and end Sunday. A shift may be overnight, but it cannot
  extend past next Monday 00:00; split such work into two weeks.
- Unpaid breaks use whole minutes. The first 2,400 net minutes are regular;
  remaining minutes are overtime. A single shift can be split between both.
- Rates and estimated pay are stored in integer cents, hours in integer minutes.
  Gross estimates use a 1.5x overtime multiplier and round only final pay to cents.
  This is not a payroll/tax calculation or a claim about legal overtime rules.
- Input times are local worksite clock times without timezone/DST conversion.
- Profiles use Firebase UID for ownership and a unique admin-assigned employee
  number. Submitted reports snapshot identity/rate and are immutable.
- Duplicate submissions, unique employee-number changes, and review transitions
  are protected by Firestore transactions, not check-then-write operations.
- A rejected report remains locked; this version has no correction/resubmission
  workflow. Reviewer notes explain rejection.
- The client refreshes on focus and every 30 seconds; failed submissions retain
  entered shifts. Sign-out clears employee-scoped state.
- Firestore client rules must deny direct client reads/writes to payroll
  collections; access these documents through the authorized API.
