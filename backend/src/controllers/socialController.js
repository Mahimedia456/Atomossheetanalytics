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

export async function syncSocial(req, res) {
  try {
    const result = await fetchSocialSheetData();

    socialCache = {
      rows: result.rows || [],
      syncedAt: new Date().toISOString(),
      source: result.source,
      message: result.message,
    };

    return res.json({
      ok: true,
      message: result.message,
      source: socialCache.source,
      total: socialCache.rows.length,
      syncedAt: socialCache.syncedAt,
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
    const filteredRows = filterSocialRows(socialCache.rows, req.query);
    const limit = Number(req.query.limit || 5000);

    return res.json({
      ok: true,
      source: socialCache.source,
      message: socialCache.message,
      syncedAt: socialCache.syncedAt,
      total: filteredRows.length,
      analytics: buildSocialAnalytics(filteredRows),
      filters: buildSocialFilterOptions(socialCache.rows),
      rows: filteredRows.slice(0, limit),
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error.message || "Social report failed",
    });
  }
}