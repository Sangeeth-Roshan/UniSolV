# Authentication & Role-Based Dashboards

- [x] Backend: JWT auth
  - [x] Integrate `PyJWT` and `bcrypt` directly
  - [x] Create `POST /api/auth/login` endpoint
  - [x] Protect API routes via `get_current_user` dependencies and role-based checks
- [x] Frontend: Role-based protection & Dashboards
  - [x] Create Next.js `middleware.ts` for route protection via JWT decoding
  - [x] Create Server Actions to handle setting/clearing secure HttpOnly `token` cookies
  - [x] Build `app/login/page.tsx`
  - [x] Dashboard: `app/dashboard/institution/page.tsx`
  - [x] Dashboard: `app/dashboard/government/page.tsx`
  - [x] Dashboard: `app/my-tickets/page.tsx`
  - [x] Embed `ticket_events` timeline to visualize ticket history on dashboards
