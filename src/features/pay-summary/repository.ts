import type { Client } from "@libsql/client";
import type { PaySummary, PaySummaryFilters } from "./types";

export async function getPaySummary(client: Client, filters: PaySummaryFilters): Promise<PaySummary> {
  const scope: string[] = [];
  const args: string[] = [];
  if (filters.department) {
    scope.push("department = ?");
    args.push(filters.department);
  }
  if (filters.country) {
    scope.push("country_code = ?");
    args.push(filters.country);
  }
  const scopedWhere = scope.length ? " AND " + scope.join(" AND ") : "";
  const transaction = await client.transaction("read");
  try {
    const [salaries, pending] = await transaction.batch([
      {
        sql: `SELECT COUNT(*) AS count, MIN(salary_minor) AS lowest, MAX(salary_minor) AS highest
          FROM employees WHERE currency_code = ?${scopedWhere}`,
        args: [filters.currency, ...args],
      },
      {
        sql: `SELECT COUNT(*) AS count FROM employees WHERE salary_minor IS NULL${scopedWhere}`,
        args,
      },
    ]);
    const aggregate = salaries.rows[0];
    const includedCount = Number(aggregate.count);
    let medianMinor: number | null = null;
    let medianRounded = false;

    if (includedCount > 0) {
      const middle = await transaction.execute({
        sql: `SELECT salary_minor FROM employees WHERE currency_code = ?${scopedWhere}
          ORDER BY salary_minor LIMIT ? OFFSET ?`,
        args: [filters.currency, ...args, includedCount % 2 === 0 ? 2 : 1, Math.floor((includedCount - 1) / 2)],
      });
      const lower = BigInt(Number(middle.rows[0].salary_minor));
      const upper = BigInt(Number(middle.rows[middle.rows.length - 1].salary_minor));
      const sum = lower + upper;
      medianRounded = sum % 2n !== 0n;
      medianMinor = Number((sum + 1n) / 2n);
    }

    return {
      includedCount,
      pendingCount: Number(pending.rows[0].count),
      medianMinor,
      medianRounded,
      lowestMinor: aggregate.lowest === null ? null : Number(aggregate.lowest),
      highestMinor: aggregate.highest === null ? null : Number(aggregate.highest),
    };
  } finally {
    transaction.close();
  }
}
