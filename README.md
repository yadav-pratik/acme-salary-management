# ACME Salary Management

An HR application for employee records, salary updates and history, and basic pay summaries. See [requirements](REQUIREMENTS.md), [design decisions](decisions.md) and [AI workflow notes](AI_WORKFLOW.md) for scope, rationale and how AI contributions were checked.

## Live demo

- [Open the application](https://acme-salary-management-delta.vercel.app/login).
- [GitHub repository](https://github.com/yadav-pratik/acme-salary-management).
- Demo username: `hr.demo`. Obtain the password from the submission owner; credentials are kept out of this public repository.
- The hosted database contains synthetic data. The initial seed has 10,000 employees, including 1,028 with pending salaries. Counts can change when reviewers add or update records.
- [Deployment verification](DEPLOYMENT_VERIFICATION.md) records production checks and the successful persistence check across a redeployment.
- [Watch the walkthrough video](https://drive.google.com/file/d/1HX7QWoSdIsqUgF3EwVT7RcCV8URheYIE/view?usp=sharing).

## Local setup

Use Node.js 24 LTS and npm. Clone the repository and enter its application directory.

```sh
git clone https://github.com/yadav-pratik/acme-salary-management.git
cd acme-salary-management
npm ci
```

Copy `.env.example` to `.env.local` and configure `DEMO_USERNAME`, `DEMO_PASSWORD` and `SESSION_SECRET`. Generate a session secret with at least 32 characters, for example with the following command.

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

For a local SQLite database, keep `DATABASE_URL=file:salary-management.db` and leave `DATABASE_AUTH_TOKEN` empty. Initialize the database before starting the app.

```sh
npm run db:setup
npm run db:seed
npm run dev
```

Open http://localhost:3000. Local environment files and database files are ignored by Git. The development computer's `.env.local` currently points to the hosted demo; use the local file URL when you want an independent development dataset.

## Checks and production build

```sh
npm test
npm run lint
npm run typecheck
npm run build
```

To run the production build locally, configure a hosted database before running `npm start`. Production deliberately rejects a local SQLite file URL because the deployed application needs persistent hosted storage.

## Features

Employees supports server-side name/ID search, country/department filters, pagination, creation and detail editing. Employee profiles support salary entry/updates and dated history. Pay Summary provides filtered salary figures and pending-salary counts. HR workflows require the configured demo login.

## Deployment

The application runs on Vercel Hobby, with a hosted libSQL database on Turso Free in AWS AP South (Mumbai). The Vercel app connects directly to Turso through server-side environment variables.

1. Create a Turso Cloud database using the libSQL-compatible engine. Leave the optional TursoDB engine toggle off for this implementation. Obtain its `libsql://` URL and a read/write database token.
2. Put the hosted URL and token in a private local `.env.local`, along with the login settings. Run `npm run db:setup` and `npm run db:seed` against that database once. Verify the seed output reports 10,000 unique employee IDs.
3. Import the GitHub repository into Vercel. Use the Hobby plan, the Next.js preset, repository root `./`, Node.js 24.x and the framework's default build/output settings. Grant the GitHub integration access to this repository.
4. Set the following environment variables in the Vercel project. This demo configures both Production and Preview to use the same synthetic database and login settings.

| Variable | Value |
| --- | --- |
| `DEMO_USERNAME` | Configured HR demo username |
| `DEMO_PASSWORD` | Configured HR demo password |
| `SESSION_SECRET` | Random session-signing secret of at least 32 characters |
| `DATABASE_URL` | Hosted Turso `libsql://` URL |
| `DATABASE_AUTH_TOKEN` | Read/write token for that database |

5. Deploy and check login, employee browsing, salary history and Pay Summary. Subsequent pushes to the connected production branch `main` deploy through Vercel. A same-version rebuild can be started from Deployments, the deployment's actions menu, then Redeploy.

Keep these variables server-side. Do not give them a `NEXT_PUBLIC_` prefix or commit their values. Vercel environment changes take effect on a new deployment, so redeploy after updating them.

Schema setup and seeding are separate from the Vercel build and app startup. Run schema setup explicitly when a release adds a migration. Do not seed on every deployment. The seed marker makes retries preserve existing HR edits, and application redeployments continue using the same hosted database.

### Database token renewal

The demo uses an expiring read/write token with a 90-day lifetime. Its current expiry is **16 February 2027 at 18:20:30 UTC**. Renew it before that time so the application can continue accessing the database.

Create a replacement database token in Turso, update `DATABASE_AUTH_TOKEN` in local private configuration and both Vercel environments, redeploy, and verify the live app. If retiring an old token before expiry, check Turso's current revocation scope before revoking it. Token renewal does not require recreating or reseeding the database.

## Demo sessions

The session cookie is HTTP-only, uses SameSite=Lax and expires after eight hours. Production uses HTTPS-only cookies. All HR pages and data mutations require a valid session. Changing the configured credentials or session secret invalidates old sessions.

## Source structure

- `src/app` contains routes and shared page layouts.
- `src/features/auth` contains the login form and authentication actions.
- `src/features/employees` contains employee forms, queries, validation and save actions.
- `src/features/salaries` contains profile queries, salary validation, updates and history.
- `src/features/pay-summary` contains summary queries and filter validation.
- `src/components` contains reusable controls and navigation.
- `src/lib/auth` contains server configuration and session validation.
- `src/lib/db` contains the database client, schema, reference data and deterministic seed generator.
- `scripts` contains database setup and seed commands. Tests live beside the rules they verify.

## Database setup and demo data

The seed creates exactly 10,000 synthetic employees across six departments, countries and currencies. Approximately 10% have pending salaries. It uses fixed input data and a fixed generator seed, so fresh databases receive the same records. Employees with salaries have an initial salary history entry.

Rerunning the seed preserves existing records and edits. If a database already has employees without this seed's completion marker, seeding stops and preserves them. A failed seed rolls back all employee/history inserts and can be retried. Schema setup is versioned and repeatable.

Employee IDs are generated by the database (EMP-00001 through EMP-10000 for the seed). New records receive the next available generated ID, and IDs remain fixed. Deleting temporary test records does not reset the sequence. Amounts use integer minor units, with currency precision recorded in the currencies table. Salary and currency are both present or both pending. Database triggers record initial salaries and subsequent changes atomically, avoiding history entries for unchanged pay or details-only edits.

## Employee workflow

After pulling schema changes, run `npm run db:setup` before starting the app. Setup applies only pending versioned migrations and preserves existing records.

The Employees screen retrieves 25 records at a time, with filters and pagination carried in the URL. Name/ID search treats wildcard characters as literal text. Employee forms validate required details and salary/currency pairs on the server. New records can leave salary pending; details-only editing preserves compensation.

Each opened Add employee form has a unique request token. A retried submission returns the already saved employee instead of inserting a duplicate. The second schema migration adds this token without changing existing employee IDs or salary history.

## Employee profiles and salary changes

Open an employee name in the directory to view their profile. HR can edit details, add a pending salary, or update an existing annual gross base salary. Salary history displays the first entry and subsequent changes, with explicit currencies and UTC timestamps. History is paginated in groups of 20.

Salary forms validate exact amounts using the selected currency's precision. Each change applies immediately. A stale form returns a conflict message and refreshes the profile data so HR can close and reopen the form to review the newer salary. Saving unchanged pay or retrying an already-applied update adds no duplicate history.

## Pay Summary

Select a currency, with optional department and work country filters. The page shows the included employee count and median, lowest and highest current annual gross base salary. It defaults to USD. Filters are stored in the URL and invalid selections produce field errors.

Pending salaries are excluded from calculations. Their count follows department and country filters independently of the currency selector. A scope with no matching salaries displays zero included employees, dashes for salary figures and an empty-state message while retaining the pending count.

For an even employee count, the median averages the two middle salaries using exact integer arithmetic. A half minor unit rounds up to the currency's supported precision, with a rounding note shown when needed. Summary counts and salary figures are read from one database snapshot.
