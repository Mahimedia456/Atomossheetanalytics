import {
  buildRmaAnalytics,
  buildRmaFilterOptions,
  fetchGlobalRmaSheetData,
  filterRmaRows,
} from "../services/rmaSheetService.js";

let rmaCache = {
  rows: [],
  syncedAt: null,
  source: "none",
  message: "",
};

let activeRmaSyncPromise = null;

async function refreshRmaCache() {
  if (activeRmaSyncPromise) {
    return activeRmaSyncPromise;
  }

  activeRmaSyncPromise = (async () => {
    const result = await fetchGlobalRmaSheetData();

    rmaCache = {
      rows: result.rows || [],
      syncedAt: new Date().toISOString(),
      source: result.source || "google_sheet",
      message: result.message || "",
    };

    return rmaCache;
  })();

  try {
    return await activeRmaSyncPromise;
  } finally {
    activeRmaSyncPromise = null;
  }
}

function getRequestedLimit(value, fallback = 5000) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, 30000);
}

export async function syncGlobalRma(req, res) {
  try {
    const cache = await refreshRmaCache();

    return res.json({
      ok: true,
      message: cache.message,
      source: cache.source,
      total: cache.rows.length,
      syncedAt: cache.syncedAt,
    });
  } catch (error) {
    console.error("Global RMA sync error:", error);

    return res.status(500).json({
      ok: false,
      message: error.message || "Global RMA sync failed",
    });
  }
}

export async function getGlobalRmaReport(req, res) {
  try {
    if (!rmaCache.syncedAt || !rmaCache.rows.length) {
      await refreshRmaCache();
    }

    const filteredRows = filterRmaRows(rmaCache.rows, req.query);
    const limit = getRequestedLimit(req.query.limit, 5000);

    return res.json({
      ok: true,
      source: rmaCache.source,
      message: rmaCache.message,
      syncedAt: rmaCache.syncedAt,
      totalSourceRows: rmaCache.rows.length,
      total: filteredRows.length,
      analytics: buildRmaAnalytics(filteredRows),
      filters: buildRmaFilterOptions(rmaCache.rows),
      rows: filteredRows.slice(0, limit),
      rowsLimited: filteredRows.length > limit,
    });
  } catch (error) {
    console.error("Global RMA report error:", error);

    return res.status(500).json({
      ok: false,
      message: error.message || "Global RMA report failed",
    });
  }
}
