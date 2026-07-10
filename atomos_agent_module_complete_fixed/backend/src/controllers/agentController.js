import {
  fetchAgentSheetData,
} from "../services/agentSheetService.js";

import {
  buildAgentReport,
  filterAgentRows,
} from "../services/agentAnalyticsService.js";

let agentCache = {
  rows: [],
  syncedAt: null,
};

function getFilters(query = {}) {
  return {
    search: query.search || "",
    year: query.year || "",
    month: query.month || "",
    fromDate: query.fromDate || "",
    toDate: query.toDate || "",
    agent: query.agent || "",
    status: query.status || "",
    rating: query.rating || "",
    category: query.category || "",
  };
}

async function ensureAgentData() {
  if (agentCache.rows.length) return;

  const rows = await fetchAgentSheetData();

  agentCache = {
    rows,
    syncedAt: new Date().toISOString(),
  };
}

export async function syncAgents(request, response) {
  try {
    const rows = await fetchAgentSheetData();

    agentCache = {
      rows,
      syncedAt: new Date().toISOString(),
    };

    return response.json({
      success: true,
      message: "Agent data synced successfully.",
      total: rows.length,
      syncedAt: agentCache.syncedAt,
    });
  } catch (error) {
    console.error("Agent sync error:", error);

    return response.status(500).json({
      success: false,
      message:
        error?.response?.data?.error?.message ||
        error?.message ||
        "Agent data sync failed.",
    });
  }
}

export async function getAgentReport(request, response) {
  try {
    await ensureAgentData();

    const filteredRows = filterAgentRows(
      agentCache.rows,
      getFilters(request.query)
    );

    const analytics = buildAgentReport(
      filteredRows
    );

    return response.json({
      success: true,
      total: filteredRows.length,
      rows: filteredRows,
      analytics,
      filters: analytics.filters,
      slaRules: analytics.slaRules,
      syncedAt: agentCache.syncedAt,
    });
  } catch (error) {
    console.error("Agent report error:", error);

    return response.status(500).json({
      success: false,
      message:
        error?.message ||
        "Failed to load agent report.",
    });
  }
}

export async function unsyncAgents(request, response) {
  agentCache = {
    rows: [],
    syncedAt: null,
  };

  return response.json({
    success: true,
    message: "Agent cache cleared successfully.",
  });
}
