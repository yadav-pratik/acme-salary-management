export type PaySummaryFilters = {
  currency: string;
  department: string;
  country: string;
};

export type PaySummary = {
  includedCount: number;
  pendingCount: number;
  medianMinor: number | null;
  lowestMinor: number | null;
  highestMinor: number | null;
  medianRounded: boolean;
};
