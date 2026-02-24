# Easy Access QR

Easy Access QR is a multi-tenant QR code creation and analytics app.

## What it does

- Create dynamic QR codes scoped to an organization (optionally team-scoped)
- Enable/disable codes without deleting historical scan data
- Record scan events and track aggregate analytics (daily volume, top codes)
- Manage users, teams, profile, billing, and API keys from the app shell

## Tech stack

- TanStack Start + TanStack Router
- tRPC
- Drizzle ORM + Postgres
- Better Auth
- Tailwind CSS

## Core domain models

- `qr_code`
  - `organizationId`, `createdByUserId`, optional `teamId`
  - `name`, `slug`, `destinationUrl`, `isActive`, `tags`
  - `scanCount`, `lastScannedAt`, timestamps
- `qr_scan_event`
  - `qrCodeId`, `organizationId`, `scannedAt`
  - optional request metadata (`referrer`, `userAgent`, `ipHash`, `country`, `city`, `deviceType`)

## Local setup

1. Install dependencies

```bash
bun install
```

2. Configure environment variables (`DATABASE_URL`, auth/billing keys)

3. Run the app

```bash
bun run dev
```

## Database

- Generate migrations: `bun run db:generate`
- Apply migrations: `bun run db:migrate`
- Seed starter QR records: `bun run db:seed`

## Notes

- This repo has been intentionally broken away from the original standup domain.
- Old standup routes/APIs/docs/workflows were removed in favor of QR-focused modules.
