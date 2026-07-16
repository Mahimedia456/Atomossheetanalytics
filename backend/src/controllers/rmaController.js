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

export async function syncGlobalRma(
  req,
  res,
) {
  try {
    const result =
      await fetchGlobalRmaSheetData();

    rmaCache = {
      rows: result.rows || [],
      syncedAt:
        new Date().toISOString(),
      source: result.source,
      message: result.message,
    };

    return res.json({
      ok: true,
      message:
        result.message,
      source:
        rmaCache.source,
      total:
        rmaCache.rows.length,
      syncedAt:
        rmaCache.syncedAt,
    });
  } catch (error) {
    console.error(
      "Global RMA sync error:",
      error,
    );

    return res
      .status(500)
      .json({
        ok: false,
        message:
          error.message ||
          "Global RMA sync failed",
      });
  }
}

export async function getGlobalRmaReport(
  req,
  res,
) {
  try {
    const filteredRows =
      filterRmaRows(
        rmaCache.rows,
        req.query,
      );

    const limit = Number(
      req.query.limit || 5000,
    );

    return res.json({
      ok: true,
      source:
        rmaCache.source,
      message:
        rmaCache.message,
      syncedAt:
        rmaCache.syncedAt,
      total:
        filteredRows.length,
      analytics:
        buildRmaAnalytics(
          filteredRows,
        ),
      filters:
        buildRmaFilterOptions(
          rmaCache.rows,
        ),
      rows:
        filteredRows.slice(
          0,
          limit,
        ),
    });
  } catch (error) {
    return res
      .status(500)
      .json({
        ok: false,
        message:
          error.message ||
          "Global RMA report failed",
      });
  }
}