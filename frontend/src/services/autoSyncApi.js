import {
  syncTickets,
} from "./ticketApi";

import {
  syncSatisfaction,
} from "./satisfactionApi";

import {
  syncGlobalRma,
} from "./globalrmaApi";

import {
  syncGlobalRma as syncRushRma,
} from "./rmaApi";

import {
  syncSocial,
} from "./socialApi";

import {
  syncAgents,
} from "./agentApi";

export const AUTO_SYNC_STORAGE_KEY =
  "atomos_dashboard_last_auto_sync";

export const AUTO_SYNC_RESULT_KEY =
  "atomos_dashboard_last_auto_sync_result";

export const AUTO_SYNC_COMPLETED_EVENT =
  "atomos:auto-sync-completed";

export const AUTO_SYNC_STARTED_EVENT =
  "atomos:auto-sync-started";

const DEFAULT_AUTO_SYNC_TTL =
  10 * 60 * 1000;

let activeSyncPromise = null;

function toFiniteNumber(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

function getFirstNumber(
  source,
  paths = [],
) {
  for (const path of paths) {
    const value = path
      .split(".")
      .reduce(
        (current, key) =>
          current?.[key],
        source,
      );

    const number =
      toFiniteNumber(value);

    if (number !== null) {
      return number;
    }
  }

  return null;
}

function getModuleCount(
  moduleName,
  response,
) {
  const commonPaths = [
    "total",
    "count",
    "totalRows",
    "totalSourceRows",
    "sourceCounts.total",
    "counts.total",
    "analytics.total",
    "analytics.totalRecords",
    "analytics.totalTickets",
    "analytics.totalResponses",
    "analytics.totalRma",
    "analytics.totalQueries",
  ];

  const modulePaths = {
    tickets: [
      "analytics.totalTickets",
      "tickets",
      ...commonPaths,
    ],

    satisfaction: [
      "analytics.totalResponses",
      "satisfaction",
      ...commonPaths,
    ],

    globalRma: [
      "analytics.totalRma",
      "sourceCounts.total",
      "globalRma",
      ...commonPaths,
    ],

    rushRma: [
      "analytics.totalRma",
      "rushRma",
      "rma",
      ...commonPaths,
    ],

    social: [
      "analytics.totalQueries",
      "analytics.totalRecords",
      "social",
      ...commonPaths,
    ],

    agents: [
      "analytics.totalTickets",
      "agents",
      ...commonPaths,
    ],
  };

  return getFirstNumber(
    response,
    modulePaths[moduleName] ||
      commonPaths,
  );
}

function normalizeError(error) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Sync failed."
  );
}

function saveSyncResult(result) {
  try {
    localStorage.setItem(
      AUTO_SYNC_STORAGE_KEY,
      String(result.syncedAtMs),
    );

    localStorage.setItem(
      AUTO_SYNC_RESULT_KEY,
      JSON.stringify(result),
    );
  } catch {
    // Storage can be unavailable in private/restricted mode.
  }
}

export function getLastAutoSyncResult() {
  try {
    const raw = localStorage.getItem(
      AUTO_SYNC_RESULT_KEY,
    );

    return raw
      ? JSON.parse(raw)
      : null;
  } catch {
    return null;
  }
}

export function getLastAutoSyncTime() {
  try {
    const value = Number(
      localStorage.getItem(
        AUTO_SYNC_STORAGE_KEY,
      ),
    );

    return Number.isFinite(value)
      ? value
      : 0;
  } catch {
    return 0;
  }
}

export function shouldRunAutoSync({
  force = false,
  ttlMs = DEFAULT_AUTO_SYNC_TTL,
} = {}) {
  if (force) {
    return true;
  }

  const lastSync =
    getLastAutoSyncTime();

  if (!lastSync) {
    return true;
  }

  return (
    Date.now() - lastSync >= ttlMs
  );
}

export async function syncAllDashboardModules({
  force = false,
  ttlMs = DEFAULT_AUTO_SYNC_TTL,
} = {}) {
  if (
    !shouldRunAutoSync({
      force,
      ttlMs,
    })
  ) {
    return {
      skipped: true,
      reason: "fresh",
      result:
        getLastAutoSyncResult(),
    };
  }

  if (activeSyncPromise) {
    return activeSyncPromise;
  }

  window.dispatchEvent(
    new CustomEvent(
      AUTO_SYNC_STARTED_EVENT,
    ),
  );

  activeSyncPromise = (async () => {
    const tasks = [
      {
        key: "tickets",
        label: "Tickets",
        sync: syncTickets,
      },
      {
        key: "satisfaction",
        label: "Satisfaction",
        sync: syncSatisfaction,
      },
      {
        key: "globalRma",
        label: "Global RMA",
        sync: syncGlobalRma,
      },
      {
        key: "rushRma",
        label: "Rush RMA",
        sync: syncRushRma,
      },
      {
        key: "social",
        label: "Social",
        sync: syncSocial,
      },
      {
        key: "agents",
        label: "Agent Performance",
        sync: syncAgents,
      },
    ];

    const settled =
      await Promise.allSettled(
        tasks.map((task) =>
          task.sync(),
        ),
      );

    const modules = {};

    settled.forEach(
      (entry, index) => {
        const task =
          tasks[index];

        if (
          entry.status ===
          "fulfilled"
        ) {
          modules[task.key] = {
            label: task.label,
            ok: true,
            count: getModuleCount(
              task.key,
              entry.value,
            ),
            response: entry.value,
          };

          return;
        }

        modules[task.key] = {
          label: task.label,
          ok: false,
          count: null,
          error: normalizeError(
            entry.reason,
          ),
        };
      },
    );

    const successful =
      Object.values(modules).filter(
        (module) => module.ok,
      ).length;

    const failed =
      Object.values(modules).length -
      successful;

    const result = {
      ok: failed === 0,
      partial: (
        successful > 0 &&
        failed > 0
      ),
      successful,
      failed,
      modules,
      syncedAt:
        new Date().toISOString(),
      syncedAtMs: Date.now(),
    };

    /*
     * Save the timestamp even after a partial success so broken
     * endpoints are not hammered on every route navigation.
     * Manual force sync remains available.
     */
    saveSyncResult(result);

    window.dispatchEvent(
      new CustomEvent(
        AUTO_SYNC_COMPLETED_EVENT,
        {
          detail: result,
        },
      ),
    );

    return {
      skipped: false,
      result,
    };
  })();

  try {
    return await activeSyncPromise;
  } finally {
    activeSyncPromise = null;
  }
}
