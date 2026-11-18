# ACME Salary Management

An HR application for employee records, salary updates and history, and basic pay summaries. Scope is recorded in REQUIREMENTS.md and choices in decisions.md.

## Local setup

Use Node.js 24 LTS and npm.

On this computer, a portable Node.js installation is available beside the project. In PowerShell, run the following from the project folder before using npm.

```powershell
$env:Path = (Resolve-Path '..\.tools\node-v24.22.3-win-x64').Path + ';' + $env:Path
```

```sh
npm ci
npm run dev
```

Open http://localhost:3000.

## Checks and production build

```sh
npm test
npm run lint
npm run typecheck
npm run build
npm start
```

## Current stage

Login and shared navigation are implemented. Employee and Pay Summary routes currently contain headings. Database integration and HR workflows are the next increments.
## Demo login configuration

Copy .env.example to .env.local and set DEMO_USERNAME, DEMO_PASSWORD and SESSION_SECRET. Use a random secret of at least 32 characters. Restart the development server after changing these values. A local .env.local has already been generated on the development computer. Open it locally to view or edit the demo credentials.

The session cookie is HTTP-only, uses SameSite=Lax and expires after eight hours. Production uses HTTPS-only cookies. All HR pages require a valid session. Changing the configured credentials or secret invalidates old sessions.

## Source structure

- src/app contains routes and shared page layouts.
- src/features/auth contains the login form and authentication actions.
- src/components contains reusable controls and navigation.
- src/lib/auth contains server configuration and session validation, with unit tests beside the session rules.
- Employee, salary, pay-summary and database folders will be added with their features.
