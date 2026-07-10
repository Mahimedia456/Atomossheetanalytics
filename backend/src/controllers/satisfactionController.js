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

export async function syncSatisfaction(req, res) {
  try {
    const result = await fetchSatisfactionSheetData();

    satisfactionCache = {
      rows: result.rows || [],
      syncedAt: new Date().toISOString(),
      source: result.source,
      message: result.message,
    };

    return res.json({
      ok: true,
      message: result.message,
      source: satisfactionCache.source,
      total: satisfactionCache.rows.length,
      syncedAt: satisfactionCache.syncedAt,
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
    const filteredRows = filterSatisfaction(satisfactionCache.rows, req.query);
    const limit = Number(req.query.limit || 5000);

    return res.json({
      ok: true,
      source: satisfactionCache.source,
      message: satisfactionCache.message,
      syncedAt: satisfactionCache.syncedAt,
      total: filteredRows.length,
      analytics: buildSatisfactionAnalytics(filteredRows),
      filters: buildSatisfactionFilterOptions(satisfactionCache.rows),
      rows: filteredRows.slice(0, limit),
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error.message || "Satisfaction report failed",
    });
  }
}