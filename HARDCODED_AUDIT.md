# Hardcoded UI Data Audit — hou.admin.cc frontend

Scope: only data that actually renders on screen — labels, numbers, lists, dropdown
options, table rows, chart values, fallback text — and is baked into the component
instead of coming from an API/config. Backend-only concerns (API endpoints, RBAC logic,
Redux defaults, dead/unreachable files) are intentionally left out of this version. No
code was changed; findings only.

---

## Centres

| File                                          | Line(s) | What's hardcoded on screen                                                                                                                                                                                               |
| --------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/pages/centres/constants.ts`              | 33-89   | `PLAN_CATALOGUE` — real pricing (`fortnightly: $59.95`, `annual: $2,493.92`, etc.) for 5 plans, shown directly in the Add/Edit Plans UI instead of coming from a pricing API. A price change needs a code deploy.        |
| `src/pages/centres/components/CentreCard.tsx` | 14-18   | `PLAN_META` only knows 3 of the 5 plans (`premium`, `standard`, `family` — missing `offpeak`, `nightowl`). A centre selling only Off Peak/Night Owl plans shows **"No active memberships"** on its card, which is wrong. |
| `src/pages/centres/plans/index.tsx`           | 9-15    | A second, separately hand-typed copy of plan name/color/access text — can drift from `PLAN_CATALOGUE` and show different labels/pricing than the card view.                                                              |

## Membership

| File                                             | Line(s)        | What's hardcoded on screen                                                                                                                                                                                    |
| ------------------------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/membership/constants.ts`              | 9-15           | `CURRENCIES` — FX rates (`AUD: 1.52`, `INR: 83.2`, …) frozen in source and shown as the live currency-conversion figures on the page. These drift daily in reality.                                           |
| `src/pages/membership/constants.ts`              | 27-32          | `DEFAULT_FACILITY_CODE = 'BLR01'` — shown as the default selected centre until a real facility picker exists (comment admits this is a stopgap).                                                              |
| `src/pages/membership/constants.ts`              | 18-23          | `PLAN_REGION_FILTERS` (USA/AUS/IND) — the region dropdown's options are a fixed list instead of pulling live regions from the centres API.                                                                    |
| `src/pages/membership/index.tsx`                 | 26-31          | `REGION_CURRENCY` — a second, separate region→currency map; must be kept in sync by hand with the list above or the wrong currency symbol shows for a region.                                                 |
| `src/pages/membership/index.tsx`                 | 601-636        | `BOOKING_ROWS` — an entire table of real operational policy (door-entry timing, QR scan rules, slot duration, max group size, advance booking window) rendered on screen with **no backing API call at all**. |
| `src/pages/membership/components/PlanDrawer.tsx` | 18-23, 279-281 | `ACCESS_LABELS` — off-peak/night-owl hour text hardcoded and repeated twice in the same file, and again conceptually inside `BOOKING_ROWS` above. Three places show the "same fact" and can disagree.         |
| `src/pages/membership/index.tsx`                 | 679-683        | Guest Charges tab always renders the static string **"No guest charge configuration available"** — a stub, not wired to any data source.                                                                      |

## Members

| File                          | Line(s) | What's hardcoded on screen                                                                                                                                                                                                            |
| ----------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/members/index.tsx` | 109     | Broken avatar images fall back to a **live external URL**, `https://via.placeholder.com/40`, instead of a local asset.                                                                                                                |
| `src/pages/members/index.tsx` | 438-486 | The plan/status filter `<option>` lists are hand-typed JSX instead of generated from the existing `planConfig`/`subscriptionStatusMap` objects (lines 49-64) — a plan or status added to the map won't appear in the filter dropdown. |

## Waitlist

| File                           | Line(s) | What's hardcoded on screen                                                                                                                                                                                                         |
| ------------------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/waitlist/index.tsx` | 16      | `AVATAR_COLORS` — a fixed hex palette for avatar-initial backgrounds; a _different_ palette is independently hardcoded for the same purpose in Tailgate (see below), so the same person can appear a different color on each page. |
| `src/pages/waitlist/index.tsx` | 47-54   | `PLAN_FILTERS` — its own independent plan-name list for the filter dropdown, inconsistent with the equivalent lists in Members and Tailgate (see "Plan list" cluster below).                                                       |

## Tickets

| File                             | Line(s) | What's hardcoded on screen                                                                                                                                                                            |
| -------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/tickets/constants.ts` | 22-33   | `EQUIPMENT_LIST` — one fixed global equipment catalogue (Bowling Machine, UPS, LED, …) shown in the ticket-creation form for **every** centre, even though equipment realistically varies per centre. |
| `src/pages/tickets/constants.ts` | 19-20   | `ALL_LANES = [1..7]` — every centre's lane picker shows exactly 7 lanes regardless of that centre's actual lane count.                                                                                |

## Tailgate

| File                                                                       | Line(s)                      | What's hardcoded on screen                                                                                                                                                           |
| -------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/pages/tailgate/utils.ts` / `index.tsx`                                | `utils.ts:3`, `index.tsx:23` | `FACILITY_TZ = 'America/Chicago'` — every timestamp and "today" stat shown on this page is computed in Chicago time, regardless of which country/timezone the centre is actually in. |
| `src/pages/tailgate/utils.ts`                                              | 5-14                         | A second, independently hardcoded avatar-color palette (different values than Waitlist's) for the same "colorize by name" UI treatment.                                              |
| `src/pages/tailgate/components/LogFilters.tsx`                             | 125-133                      | The "Lane Door" filter shows exactly **one** hardcoded option, `"Door Lane"` — reads like placeholder data rather than the facility's real list of doors.                            |
| `src/pages/tailgate/components/ReviewModal.tsx`                            | 20                           | `SUBSCRIPTIONS = ['Standard','Premium','Family','Offpeak']` — a third independent plan-name list shown in this modal's dropdown (missing "Night Owl", unlike Waitlist's version).    |
| `AllLogsTable.tsx:259`, `UnidentifiedTab.tsx:224`, `ViolationsTab.tsx:203` | —                            | The rows-per-page dropdown `[10, 20, 30, 50, 100]` is copy-pasted identically into all three tables.                                                                                 |
| `src/pages/tailgate/components/UnidentifiedTab.tsx`                        | 79                           | Table column headers typed inline (`['S.No','Time','Video','Event Type','Lane Door','Actions']`) instead of reusing the shared header list.                                          |

## Maintenance

| File                                 | Line(s) | What's hardcoded on screen                                                                                                                                                                                                                         |
| ------------------------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/maintenance/constants.ts` | 13      | `ALL_LANES = [1..7]` — same "every centre has exactly 7 lanes" assumption shown in the maintenance lane tabs/selects, independent of the actual per-centre lane count used elsewhere (e.g. the Facilities page reads real lane data from the API). |

## Slots

| File                                                                                                                | Line(s)                                | What's hardcoded on screen                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/slots/index.tsx` / `CalendarHeader.tsx`                                                                  | `index.tsx:13`, `CalendarHeader.tsx:5` | `TIMEZONE = 'America/Chicago'` — every slot time shown on the calendar is displayed in Chicago time regardless of the centre's real timezone.                                                      |
| `BlockTimeSlotModal.tsx:5-11`, `LaneDetailsModal.tsx:6-12`, `MultiBlockModal.tsx:5-11`, `SlotDetailsModal.tsx:7-13` | —                                      | The same `BLOCK_REASONS` dropdown list (`Scheduled Maintenance`, `Out of service`, `For Demo`, `Other`) is copy-pasted into all four modals.                                                       |
| `src/pages/slots/components/LaneDetailsModal.tsx`                                                                   | 27, 128-136                            | The "Block this lane on the app" checkbox is commented out of the UI and its value permanently hardcoded to `false` — staff cannot actually use this control even though it's modeled in the code. |

## Coach

| File                                                  | Line(s)                                           | What's hardcoded on screen                                                                                                                             |
| ----------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/pages/coach/index.tsx` / `CoachScheduleGrid.tsx` | `index.tsx:19`, `CoachScheduleGrid.tsx:90,95,168` | `'America/Chicago'` hardcoded 4 more times — every coach schedule time shown is in Chicago time regardless of the centre's real timezone.              |
| `src/pages/coach/components/CoachScheduleGrid.tsx`    | 53                                                | The grid always displays only the **first** coach (`coaches[0]`) — there's no coach-picker UI, so centres with multiple coaches never show the others. |

## Induction

| File                                                        | Line(s) | What's hardcoded on screen                                                                                                                                                                                                                     |
| ----------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/induction/components/InductionAccordionItem.tsx` | 117     | `if (stepIndex === 4 && isPrimary)` — the "must complete steps 1–4 first" lock shown in the UI is tied to a fixed step **position**, not a flag from the API; reordering steps on the backend would silently move this lock to the wrong step. |
| `src/pages/induction/index.tsx`                             | 152-166 | The plan-label text (`standard`→"Standard", etc.) shown in the table is duplicated twice within the same column definition.                                                                                                                    |

## Reports

| File                                       | Line(s)  | What's hardcoded on screen                                                                                                                                                                                                                    |
| ------------------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/reports/tabs/MembershipTab.tsx` | 9, 46-51 | `PLAN_COLORS` + a fixed list of 5 plan keys drive the "Per-Centre Plan Breakdown" chart's bars/colors — a plan added or renamed on the backend won't appear in the chart.                                                                     |
| `src/pages/reports/pdf/reportPdfData.ts`   | 64-71    | `FLAGS`/`COUNTRY_NAME` — a narrower, separately hardcoded country/flag list used only in the exported PDF (missing USA/UK/UAE/IND/NZ/ZA that the main app's flag list supports) — an unlisted country shows a plain white flag 🏳️ in the PDF. |

## Staff

| File                                                                | Line(s) | What's hardcoded on screen                                                                                                                                                                                                |
| ------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/staff/index.tsx`                                         | 63-84   | `MATRIX_FEATURES` + `matrixGrant()` — a fabricated permission matrix rendered as a faded preview table on the "Access Levels" tab (labeled as a teaser for a future real feature, but still visible to real users today). |
| `src/pages/staff/index.tsx` (86-92) / `ViewStaffMember.tsx` (17-23) | —       | `ROLE_LABEL` — the same role-name-to-label map duplicated in two files; a label change in one place is easy to miss in the other.                                                                                         |

## Shared components

| File                                 | Line(s)     | What's hardcoded on screen                                                                                                                                            |
| ------------------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/Layout.tsx`          | 134         | Profile dropdown shows the literal placeholder `admin@example.com` whenever the logged-in user's real email is missing/not yet loaded.                                |
| `src/components/Table/DataTable.tsx` | 50, 62, 303 | The rows-per-page control (used by every table in the app) offers a hardcoded `[10, 20, 30, 50, 100]` and defaults to `10` — set once here, not overridable per page. |

---

## Repeated-data clusters (same real-world fact, hardcoded independently more than once)

- **"List of membership plans"** — typed out separately in `members/index.tsx`
  (`planConfig`), `waitlist/index.tsx` (`PLAN_FILTERS`), and
  `tailgate/components/ReviewModal.tsx` (`SUBSCRIPTIONS`) — each with a _different_ set of
  plans, so filters/dropdowns don't agree with each other across pages.
- **"Avatar color palette"** — `waitlist/index.tsx` and `tailgate/utils.ts` each hardcode
  their own, different, set of colors for the same "color by initials" treatment.
- **"Facility timezone (`America/Chicago`)"** — shown in Slots, Coach, and Tailgate (9
  occurrences across those pages) — every displayed time assumes a single US timezone
  even though centres exist in multiple countries.
- **"Rows-per-page options `[10, 20, 30, 50, 100]`"** — copy-pasted into 3 Tailgate
  tables plus the shared `DataTable` component.

---

## What's _not_ in this version

Findings that are real but don't show up as data on screen — a hardcoded UAT API URL in
`members/api.ts`, a duplicated/diverged RBAC permission module, dead unused wizard
files, and internal Redux pagination defaults — were dropped from this pass since they're
backend/architecture concerns rather than hardcoded UI content. Ask if you want those
folded back in.
