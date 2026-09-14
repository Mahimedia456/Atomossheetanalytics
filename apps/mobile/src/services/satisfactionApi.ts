import { apiClient } from "./apiClient";
import {
  makeReportCacheKey,
  withReportCache,
} from "./reportCache";

export type ChartRow = {
  name: string;
  value: number;
};

export type SatisfactionRow = {
  id?: string | number;
  ticketId?: string;
  ticket_id?: string;
  ticketNumber?: string;
  ticket_number?: string;
  date?: string;
  date_display?: string;
  updatedDate?: string;
  updated_date?: string;
  rating?: string;
  category?: string;
  Category?: string;
  comments?: string;
  comment?: string;
  feedback?: string;
  hasComment?: boolean;
  [key: string]: unknown;
};

export type SatisfactionAnalytics = {
  totalResponses?: number;
  goodResponses?: number;
  badResponses?: number;
  withComment?: number;
  withoutComment?: number;
  goodComments?: number;
  badComments?: number;
  byDate?: ChartRow[];
  byCategory?: ChartRow[];
  byRating?: ChartRow[];
  byCommentStatus?: ChartRow[];
  byGoodBadComment?: ChartRow[];
};

export type SatisfactionReport = {
  ok: boolean;
  source?: string;
  message?: string;
  syncedAt?: string | null;
  total: number;
  rows: SatisfactionRow[];
  analytics: SatisfactionAnalytics;
  filters: {
    years?: Array<string | number>;
    months?: Array<string | number>;
    categories?: string[];
    ratings?: string[];
  };
  fromCache?: boolean;
  cacheSavedAt?: string;
  cacheStale?: boolean;
};

export type SatisfactionAiResult = {
  team?: string;
  sentiment?: string;
  confidence?: number;
  summary?: string;
  explanation?: string;
  recommendedAction?: string;
  evidence?: string[];
  [key: string]: unknown;
};

export async function fetchSatisfactionReport(
  filters: Record<string, string | number> = {},
) {
  const params = filters;
  const key = makeReportCacheKey(
    "satisfaction",
    params,
  );

  return withReportCache(
    key,
    async () => {
      const { data } =
        await apiClient.get<SatisfactionReport>(
          "/satisfaction",
          { params },
        );

      return data;
    },
  );
}

export async function syncSatisfaction() {
  const { data } =
    await apiClient.post(
      "/satisfaction/sync",
    );

  return data;
}

export async function analyzeSatisfactionResponse(
  payload: {
    ticketId: string;
    rating: string;
    category: string;
    comment: string;
  },
) {
  const { data } =
    await apiClient.post(
      "/ai/satisfaction/analyze",
      payload,
    );

  return (
    data?.data || data
  ) as SatisfactionAiResult;
}
