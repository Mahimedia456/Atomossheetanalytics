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

export async function syncTickets(req, res) {
  try {
    const result = await fetchTicketSheetData();

    ticketCache = {
      rows: result.rows || [],
      syncedAt: new Date().toISOString(),
      source: result.source,
      message: result.message,
    };

    return res.json({
      ok: true,
      message: result.message,
      source: ticketCache.source,
      total: ticketCache.rows.length,
      syncedAt: ticketCache.syncedAt,
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
    const filteredRows = filterTickets(ticketCache.rows, req.query);
    const limit = Number(req.query.limit || 3000);

    return res.json({
      ok: true,
      source: ticketCache.source,
      message: ticketCache.message,
      syncedAt: ticketCache.syncedAt,
      total: filteredRows.length,
      analytics: buildTicketAnalytics(filteredRows),
      filters: buildFilterOptions(ticketCache.rows),
      rows: filteredRows.slice(0, limit),
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error.message || "Ticket report failed",
    });
  }
}