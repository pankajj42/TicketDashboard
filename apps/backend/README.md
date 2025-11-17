# TicketDashboard Backend API

Production-grade Express + TypeScript API for projects, tickets, comments, notifications, realtime updates, and passwordless auth with multi-device sessions and temporary admin elevation.

## Quick Start

```powershell
# Install deps at repo root
npm ci

# Generate Prisma client
npx prisma generate --schema=apps/backend/prisma/schema.prisma

# Apply migrations (local dev)
npx prisma migrate dev --schema=apps/backend/prisma/schema.prisma

# Start the API (dev)
npm run dev --workspace apps/backend
```

Environment (example):

```env
PORT=3000
NODE_ENV=development

DATABASE_URL=postgresql://user:password@localhost:5432/ticketdash
REDIS_URL=redis://localhost:6379

JWT_SECRET=dev_access_secret
JWT_REFRESH_SECRET=dev_refresh_secret
ADMIN_JWT_SECRET=dev_admin_secret
ADMIN_PASSWORD=admin123

SEND_OUT_MAILS=false
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=***
FROM_EMAIL="TicketDash <noreply@yourdomain.com>"

ALLOWED_ORIGINS=http://localhost:5173
COOKIE_SAME_SITE=none
COOKIE_SECURE=false
```

Note: In production set `COOKIE_SECURE=true`, keep `SAME_SITE=none`, and configure `ALLOWED_ORIGINS` to your frontend origin(s) without quotes or trailing slashes.

## System Design

- Access JWT (short-lived) + Refresh JWT (long-lived cookie) pattern
- Sessions persisted in Postgres (`RefreshToken`) with device metadata; access JWT validated and tied to an active session
- Redis for rate limits, presence, admin allowlist, and admin expiry tracking; enables horizontal scaling and Socket.IO cluster adapter
- Queueing via BullMQ for OTP and notification emails with separate priorities and retries
- Realtime via Socket.IO rooms:
    - `user:{userId}` for per-user events (notifications, admin revoke)
    - `project:{projectId}` for ticket events within a project

## Security & CORS

- Helmet enabled; CSP disabled in dev
- CORS configured with dynamic origin check against `ALLOWED_ORIGINS` (supports comma/whitespace separated list, strips quotes/trailing slashes)
- Credentials enabled; cookies set with `SameSite=None` and `Secure` in production
- `trust proxy` enabled for secure cookies behind proxies

## Auth, Tokens, Sessions

- OTP login via email. On verify:
    - Access token (exp: `SESSION_CONFIG.ACCESS_TOKEN_EXPIRY_MINUTES`)
    - Refresh token (exp: `SESSION_CONFIG.REFRESH_TOKEN_EXPIRY_DAYS`) is stored as HttpOnly cookie and persisted in `refresh_tokens` table
- Multiple concurrent sessions allowed (bounded by shared config); each device/session gets a distinct `sessionId`
- Refresh flow reads cookie, validates JWT and DB row, rotates access token
- Logout supports current device or all devices
- Cleanup service runs hourly to purge expired refresh tokens

Admin Elevation

- POST `/api/auth/admin-elevation` accepts a SHA-256 hex of the admin password
- On elevation: single-session lock (all other sessions revoked), Redis allowlist `admin:jti:{jti}` set with TTL, DB pointers stored on `User`
- Admin token is short-lived; use in `X-Admin-Token` header for admin-only routes
- Revocation via DELETE `/api/auth/admin-elevation` or automatic expiry; app emits `admin:revoked` realtime event to the user

## Redis Keys

- Rate limits: `rl:{prefix}:{id}`
- Presence: `presence:users` (set of userIds), `presence:user:{id}:count`
- Admin: `user:{userId}:admin_elevation` (JSON), `admin:jti:{jti}`
- Admin expirations: sorted set `admin:expirations` with member `${userId}:${sessionId}`

## Email & Queues

- BullMQ queues
    - `otp` (priority 1, concurrency 5)
    - `notification` (priority 2, concurrency 10)
- SMTP transporter (SendGrid compatible). If `SEND_OUT_MAILS=false` or missing credentials, emails are logged to console via stream transport
- If 587 times out on your host, use port 2525; for SSL on connect use 465 with `secure=true`

## HTTP API

All endpoints are under `/api`.

Auth (`/api/auth`)

- `POST /login` → send OTP
- `POST /verify-otp` → verify, set cookie, return `{ user, accessToken }`
- `POST /refresh` → new `{ accessToken }` (reads cookie)
- `POST /logout` → `{ logoutAll?: boolean }`
- `GET /me` → `{ user, session: { sessionId, expiresAt, isAdmin?, adminExpiresAt? } }`
- `GET /devices` → list devices
- `DELETE /devices/:sessionId` → logout a device
- `POST /admin-elevation` → `{ adminToken, expiresAt }`
- `DELETE /admin-elevation` → revoke

Projects (`/api/projects`)

- `GET /` → list projects (if authenticated user provided, includes flags `isSubscribed`, `hasMyTickets`, `subscriberCount`)
- `POST /` (admin) → create project
- `GET /:id` → get project
- `GET /:id/subscribers` (admin) → list subscribers
- `PATCH /:id` (admin) → update name/description
- `POST /:id/subscribe` → subscribe current user; server also joins Socket.IO room
- `DELETE /:id/subscribe` → unsubscribe (blocked if user has created or assigned tickets in this project)

Tickets

- `POST /projects/:projectId/tickets` → create ticket with audit; auto-subscribe creator; realtime `ticket:created`
- `GET /projects/:projectId/tickets` → list tickets for a project
- `GET /tickets/created` → tickets created by current user
- `GET /tickets/assigned` → tickets assigned to current user
- `GET /tickets/:ticketId` → detailed ticket
- `PATCH /tickets/:ticketId` → update title/description; realtime `ticket:updated`
- `PATCH /tickets/:ticketId/status` → change status; handles auto-assign/unassign; realtime `ticket:status` (+ `ticket:assignment` if assignee changed)
- `PATCH /tickets/:ticketId/assignee` (admin) → change assignee; unassign forces status to PROPOSED with events
- `PATCH /tickets/:ticketId/assignee-status` (admin) → combined change

Comments

- `POST /tickets/:ticketId/comments` (rate limited) → add comment
- `GET /tickets/:ticketId/comments?limit=&cursor=` → paginated list

Notifications

- `GET /notifications?unreadOnly=true|false`
- `POST /notifications/mark-all-read`

Users (admin)

- `GET /users` → list active users (requires admin elevation)

## Realtime Events (Socket.IO)

Auth: bearer access token in `auth: { token }` during connection. Rooms joined: `user:{userId}` and subscribed `project:{projectId}`.

Emitted by server

- `ticket:created` → `{ ticketId, ticketTitle, actorId, actorName }`
- `ticket:updated` → `{ ticketId, ticketTitle, description, actorId, actorName }`
- `ticket:status` → `{ ticketId, status, fromStatus, toStatus, actorId, actorName, ticketTitle }`
- `ticket:assignment` → `{ ticketId, assignedToId, assignedToName, actorId, actorName, ticketTitle }`
- `project:created` → `{ project, actorId, actorName, subscriberCount }`
- `project:updated` → `{ project, actorId, actorName }`
- `project:member:subscribed` / `project:member:unsubscribed` → `{ projectId, userId, subscriberCount }`
- `project:subscribed` / `project:unsubscribed` → per-user confirmation events
- `notification:new` → `{ id, message, createdAt, read }`
- `admin:revoked` → `{ sessionId }`

Client events

- `subscribe` → `projectId` (joins room)
- `unsubscribe` → `projectId` (leaves room)

## Database Models (Prisma)

See `apps/backend/prisma/schema.prisma` for details. Key enums and relations:

- `TicketStatus`: PROPOSED, TODO, INPROGRESS, DONE, DEPLOYED
- `UpdateType`: CREATED, UPDATED, STATUS_CHANGED, ASSIGNMENT_CHANGED, COMMENT
- Relations: users ↔ projects (subscribers), tickets ↔ updates/comments, updates ↔ notifications

![alt text](ERD.svg)

## Running & Scripts

```powershell
npm run dev --workspace apps/backend     # dev server
npm run build --workspace apps/backend   # build
npm run start --workspace apps/backend   # start dist
npx prisma migrate dev --schema=apps/backend/prisma/schema.prisma
npx prisma studio --schema=apps/backend/prisma/schema.prisma
```

## Deployment Notes

- CORS: `ALLOWED_ORIGINS=https://your-frontend,http://localhost:5173` (no quotes, no trailing slash)
- Cookies: `COOKIE_SAME_SITE=none`, `COOKIE_SECURE=true`, `trust proxy = 1`
- SMTP connectivity: prefer port 2525 if 587 is blocked by the host; consider `requireTLS` and timeouts

## Troubleshooting

- CORS preflight blocked: origin mismatch; check logs printed on boot for `Configured ALLOWED_ORIGINS`
- Refresh failing: ensure cookies are set with `SameSite=None; Secure` and the frontend uses `credentials: 'include'`
- Emails timing out: switch to port 2525 on SendGrid; verify egress rules; confirm sender identity
