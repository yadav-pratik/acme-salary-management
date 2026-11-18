# Deployment verification

Verified on 19 November 2026 (Asia/Kolkata) using source commit `738afc83aa90690907e843889558232b6d77694b`.

## Target

- Public demo: https://acme-salary-management-delta.vercel.app/login
- Application hosting: Vercel Hobby.
- Database: hosted libSQL on Turso, AWS AP South (Mumbai).
- Initial deployment ID: `SFKaU6cWqPt4NyggyHGzmirn52C8`.
- Same-source redeployment ID: `AaUgo8ePFvguPvmhYDHrw6hUiQL9`.

Vercel reported the redeployment Ready, Production and Current, with the public demo domain assigned to it. No schema or seed command ran as part of this redeployment.

## Production workflow checks

Browser checks exercised HR login, employee creation without a salary, employee-ID search and first salary entry. A temporary employee was saved as EMP-10001, then given an annual salary of INR 1,200,000. Direct database inspection confirmed the amount and its initial history entry were saved. The temporary employee and its history were removed after verification, leaving the original 10,000 employees.

Browser control became unavailable during the initial salary check. Subsequent checks used the deployed app's real login form over HTTP and the resulting session cookie, with direct Turso queries to confirm storage.

Fresh authenticated requests after redeployment verified the following.

| Check | Observed result |
| --- | --- |
| Login | HTTP 303 redirect to `/employees`; session cookie present with HttpOnly, Secure and SameSite=Lax |
| Employee directory | HTTP 200; 10,000 employees and seeded records rendered |
| Employee-ID search | HTTP 200; EMP-00001 and Aarav Sharma rendered |
| Employee profile | HTTP 200; CAD 173,700.00 and salary history rendered |
| Default Pay Summary | HTTP 200; median, lowest, highest and 1,028 pending salaries rendered |
| Filtered Pay Summary | HTTP 200 for INR, Engineering and India; salary figures rendered |
| Unauthenticated employee request | HTTP 307 redirect to `/login` |

## Persistence across redeployment

Read every employee row and salary-history row in ascending ID order before and after a same-source Vercel redeployment. Compute SHA-256 over each JSON-serialized result set and compare both fingerprints and counts.

| Dataset | Before | After |
| --- | --- | --- |
| Employees | 10,000 | 10,000 |
| Employees with pending salaries | 1,028 | 1,028 |
| Salary history entries | 8,972 | 8,972 |

Both fingerprints matched exactly.

```text
Employees
cf4d827e9149382e48a039dd3c4c27b0bb1ad04a106cfe1a841bbfc31a0f927b

Salary history
dc7bca7999f77ececb9ff38b6de060bac38bf2f1796b962d40c2c4f69da43355
```

This verifies that the hosted records remained unchanged across the application redeployment. The comparison made no database changes.

## Limits and remaining artifact

These are targeted production checks, rather than a load test, backup-restoration test or exhaustive security review. Full employee editing and later salary-change workflows were exercised locally before deployment; the initial production browser check covered creation and first salary entry. The latest implementation checks passed 46 automated tests, lint, TypeScript checking and a production build. Documentation changes do not change runtime behavior.

The walkthrough video remains to be recorded and linked before submission. The HR password and database credentials are intentionally absent from this public report.
