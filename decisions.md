# Project decisions

## Employee records

HR can add employees with an employee ID, full name, department, and work country. The ID stays fixed so HR has a stable way to identify a record as other details change. HR can edit the name, department, and work country.

Salary and currency can be entered together at creation or later. This lets HR create a record before compensation details are available. The profile shows when salary is pending.

## Salary history

The employee profile shows the initial salary entry and later changes. Dates and previous and new amounts help HR see how pay changed over time. Salary updates take effect immediately on save. Recording the save time in the history keeps the workflow simple and avoids scheduling rules.

## Pay summary

Use one currency at a time, with optional department and work-country filters. Show the median, lowest, and highest salary, the number of employees included, and a separate count of pending salaries. This gives HR a basic summary without needing exchange rates.

## Spreadsheet migration

Use 10,000 seeded employees for the demo. Leave Excel import and export outside the first release so the assessment can focus on the day-to-day HR workflows.

## Demo access

Require a shared HR demo login so reviewers can try the full workflow with synthetic data. Set credentials through a local environment file or the hosting provider's environment settings. Keep credential values out of Git.
