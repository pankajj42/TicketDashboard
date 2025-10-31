# @repo/shared

Internal shared package for the Ticket Dashboard project.

## Overview

This package contains shared types, utilities, and functions that can be used across all apps in the monorepo.

## Usage

Install the package in any app within the monorepo:

```json
{
	"dependencies": {
		"@repo/shared": "*"
	}
}
```

Then import what you need:

```typescript
import { generateId, formatDate } from "@repo/shared";

// Generate a unique ID
const id = generateId();

// Format a date
const formatted = formatDate(new Date());
```

## Development

### Building the package

```bash
npm run build
```

### Development mode (watch)

```bash
npm run dev
```

### Type checking

```bash
npm run check-types
```

### Clean build artifacts

```bash
npm run clean
```

## What's included

- **Types**: Common interfaces like `User`, `Project`, `TicketCard`
- **Utilities**: Helper functions like `generateId`, `formatDate`
- **Constants**: Shared constants and configurations

## Adding new exports

1. Add your code to `src/index.ts`
2. Export it from the main export
3. Build the package: `npm run build`
4. The changes will be available to all apps immediately in development mode

## Just-in-Time compilation

This package uses tsup for just-in-time compilation, meaning:

- Changes are automatically rebuilt when files change
- No need to manually rebuild during development
- Hot reloading works across the monorepo
