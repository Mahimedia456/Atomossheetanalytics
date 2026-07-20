import {
  buildSocialAnalytics,
  buildSocialFilterOptions,
  fetchSocialSheetData,
  filterSocialRows,
} from "../services/socialSheetService.js";

let socialCache = {
  rows: [],
  syncedAt: null,
  source: "none",
  message: "",
};

let activeSocialSyncPromise = null;

async function refreshSocialCache() {
  if (activeSocialSyncPromise) {
    return activeSocialSyncPromise;
  }

  activeSocialSyncPromise = (async () => {
    const result = await fetchSocialSheetData();

    socialCache = {
      rows: result.rows || [],
      syncedAt: new Date().toISOString(),
      source: result.source || "google_sheet",
      message: result.message || "",
    };

    return socialCache;
  })();

  try {
    return await activeSocialSyncPromise;
  } finally {
    activeSocialSyncPromise = null;
  }
}

function getRequestedLimit(value, fallback = 5000) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, 30000);
}

export async function syncSocial(req, res) {
  try {
    const cache = await refreshSocialCache();

    return res.json({
      ok: true,
      message: cache.message,
      source: cache.source,
      total: cache.rows.length,
      syncedAt: cache.syncedAt,
    });
  } catch (error) {
    console.error("Social sync error:", error);

    return res.status(500).json({
      ok: false,
      message: error.message || "Social sync failed",
    });
  }
}

export async function getSocialReport(req, res) {
  try {
    if (!socialCache.syncedAt || !socialCache.rows.length) {
      await refreshSocialCache();
    }

    const filteredRows = filterSocialRows(socialCache.rows, req.query);
    const limit = getRequestedLimit(req.query.limit, 5000);

    return res.json({
      ok: true,
      source: socialCache.source,
      message: socialCache.message,
      syncedAt: socialCache.syncedAt,
      totalSourceRows: socialCache.rows.length,
      total: filteredRows.length,
      analytics: buildSocialAnalytics(filteredRows),
      filters: buildSocialFilterOptions(socialCache.rows),
      rows: filteredRows.slice(0, limit),
      rowsLimited: filteredRows.length > limit,
    });
  } catch (error) {
    console.error("Social report error:", error);

    return res.status(500).json({
      ok: false,
      message: error.message || "Social report failed",
    });
  }
}
