import {
  buildSatisfactionAnalytics,
  buildSatisfactionFilterOptions,
  fetchSatisfactionSheetData,
  filterSatisfaction,
} from "../services/satisfactionSheetService.js";

let satisfactionCache = {
  rows: [],
  syncedAt: null,
  source: "none",
  message: "",
};

let activeSatisfactionSyncPromise = null;

async function refreshSatisfactionCache() {
  if (activeSatisfactionSyncPromise) {
    return activeSatisfactionSyncPromise;
  }

  activeSatisfactionSyncPromise = (async () => {
    const result = await fetchSatisfactionSheetData();

    satisfactionCache = {
      rows: result.rows || [],
      syncedAt: new Date().toISOString(),
      source: result.source || "google_sheet",
      message: result.message || "",
    };

    return satisfactionCache;
  })();

  try {
    return await activeSatisfactionSyncPromise;
  } finally {
    activeSatisfactionSyncPromise = null;
  }
}

function getRequestedLimit(value, fallback = 5000) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, 30000);
}

export async function syncSatisfaction(req, res) {
  try {
    const cache = await refreshSatisfactionCache();

    return res.json({
      ok: true,
      message: cache.message,
      source: cache.source,
      total: cache.rows.length,
      syncedAt: cache.syncedAt,
    });
  } catch (error) {
    console.error("Satisfaction sync error:", error);

    return res.status(500).json({
      ok: false,
      message: error.message || "Satisfaction sync failed",
    });
  }
}

export async function getSatisfactionReport(req, res) {
  try {
    if (!satisfactionCache.syncedAt || !satisfactionCache.rows.length) {
      await refreshSatisfactionCache();
    }

    const filteredRows = filterSatisfaction(satisfactionCache.rows, req.query);
    const limit = getRequestedLimit(req.query.limit, 5000);

    return res.json({
      ok: true,
      source: satisfactionCache.source,
      message: satisfactionCache.message,
      syncedAt: satisfactionCache.syncedAt,
      totalSourceRows: satisfactionCache.rows.length,
      total: filteredRows.length,
      analytics: buildSatisfactionAnalytics(filteredRows),
      filters: buildSatisfactionFilterOptions(satisfactionCache.rows),
      rows: filteredRows.slice(0, limit),
      rowsLimited: filteredRows.length > limit,
    });
  } catch (error) {
    console.error("Satisfaction report error:", error);

    return res.status(500).json({
      ok: false,
      message: error.message || "Satisfaction report failed",
    });
  }
}
