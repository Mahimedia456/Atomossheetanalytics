import { apiClient } from "./apiClient";
import {
  makeReportCacheKey,
  withReportCache,
} from "./reportCache";

export type ChartRow = {
  name: string;
  value: number;
  [key: string]: unknown;
};

export type GlobalRmaRow = {
  id?: string;
  region?: string;
  rmaNumber?: string;
  entryDate?: string;
  processedDate?: string;
  returnDate?: string;
  returnYear?: string;
  returnMonth?: string;
  product?: string;
  productName?: string;
  productSku?: string;
  productWithFault?: string;
  serialNumber?: string;
  replacementSku?: string;
  deviceName?: string;
  rmaType?: string;
  stockType?: string;
  sentStockType?: string;
  quantity?: number;
  faultDescription?: string;
  faultCategory?: string;
  actionTaken?: string;
  rmaStatus?: string;
  trackingNumber?: string;
  replacementOrderNumber?: string;
  replacementSerialNumber?: string;
  customerType?: string;
  companyName?: string;
  country?: string;
  state?: string;
  city?: string;
  postCode?: string;
  roNotes?: string;
  customerReturnTrackingNumber?: string;
  [key: string]: unknown;
};

export type YearCategoryRow = {
  year: string;
  category: string;
  value: number;
};

export type GlobalRmaAnalytics = {
  totalRma?: number;
  totalRecords?: number;
  totalUsa?: number;
  totalEmea?: number;
  totalReplaced?: number;
  totalRepaired?: number;
  totalPending?: number;
  totalCustomers?: number;
  totalResellers?: number;
  totalDistributors?: number;
  datedRmaCount?: number;
  totalDStockReceived?: number;
  totalRStockSent?: number;
  totalBStockSent?: number;
  byRegion?: ChartRow[];
  byRmaStatus?: ChartRow[];
  byActionTaken?: ChartRow[];
  byFaultCategory?: ChartRow[];
  byCustomerType?: ChartRow[];
  byAccountType?: ChartRow[];
  byProduct?: ChartRow[];
  productNameTrend?: Array<
    ChartRow & { trend?: string }
  >;
  faultCategoryTrend?: Array<
    ChartRow & { trend?: string }
  >;
  stockMovementSummary?: ChartRow[];
  replacementUnitsByDevice?: ChartRow[];
  sentStockByDevice?: Array<{
    name: string;
    RStock: number;
    BStock: number;
    OtherStock: number;
    total: number;
  }>;
  yearCategoryWiseRma?: YearCategoryRow[];
};

export type GlobalRmaReport = {
  ok: boolean;
  source?: string;
  message?: string;
  syncedAt?: string | null;
  total?: number;
  totalSourceRows?: number;
  rows: GlobalRmaRow[];
  analytics: GlobalRmaAnalytics;
  filters: {
    regions?: string[];
    products?: string[];
    productNames?: string[];
    productSkus?: string[];
    rmaStatuses?: string[];
    actionsTaken?: string[];
    faultCategories?: string[];
    customerTypes?: string[];
    companyNames?: string[];
    countries?: string[];
    years?: string[];
    months?: string[];
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

export async function fetchGlobalRmaReport(
  filters: Record<
    string,
    string | number | undefined
  > = {},
) {
  const params = cleanParams(filters);
  const key = makeReportCacheKey(
    "global-rma",
    params,
  );

  return withReportCache(
    key,
    async () => {
      const { data } =
        await apiClient.get<GlobalRmaReport>(
          "/global-rma",
          { params },
        );

      return data;
    },
  );
}

export async function syncGlobalRma() {
  const { data } =
    await apiClient.post(
      "/global-rma/sync",
    );

  return data;
}
