# @repo/shared

Shared contract between frontend and backend: constants, schemas, types, and error codes. Minimizes drift and encodes business rules in one place.

## Exports

From `src/index.ts` (barrel):

- Auth
    - `auth/constants`: `OTP_CONFIG`, `USER_AUTH_CONFIG`, `SESSION_CONFIG`, `API_CONFIG`
    - `auth/schemas`: Zod schemas for auth/profile/admin elevation
    - `auth/types`: typed request/response models and JWT payload shapes
    - `auth/timing`: helpers for response timing payloads
- Tickets
    - `tickets/schemas`: `TicketStatusEnum` and input schemas for projects/tickets/comments
- Errors
    - `errors`: `ERROR_CODES`, `SUCCESS_CODES`, `ApiErrorResponse`
- Utilities
    - `formatDate`, `generateId`, `title`

## Key Constants (source of truth)

- `OTP_CONFIG`
    - `LENGTH=6`, `EXPIRY_MINUTES=5`, `RESEND_COOLDOWN_SECONDS=60`, `MAX_VERIFY_ATTEMPTS=5`
- `USER_AUTH_CONFIG`
    - `MAX_LOGIN_ATTEMPTS=5`, `RATE_LIMIT_SECONDS=60`, `LOCKOUT_DURATION_MINUTES=15`
- `SESSION_CONFIG`
    - `ACCESS_TOKEN_EXPIRY_MINUTES=15`, `REFRESH_TOKEN_EXPIRY_DAYS=7`, `TOKEN_REFRESH_THRESHOLD_MINUTES=5`, `MAX_CONCURRENT_SESSIONS=10`, `ADMIN_PRIVILEGE_EXPIRY_MINUTES=15`
- `API_CONFIG`
    - `TIMEOUT_MS=30000`, `MAX_RETRY_ATTEMPTS=3`, `RETRY_DELAY_MS=1000`

## Error & Success Codes

- Errors include validation, auth, token, OTP, rate limit, and admin-elevation codes. See `src/errors.ts`.
- Success codes include login/logout, OTP sent/verified, admin elevation granted/revoked.

## Schemas

- Auth: `LoginSchema`, `VerifyOtpSchema`, `LogoutSchema`, `LogoutDeviceSchema`, `UpdateProfileSchema`, `AdminElevationRequestSchema`
- Tickets/Projects: `CreateProjectSchema`, `CreateTicketSchema`, `UpdateTicketDetailsSchema`, `ChangeTicketStatusSchema`, `CreateCommentSchema`, `TicketStatusEnum`

## Usage Examples

```ts
import {
	LoginSchema,
	OTP_CONFIG,
	SESSION_CONFIG,
	ERROR_CODES,
} from "@repo/shared";

const { email } = LoginSchema.parse({ email: "user@example.com" });
const exp = SESSION_CONFIG.ACCESS_TOKEN_EXPIRY_MINUTES;
```

## Rationale

- Eliminates duplicated constants (e.g., token/OTP timings) and codes
- Gives frontend exact request/response types and valid enums
- Keeps Zod schemas aligned across both sides

## Development

```powershell
npm run build --workspace packages/shared
npm run dev --workspace packages/shared
npm run check-types --workspace packages/shared
```
