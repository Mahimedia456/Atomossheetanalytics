import {
  buildFilterOptions,
  buildTicketAnalytics,
  fetchTicketSheetData,
  filterTickets,
} from "../services/ticketSheetService.js";

let ticketCache = {
  rows: [],
  syncedAt: null,
  source: "none",
  message: "",
};

let activeTicketSyncPromise = null;

async function refreshTicketCache() {
  if (activeTicketSyncPromise) {
    return activeTicketSyncPromise;
  }

  activeTicketSyncPromise = (async () => {
    const result = await fetchTicketSheetData();

    ticketCache = {
      rows: result.rows || [],
      syncedAt: new Date().toISOString(),
      source: result.source || "google_sheet",
      message: result.message || "",
    };

    return ticketCache;
  })();

  try {
    return await activeTicketSyncPromise;
  } finally {
    activeTicketSyncPromise = null;
  }
}

function getRequestedLimit(value, fallback = 3000) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, 30000);
}

export async function syncTickets(req, res) {
  try {
    const cache = await refreshTicketCache();

    return res.json({
      ok: true,
      message: cache.message,
      source: cache.source,
      total: cache.rows.length,
      syncedAt: cache.syncedAt,
    });
  } catch (error) {
    console.error("Ticket sheet sync error:", error);

    return res.status(500).json({
      ok: false,
      message: error.message || "Ticket sheet sync failed",
    });
  }
}

export async function getTicketReport(req, res) {
  try {
    if (!ticketCache.syncedAt || !ticketCache.rows.length) {
      await refreshTicketCache();
    }

    const filteredRows = filterTickets(ticketCache.rows, req.query);
    const limit = getRequestedLimit(req.query.limit, 3000);

    return res.json({
      ok: true,
      source: ticketCache.source,
      message: ticketCache.message,
      syncedAt: ticketCache.syncedAt,
      totalSourceRows: ticketCache.rows.length,
      total: filteredRows.length,
      analytics: buildTicketAnalytics(filteredRows),
      filters: buildFilterOptions(ticketCache.rows),
      rows: filteredRows.slice(0, limit),
      rowsLimited: filteredRows.length > limit,
    });
  } catch (error) {
    console.error("Ticket report error:", error);

    return res.status(500).json({
      ok: false,
      message: error.message || "Ticket report failed",
    });
  }
}
