# AI workflow

## Tools and collaboration

We used Codex for requirements discussions, implementation, tests, debugging and documentation, and Google Stitch to generate screen designs. AI assisted the development process; the application has no chatbot or AI-dependent runtime feature.

The candidate directed the scope, reviewed important design and architecture choices, and approved commit messages before commits. Codex proposed approaches, implemented the agreed work and checked the results. REQUIREMENTS.md records the agreed scope, decisions.md explains important choices, and the Git history shows incremental implementation.

## How we worked

1. Discussed the HR manager's needs before implementation and recorded the requirements, including deliberate exclusions. Agreed on employee management, immediate salary updates with history, and a basic summary in one selected currency.
2. Discussed the stack and deployment approach. Selected Next.js with TypeScript, local SQLite and hosted libSQL on Turso, with Vercel for the application. Recorded the rationale and relevant data-integrity decisions.
3. Asked Stitch for Login, Employees, Employee Profile and Pay Summary designs, including forms, validation, empty states and mobile layouts. The candidate found the first designs too complex. We revised them to use simpler screens and checked them against the agreed features before implementation.
4. Built the application in meaningful increments: scaffolding, login, database and seed, employee management, salary history, and pay summary. Kept shared controls separate from feature code and checked each stage before its commit.
5. Reviewed the running application on desktop and mobile, exercised forms and corrected issues found during review.

## Examples of AI instructions and feedback

These are summaries of the instructions and feedback used during the work, rather than a verbatim prompt transcript.

- Design a focused HR application with four main screens, explicit salary currencies, salary-pending states and responsive layouts. Keep payroll, currency conversion, charts and chatbot features outside the scope.
- Simplify the generated designs, especially the login screen, and remove visual noise and unrelated controls.
- Keep important decisions documented, use reusable components, and obtain approval for meaningful incremental commit messages.
- Preserve exact salary amounts, save salary history atomically and prevent stale salary forms from overwriting newer changes.

## Verification and corrections

AI-generated work was checked with automated tests and the running application. The latest implementation validation passed 46 tests, lint, TypeScript checking and a production build. Tests cover session rules, database integrity and repeatable seeding, employee validation and saves, salary precision and history, concurrent salary updates, and pay-summary calculations.

Browser checks exercised employee creation, detail editing, initial salary entry, salary updates, history, filtering and empty or validation states. Desktop and mobile review included widths of 1440, 390 and 320 pixels. Temporary employee data created during review was removed afterward.

Review exposed issues that required corrections: a hidden table label caused horizontal overflow on mobile; unsuccessful form submissions reset selected values; narrow-screen controls needed more room; and the summary filter button needed readable contrast. These fixes are recorded in the commit titled "Fix mobile layouts and preserve form input after validation."

## Status and limits

These notes describe the development work completed so far. Hosted database setup, deployment verification and the walkthrough video are still pending. Local checks do not establish that the hosted application works; deployment results should be added after they have been verified.
