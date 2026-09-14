import { apiClient } from "./apiClient";
import {
  makeReportCacheKey,
  withReportCache,
} from "./reportCache";

export type ChartRow = {
  name: string;
  value: number;
};

export type TicketRow = {
  id?: string;
  ticketNumber?: string;
  date?: string;
  region?: string;
  internal?: string;
  submissionStatus?: string;
  comment?: string;
  product?: string;
  subject?: string;
  category?: string;
  featureRequestSummary?: string;
};

export type TicketReport = {
  ok: boolean;
  source?: string;
  message?: string;
  syncedAt?: string | null;
  total: number;
  rows: TicketRow[];
  analytics: {
    totalTickets?: number;
    byDate?: ChartRow[];
    byProduct?: ChartRow[];
    byCategory?: ChartRow[];
    byRegion?: ChartRow[];
  };
  filters: {
    regions?: string[];
    products?: string[];
    categories?: string[];
    years?: Array<string | number>;
    months?: Array<string | number>;
  };
  fromCache?: boolean;
  cacheSavedAt?: string;
  cacheStale?: boolean;
};

export async function fetchTicketReport(
  filters: Record<
    string,
    string | number
  > = {},
) {
  const key = makeReportCacheKey(
    "tickets",
    filters,
  );

  return withReportCache(
    key,
    async () => {
      const { data } =
        await apiClient.get<TicketReport>(
          "/tickets",
          {
            params: filters,
          },
        );

      return data;
    },
  );
}

export async function syncTickets() {
  const { data } =
    await apiClient.post(
      "/tickets/sync",
    );

  return data;
}
