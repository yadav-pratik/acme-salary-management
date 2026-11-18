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
npm run lint
npm run typecheck
npm run build
npm start
```

## Current stage

The initial Next.js and TypeScript scaffold is in place. Database integration, demo login, and HR workflows are planned in the requirements document.