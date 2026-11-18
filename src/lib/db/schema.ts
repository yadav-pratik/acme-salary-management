import type { Client, InStatement } from "@libsql/client";
import { countries, currencies, departments } from "./reference-data";

const schema: InStatement[] = [
  `CREATE TABLE currencies (
    code TEXT PRIMARY KEY,
    minor_units INTEGER NOT NULL CHECK (minor_units BETWEEN 0 AND 3)
  )`,
  `CREATE TABLE countries (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
  )`,
  `CREATE TABLE departments (
    name TEXT PRIMARY KEY
  )`,
  `CREATE TABLE employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id TEXT GENERATED ALWAYS AS (printf('EMP-%05d', id)) STORED UNIQUE,
    full_name TEXT NOT NULL CHECK (length(trim(full_name)) > 0),
    department TEXT NOT NULL REFERENCES departments(name),
    country_code TEXT NOT NULL REFERENCES countries(code),
    salary_minor INTEGER CHECK (
      salary_minor IS NULL OR
      (typeof(salary_minor) = 'integer' AND salary_minor > 0 AND salary_minor <= 9007199254740991)
    ),
    currency_code TEXT REFERENCES currencies(code),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    CHECK ((salary_minor IS NULL) = (currency_code IS NULL))
  )`,
  `CREATE TABLE salary_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    previous_salary_minor INTEGER,
    previous_currency_code TEXT REFERENCES currencies(code),
    new_salary_minor INTEGER NOT NULL CHECK (new_salary_minor > 0),
    new_currency_code TEXT NOT NULL REFERENCES currencies(code),
    changed_at TEXT NOT NULL,
    CHECK ((previous_salary_minor IS NULL) = (previous_currency_code IS NULL))
  )`,
  "CREATE INDEX employees_name ON employees(full_name COLLATE NOCASE)",
  "CREATE INDEX employees_department ON employees(department, id)",
  "CREATE INDEX employees_country ON employees(country_code, id)",
  "CREATE INDEX employees_pay_summary ON employees(currency_code, department, country_code, salary_minor)",
  "CREATE INDEX salary_history_employee ON salary_history(employee_id, id DESC)",
  `CREATE TRIGGER employee_identity_fixed
    BEFORE UPDATE OF id ON employees
    WHEN NEW.id != OLD.id
    BEGIN SELECT RAISE(ABORT, 'Employee ID cannot be changed'); END`,
  `CREATE TRIGGER employee_salary_cannot_be_cleared
    BEFORE UPDATE OF salary_minor ON employees
    WHEN OLD.salary_minor IS NOT NULL AND NEW.salary_minor IS NULL
    BEGIN SELECT RAISE(ABORT, 'An existing salary cannot be cleared'); END`,
  `CREATE TRIGGER employee_initial_salary
    AFTER INSERT ON employees
    WHEN NEW.salary_minor IS NOT NULL
    BEGIN
      INSERT INTO salary_history (
        employee_id, previous_salary_minor, previous_currency_code,
        new_salary_minor, new_currency_code, changed_at
      ) VALUES (NEW.id, NULL, NULL, NEW.salary_minor, NEW.currency_code, NEW.created_at);
    END`,
  `CREATE TRIGGER employee_salary_changed
    AFTER UPDATE OF salary_minor, currency_code ON employees
    WHEN NEW.salary_minor IS NOT OLD.salary_minor OR NEW.currency_code IS NOT OLD.currency_code
    BEGIN
      INSERT INTO salary_history (
        employee_id, previous_salary_minor, previous_currency_code,
        new_salary_minor, new_currency_code, changed_at
      ) VALUES (
        NEW.id, OLD.salary_minor, OLD.currency_code,
        NEW.salary_minor, NEW.currency_code,
        strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      );
    END`,
  `CREATE TABLE seed_runs (
    name TEXT PRIMARY KEY,
    completed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`,
  ...currencies.map(currency => ({
    sql: "INSERT INTO currencies (code, minor_units) VALUES (?, ?)",
    args: [currency.code, currency.minorUnits],
  })),
  ...countries.map(country => ({
    sql: "INSERT INTO countries (code, name) VALUES (?, ?)",
    args: [country.code, country.name],
  })),
  ...departments.map(name => ({
    sql: "INSERT INTO departments (name) VALUES (?)",
    args: [name],
  })),
];

const migrations: InStatement[][] = [
  schema,
  [
    "ALTER TABLE employees ADD COLUMN creation_token TEXT",
    "CREATE UNIQUE INDEX employees_creation_token ON employees(creation_token)",
  ],
];

export async function applySchema(client: Client) {
  await client.execute(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`);
  const transaction = await client.transaction("write");
  try {
    const applied = await transaction.execute("SELECT version FROM schema_migrations ORDER BY version");
    if (applied.rows.length > migrations.length
      || applied.rows.some((row, index) => row.version !== index + 1)) {
      throw new Error("Database schema version is not supported by this application.");
    }
    for (let index = applied.rows.length; index < migrations.length; index++) {
      await transaction.batch([
        ...migrations[index],
        { sql: "INSERT INTO schema_migrations (version) VALUES (?)", args: [index + 1] },
      ]);
    }
    await transaction.commit();
  } finally {
    transaction.close();
  }
}
