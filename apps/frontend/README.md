# TicketDashboard Frontend (Vite + React)

SPA for project and ticket management with Kanban board, realtime updates, notifications, and temporary admin elevation UX.

## Quick Start

```powershell
npm ci

# Set backend URL for dev
$env:VITE_API_URL="http://localhost:3000"

npm run dev --workspace apps/frontend
```

Build & preview

```powershell
npm run build --workspace apps/frontend
npm run preview --workspace apps/frontend
```

Production env: set `VITE_API_URL=https://your-backend-domain`.

## Architecture

- State: Zustand stores in `src/store/*`
- API: thin services in `src/services/*` (typed, small wrappers)
- Realtime: Socket.IO client in `src/lib/realtime.ts` + hooks in `src/hooks/*`
- UI: Tailwind components and small design system under `src/components/ui`
- Routing: React Router (`src/routes`)

## Store Structure (Zustand)

- `auth.store.ts`
    - `isAuthenticated`, `user`, `accessToken`
    - Admin state: `isAdminElevated`, `adminToken`, `adminExpiresAt`
    - Actions: `setAuth`, `setAccessToken`, `setAdminElevation`, `clearAdminElevation`, `clearAuth`, etc.
- `project.store.ts`
    - `projects` with flags: `isSubscribed`, `hasMyTickets`, `subscriberCount`
    - `selectedProjectId`, `viewMode` = BOARD | CREATED | ASSIGNED
    - `loadProjects()`, `toggleSubscribe()` (handles blocked unsubscribe when user has tickets in project)
- `notification.store.ts` (used by notifications UI)

## Services and HTTP Endpoints

- `services/http.ts`: `HttpClient` with `credentials: 'include'` and JSON helpers; base URL from `VITE_API_URL`
- `services/auth.api.ts`: `/api/auth/*` endpoints for OTP, refresh, profile, devices, admin elevation
- `services/project.api.ts`: `/api/projects/*`
- `services/ticket.api.ts`: `/api/projects/:id/tickets`, `/api/tickets/*`
- `services/comment.api.ts`: `/api/tickets/:id/comments`
- `services/notification.api.ts`: `/api/notifications*`
- `services/user.api.ts`: `/api/users` (admin only, uses `x-admin-token`)

All requests include cookies; access token is passed in `Authorization: Bearer <token>`.

## Realtime

- Socket connection: `connectRealtime(API_CONFIG.BASE_URL)` sends `auth: { token: accessToken }` and uses WebSocket transport
- Rooms: server auto-joins `user:{id}` and current project rooms; client can `subscribeProject(projectId)` / `unsubscribeProject(projectId)`

Listeners (hooks)

- `useProjectRealtime(projectId, { onTicketCreated, onTicketUpdated, onTicketStatus })`
- `useProjectsRealtime()` → project create/update, membership count updates
- `useAssignmentToasts()` → toasts for assignment changes
- `useStatusToasts(projectId)` → toasts for status changes
- `useCreatedToasts(projectId)` / `useUpdatedToasts(projectId)`
- `useNotificationsRealtime(onNew)` → live notifications
- `useAdminRealtime()` → clears admin state on `admin:revoked`

## Components Overview

- Layout: `AppHeader`, `AppSidebar`, `ErrorBoundary`
- Kanban: `kanban-board`, `kanban-column`, `sortable-card` with dnd-kit
    - Columns: PROPOSED, TODO, INPROGRESS, DONE, DEPLOYED (fixed order)
    - Drag-drop → optimistic local move → PATCH `/tickets/:id/status`
    - Special rules: moving out of PROPOSED auto-assigns to mover; moving to PROPOSED unassigns
- Tickets: `ticket-dialog`, `ticket-cards-view` (for CREATED/ASSIGNED filters)
- Admin: small components under `components/admin` to elevate/revoke and list users
- Async buttons: optimistic UI with toasts; disabled states via local `pending` ids

## Routing and Deep Links

- Routes under `src/routes/`: `LoginPage`, `DashboardPage`
- Static hosting must serve `index.html` for all paths (SPA rewrite). On Render, add a rewrite rule `/*` → `/index.html`.

## Auth Flow

1. Enter email → `POST /api/auth/login` → OTP sent
2. Submit OTP → `POST /api/auth/verify-otp` → sets `refreshToken` cookie, returns `{ accessToken, user }`
3. App stores access token in store; all API calls include it
4. On token near expiry or 401, call `POST /api/auth/refresh` (cookies included) → new access token
5. Logout clears cookie server-side and client store

Admin Elevation

- Send SHA-256 hex of admin password to `POST /api/auth/admin-elevation`, store `adminToken`, start countdown to `adminExpiresAt`
- Include `x-admin-token: <adminToken>` for admin-only APIs
- Server sends `admin:revoked` when expired or revoked → UI clears state

## Environment

`VITE_API_URL` → backend origin (no trailing slash). Example: `http://localhost:3000` or `https://ticketdash.onrender.com`.

## Styling & UX

- Tailwind CSS (v4) + small UI kit components; dark mode built-in
- Sonner toasts for feedback on realtime events and mutations

## Deployment Notes

- Build: `npm run build -w apps/frontend`
- Ensure SPA rewrite so `/login` and deep links work
- Set `VITE_API_URL` to the backend public URL
