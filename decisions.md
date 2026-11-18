# Project decisions

## Employee records

HR can add employees with an employee ID, full name, department, and work country. Generate employee IDs automatically in the format EMP-10001 and keep them fixed after creation. HR does not need to assign IDs manually, and the application must ensure generated IDs are unique. The fixed ID gives HR a stable way to identify a record as other details change. HR can edit the name, department, and work country.

Salary and currency can be entered together at creation or later. This lets HR create a record before compensation details are available. The profile shows when salary is pending.

## Salary history

The employee profile shows the initial salary entry and later changes. Dates and previous and new amounts help HR see how pay changed over time. Salary updates take effect immediately on save. Recording the save time in the history keeps the workflow simple and avoids scheduling rules.

## Pay summary

Use one currency at a time, with optional department and work-country filters. Show the median, lowest, and highest salary, the number of employees included, and a separate count of pending salaries. This gives HR a basic summary without needing exchange rates.

## Spreadsheet migration

Use 10,000 seeded employees for the demo. Leave Excel import and export outside the first release so the assessment can focus on the day-to-day HR workflows.

## Demo access

Require a shared HR demo login so reviewers can try the full workflow with synthetic data. Set credentials through a local environment file or the hosting provider's environment settings. Keep credential values out of Git.

## Application stack

Use Next.js with TypeScript for the React UI and server-side logic. One application covers both layers and can be deployed as a single service.

Use SQLite for local development and a SQLite-compatible Turso database for the deployed demo. This keeps local setup simple for the 10,000-employee assessment and gives the deployed app persistent relational storage.

## Deployment

Deploy the Next.js application on Vercel Hobby and the database on Turso Free. This combination fits the personal assessment demo and provides a free deployment within each service's usage limits. Turso stores employee records and salary history separately from the application, so data survives app restarts and redeploys.

Connect to Turso from server-side code using environment variables for the database URL and authentication token. Keep credentials out of Git. The deployed database uses hosted storage, so the application does not need a persistent local disk.

## Code organization

Use src/app for routes and screen composition, src/features for feature-specific forms and behavior, src/components for shared controls and navigation, and src/lib for server infrastructure such as authentication and database access. Add feature folders as their code is introduced. Keep business-rule tests beside the code they verify. Database setup and seeding scripts will live in scripts. This gives each feature a clear home as the app grows and keeps shared controls reusable.

## Demo sessions

Use a signed, HTTP-only session cookie for the shared HR account. Sessions expire after eight hours. Configure the username, password and a session secret through server-side environment variables. Changing credentials or the secret invalidates existing sessions. Check access in protected pages and future data operations as well as the shared layout. Signed cookies support the single configured demo account without a user database. An eight-hour lifetime lets reviewers complete a session while requiring periodic sign-in.

## UI design

Use the simplified Stitch designs as the visual reference. Keep Login, Employees, Employee Profile and Pay Summary focused on their HR tasks, with plain labels, essential controls and clear error and empty states. The first generated designs were too busy, so remove decorative panels, compliance claims and unrelated features. Keep the same approach on mobile.

Design reference https://stitch.google.com/projects/14686831510513642198

## Database representation and integrity

Use parameterized SQL through the libSQL TypeScript client for local SQLite and hosted libSQL Turso connections. The small schema remains readable without an ORM. Keep versioned schema setup separate from application startup.

Store salary amounts as integer minor units with an explicit currency code and precision. Salary and currency must be provided together or both remain pending. This preserves exact values without floating-point storage.

The database generates public employee IDs from an auto-incrementing internal key and prevents identity changes. Database triggers write initial salaries and later changes to salary_history in the same transaction as the employee record. This prevents a successful salary change without its history entry. Details-only edits and unchanged salaries do not add history.

## Synthetic seed data

Seed 10,000 employees deterministically across Engineering, Product, Sales, Finance, People and Operations, and the US, Germany, UK, India, Japan and Canada. Use each country's corresponding currency for the synthetic examples, and leave approximately 10% of salaries pending. These choices exercise the filters and currency precision, including JPY's whole-unit amounts.

Seed in one transaction and store a completion marker. Reruns preserve HR edits, and failures leave no partial seed. Stop when an unmarked database already contains employees so existing records are preserved.

## Employee browsing and saves

Run employee search, combined filters and pagination in the database, returning 25 rows at a time. Keep filters and page selection in the URL so navigation and refresh preserve the view. Read the page count and rows in one snapshot so they stay consistent during concurrent changes.

Keep details-only updates separate from salary updates, including at the database write boundary. A form-specific creation token makes repeated Add employee submissions return the same employee. Add this through a versioned migration so existing seeded records keep their IDs and history.

## Salary update concurrency

Use the latest salary-history entry as the revision when an HR manager opens a salary form. Check that revision inside a write transaction before changing pay, so an older form cannot overwrite a newer salary. Saving the current amount/currency again succeeds without adding duplicate history, which also handles a retried successful request.

A salary change accepts an explicit new amount and currency. It performs no exchange-rate conversion. History retains each previous and new currency, and the UI labels its timestamps as UTC so records remain unambiguous across countries.
