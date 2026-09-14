import { apiClient } from "./apiClient";
import {
  makeReportCacheKey,
  withReportCache,
} from "./reportCache";

export type SocialChartRow = {
  name: string;
  value: number;
};

export type SocialRow = {
  id?: string | number;
  sheetRowNumber?: number;
  socialPlatform?: string;
  region?: string;
  country?: string;
  postQueryDate?: string;
  product?: string;
  postQuery?: string;
  response?: string;
  category?: string;
  customerResponse?: string;
  [key: string]: unknown;
};

export type SocialAnalytics = {
  totalQueries?: number;
  productCount?: number;
  categoryCount?: number;
  countries?: number;
  byProduct?: SocialChartRow[];
  byCategory?: SocialChartRow[];
  byRegion?: SocialChartRow[];
  byPlatform?: SocialChartRow[];
  byCustomerResponse?: SocialChartRow[];
};

export type SocialReport = {
  ok: boolean;
  source?: string;
  message?: string;
  syncedAt?: string | null;
  total?: number;
  rows: SocialRow[];
  analytics: SocialAnalytics;
  filters: {
    platforms?: string[];
    regions?: string[];
    countries?: string[];
    products?: string[];
    categories?: string[];
    customerResponses?: string[];
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

export async function fetchSocialReport(
  filters: Record<
    string,
    string | number | undefined
  > = {},
) {
  const params = cleanParams(filters);
  const key = makeReportCacheKey(
    "social",
    params,
  );

  return withReportCache(
    key,
    async () => {
      const { data } =
        await apiClient.get<SocialReport>(
          "/social",
          { params },
        );

      return data;
    },
  );
}

export async function syncSocial() {
  const { data } =
    await apiClient.post(
      "/social/sync",
    );

  return data;
}
