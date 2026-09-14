import { apiClient } from "./apiClient";
import {
  makeReportCacheKey,
  withReportCache,
} from "./reportCache";

export type RushRmaChartRow = {
  name: string;
  value: number;
};

export type RushRmaRow = {
  id?: string | number;
  region?: string;
  month?: string;
  product?: string;
  description?: string;
  actualRmaReplacement?: number;
  dStockUnitsReceived?: number;
  aStockSentOut?: number;
  rmaUnitsSentOut?: number;
  bStockSentOut?: number;
  dStock?: number;
  bStock?: number;
  aStock?: number;
  pendingToShip?: number;
  pendingToReceive?: number;
  googleDriveRmaCases?: number;
  [key: string]: unknown;
};

export type RushRmaAnalytics = {
  actualRmaReplacement?: number;
  dStockUnitsReceived?: number;
  googleDriveRmaCases?: number;
  pendingToShip?: number;
  pendingToReceive?: number;
  byMonth?: RushRmaChartRow[];
  byProduct?: RushRmaChartRow[];
  sentOutSummary?: RushRmaChartRow[];
  dStockReceivedSummary?: RushRmaChartRow[];
  pendingSummary?: RushRmaChartRow[];
  byRegion?: RushRmaChartRow[];
  stockSummary?: RushRmaChartRow[];
};

export type RushRmaReport = {
  ok: boolean;
  source?: string;
  message?: string;
  syncedAt?: string | null;
  total?: number;
  rows: RushRmaRow[];
  analytics: RushRmaAnalytics;
  filters: {
    regions?: string[];
    months?: string[];
    products?: string[];
  };
  fromCache?: boolean;
  cacheSavedAt?: string;
  cacheStale?: boolean;
};

function cleanParams(
  filters: Record<
    string,
    string | number | undefined
  >,
) {
  return Object.entries(filters).reduce(
    (result, [key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
      ) {
        result[key] = value;
      }

      return result;
    },
    {} as Record<string, string | number>,
  );
}

export async function fetchRushRmaReport(
  filters: Record<
    string,
    string | number | undefined
  > = {},
) {
  const params = cleanParams(filters);
  const key = makeReportCacheKey(
    "rush-rma",
    params,
  );

  return withReportCache(
    key,
    async () => {
      const { data } =
        await apiClient.get<RushRmaReport>(
          "/rma",
          { params },
        );

      return data;
    },
  );
}

export async function syncRushRma() {
  const { data } =
    await apiClient.post(
      "/rma/sync",
    );

  return data;
}
