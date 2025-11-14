# @repo/shared

Shared types, schemas, and small utilities used across the Ticket Dashboard monorepo.

## What’s included

- Auth modules (barrel exported from `src/index.ts`):
    - `auth/constants` — OTP, session, and API config (used by both apps)
    - `auth/schemas` — Zod schemas for login, OTP verification, logout, etc.
    - `auth/types` — Public API types and JWT payload types used by apps
    - `auth/timing` — Response timing types and helpers (e.g., `createOtpTiming`)
    - `errors` — Shared error/success codes and ApiErrorResponse shape
- Utilities:
    - `generateId()` — simple unique ID helper
    - `formatDate(date)` — basic date formatting helper
    - `title` — project title string

## Install and import

Add the dependency in any app within the monorepo (already wired via workspaces):

```json
{
	"dependencies": {
		"@repo/shared": "*"
	}
}
```

Import what you need from the package root (barrel exports):

```ts
import {
	// constants
	OTP_CONFIG,
	USER_AUTH_CONFIG,
	SESSION_CONFIG,
	API_CONFIG,
	// schemas
	LoginSchema,
	VerifyOtpSchema,
	// types
	type ApiUser,
	type AccessTokenPayload,
	// timing
	createOtpTiming,
	// errors
	ERROR_CODES,
} from "@repo/shared";

import { generateId, formatDate, title } from "@repo/shared";
```

## Examples

Validate login input:

```ts
const parsed = LoginSchema.parse({ email: "user@example.com" });
```

Use shared constants in backend config:

```ts
import { OTP_CONFIG, SESSION_CONFIG } from "@repo/shared";

const OTP_LENGTH = Number(OTP_CONFIG.LENGTH);
const ACCESS_TOKEN_EXPIRY_MINUTES = Number(
	SESSION_CONFIG.ACCESS_TOKEN_EXPIRY_MINUTES
);
```

Compute OTP timing response:

```ts
const timing = createOtpTiming(new Date(Date.now() + 5 * 60_000), new Date());
```

## Development

- Build: `npm run build`
- Watch: `npm run dev`
- Type check: `npm run check-types`
- Clean: `npm run clean`

Notes:

- Only the modules re-exported from `src/index.ts` are part of the public API.
- Avoid adding unused exports—keep this package minimal and focused on what the apps actually use.
