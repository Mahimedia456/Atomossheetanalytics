import {
  buildGlobalRmaAnalytics,
  buildGlobalRmaFilterOptions,
  fetchGlobalRmaSheetData,
  filterGlobalRmaRows,
} from "../services/globalRmaSheetService.js";

let globalRmaCache = {
  rows: [],
  tabs: {},
  sourceCounts: {
    USA: 0,
    EMEA: 0,
    total: 0,
  },
  syncedAt: null,
  source: "none",
  message: "",
};

let activeSyncPromise = null;

async function refreshGlobalRmaCache() {
  /*
   * Prevent multiple simultaneous Google Sheet requests.
   */
  if (activeSyncPromise) {
    return activeSyncPromise;
  }

  activeSyncPromise = (async () => {
    const result =
      await fetchGlobalRmaSheetData();

    globalRmaCache = {
      rows: result.rows || [],
      tabs: result.tabs || {},
      sourceCounts:
        result.sourceCounts || {
          USA: 0,
          EMEA: 0,
          total: 0,
        },
      syncedAt: new Date().toISOString(),
      source:
        result.source || "google_sheet",
      message: result.message || "",
    };

    return globalRmaCache;
  })();

  try {
    return await activeSyncPromise;
  } finally {
    activeSyncPromise = null;
  }
}

function getRequestedLimit(value) {
  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed <= 0
  ) {
    return 5000;
  }

  return Math.min(parsed, 30000);
}

export async function syncGlobalRmaSheet(
  req,
  res,
) {
  try {
    const cache =
      await refreshGlobalRmaCache();

    const analytics =
      buildGlobalRmaAnalytics(
        cache.rows,
      );

    return res.status(200).json({
      ok: true,

      message: cache.message,

      source: cache.source,
      tabs: cache.tabs,

      sourceCounts:
        cache.sourceCounts,

      totalSourceRows:
        cache.rows.length,

      analytics,

      syncedAt: cache.syncedAt,
    });
  } catch (error) {
    console.error(
      "Global RMA synchronization error:",
      error,
    );

    return res.status(500).json({
      ok: false,

      message:
        error?.message ||
        "Unable to synchronize Global RMA Google Sheet.",
    });
  }
}

export async function getGlobalRmaReport(
  req,
  res,
) {
  try {
    /*
     * Automatically sync after every server restart.
     */
    if (!globalRmaCache.syncedAt) {
      await refreshGlobalRmaCache();
    }

    const filteredRows =
      filterGlobalRmaRows(
        globalRmaCache.rows,
        req.query,
      );

    const limit = getRequestedLimit(
      req.query.limit,
    );

    return res.status(200).json({
      ok: true,

      source: globalRmaCache.source,
      message: globalRmaCache.message,

      tabs: globalRmaCache.tabs,

      sourceCounts:
        globalRmaCache.sourceCounts,

      syncedAt:
        globalRmaCache.syncedAt,

      totalSourceRows:
        globalRmaCache.rows.length,

      total: filteredRows.length,

      analytics:
        buildGlobalRmaAnalytics(
          filteredRows,
        ),

      /*
       * Filters are built from all merged rows,
       * not only the currently filtered rows.
       */
      filters:
        buildGlobalRmaFilterOptions(
          globalRmaCache.rows,
        ),

      rows: filteredRows.slice(0, limit),

      rowsLimited:
        filteredRows.length > limit,
    });
  } catch (error) {
    console.error(
      "Global RMA report error:",
      error,
    );

    return res.status(500).json({
      ok: false,

      message:
        error?.message ||
        "Unable to load Global RMA report.",
    });
  }
}

export async function getGlobalRmaFilterOptions(
  req,
  res,
) {
  try {
    if (!globalRmaCache.syncedAt) {
      await refreshGlobalRmaCache();
    }

    return res.status(200).json({
      ok: true,

      syncedAt:
        globalRmaCache.syncedAt,

      filters:
        buildGlobalRmaFilterOptions(
          globalRmaCache.rows,
        ),
    });
  } catch (error) {
    console.error(
      "Global RMA filters error:",
      error,
    );

    return res.status(500).json({
      ok: false,

      message:
        error?.message ||
        "Unable to load Global RMA filters.",
    });
  }
}

export async function getGlobalRmaStatus(
  req,
  res,
) {
  return res.status(200).json({
    ok: true,

    synced:
      Boolean(globalRmaCache.syncedAt),

    syncedAt:
      globalRmaCache.syncedAt,

    tabs: globalRmaCache.tabs,

    sourceCounts:
      globalRmaCache.sourceCounts,

    totalSourceRows:
      globalRmaCache.rows.length,
  });
}