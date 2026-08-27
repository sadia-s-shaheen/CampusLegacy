# Revised Campus Legacy components

## Before you drop these in

1. **Install `sonner`** (toast library) and add `<Toaster />` once in your
   root layout — every revised file that used to call `alert()` now calls
   `toast.success(...)` / `toast.error(...)` instead.

   ```bash
   npm install sonner
   ```

   ```tsx
   // app/layout.tsx
   import { Toaster } from "sonner"
   // ...
   <Toaster position="top-center" richColors />
   ```

2. **New/expected Supabase schema** — some fixes assume columns or tables
   that may not exist yet in your database. Nothing breaks if they're
   missing (failures are caught and toasted), but the feature won't work
   until added:

   | Feature | Needs |
   |---|---|
   | Faculty/Admin signup verification | a `role_requests` table (`person_id`, `requested_role`, `status`) — or swap for your own approval mechanism |
   | GitHub import / report upload | `projects.source_type`, `projects.repo_url`, `projects.report_url` columns |
   | Report upload | a public Supabase Storage bucket named `project-reports` |
   | Discover "Connect" action | a `connections` table with `follower_id`, `following_id`, `status` (this already existed per `profile-view.tsx`, just wasn't used from Discover) |
   | Inbox unread state | `messages`/`conversations` don't currently track read state — the inbox always shows the latest message, but there's no unread badge. Add a `read_at` or `is_read` column if you want that. |

3. **Row Level Security** — none of this client-side code enforces access
   control by itself. Please confirm RLS policies exist on `people`,
   `projects`, `messages`, `conversations`, `team_members`, `connections`,
   `notifications`, and `role_requests` before shipping. This is especially
   important now that the admin-role bug is fixed client-side — the real
   guarantee has to live in RLS/policies, not in what button someone taps.

## What actually changed, file by file

- **campus-legacy-login.tsx** — Sign In and Sign Up are now separate
  explicit flows (no more guessing intent from a Supabase error string).
  Faculty/Admin can no longer self-grant elevated `role` on signup — they
  sign up as `student` and a verification request is logged. Added a
  Forgot Password step.
- **chat-view.tsx** — `isSent` now compares against the real current user
  (fetched once via `useCurrentUser`) instead of inferring it from
  `contactId`. Realtime no longer double-adds your own optimistically-sent
  message.
- **inbox-view.tsx** *(new)* — conversation list that was previously
  missing; links into the existing `ChatView`.
- **create-project-modal.tsx** — GitHub import, report upload, and legacy
  project claim are implemented instead of "coming soon" placeholders.
- **dashboard-view.tsx** — uses shared hooks, parallelizes independent
  queries, fixes the pending-requests double count, wires the bell icon to
  `/requests` with an unread dot.
- **discover-view.tsx** — search bar is wired up (client-side filter);
  added an explicit Connect action separate from the chat button.
- **edit-profile-modal.tsx** — toast instead of `alert`; calls an `onSaved`
  callback instead of `window.location.reload()`; also fixed a pre-existing
  bug where it read `currentProfile.skill_ids` (never passed) instead of
  the `currentSkills` prop it was actually given.
- **explore-campus.tsx** — node layout is now deterministic
  (`generateCirclePositions`), not `Math.random()`-based.
- **onboarding-view.tsx** — toast instead of `alert`.
- **profile-view.tsx** — uses shared hooks; edit modal save now refetches
  instead of reloading the page.
- **projects-view.tsx** — uses the shared `useUserProjects` hook (removes
  duplicated fetch/dedupe logic); Filter button now opens a working status
  filter.
- **requests-view.tsx** — notifications now update live via a Realtime
  subscription instead of only loading once; toast instead of `alert`.
- **user-profile-view.tsx** — uses shared hooks; adds a Connect button
  distinct from the chat button, with pending/accepted state.
- **bottom-nav.tsx** — active tab now also matches nested detail routes
  (e.g. `/projects/123` lights up "Projects").
- **theme-provider.tsx** — unchanged.

## Still worth doing (not in this pass)

- Pagination for chat history and project lists (everything is still a
  flat `.limit()`).
- Consistent `dark:` classes across all views (only profile/edit-profile
  had them before; others weren't touched here to keep this pass focused
  on logic bugs rather than a full visual dark-mode pass).
- Generate real Supabase TypeScript types to replace `any` throughout.
