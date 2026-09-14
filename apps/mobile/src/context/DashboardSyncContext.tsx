import * as SecureStore from "expo-secure-store";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useAuth,
} from "@/context/AuthContext";
import {
  syncGlobalRma,
} from "@/services/globalRmaApi";
import {
  syncRushRma,
} from "@/services/rushRmaApi";
import {
  syncSatisfaction,
} from "@/services/satisfactionApi";
import {
  syncSocial,
} from "@/services/socialApi";
import {
  syncTickets,
} from "@/services/ticketApi";
import {
  canAccessModule,
  MobileModuleKey,
} from "@/utils/permissions";

const LAST_SYNC_KEY =
  "atomos_mobile_last_full_sync";

type SyncStatus =
  | "idle"
  | "syncing"
  | "success"
  | "error";

export type SyncModuleResult = {
  module: MobileModuleKey;
  ok: boolean;
  message?: string;
};

type DashboardSyncValue = {
  status: SyncStatus;
  syncing: boolean;
  lastSyncedAt: string | null;
  syncVersion: number;
  lastResults: SyncModuleResult[];
  syncAll: (
    options?: {
      automatic?: boolean;
    },
  ) => Promise<SyncModuleResult[]>;
};

const DashboardSyncContext =
  createContext<DashboardSyncValue | null>(
    null,
  );

const syncers: Array<{
  module: MobileModuleKey;
  run: () => Promise<unknown>;
}> = [
  {
    module: "tickets",
    run: syncTickets,
  },
  {
    module: "globalRma",
    run: syncGlobalRma,
  },
  {
    module: "rushRma",
    run: syncRushRma,
  },
  {
    module: "satisfaction",
    run: syncSatisfaction,
  },
  {
    module: "social",
    run: syncSocial,
  },
];

export function DashboardSyncProvider({
  children,
}: PropsWithChildren) {
  const {
    user,
    isAuthenticated,
  } =
    useAuth();

  const [
    status,
    setStatus,
  ] =
    useState<SyncStatus>(
      "idle",
    );

  const [
    lastSyncedAt,
    setLastSyncedAt,
  ] =
    useState<string | null>(
      null,
    );

  const [
    syncVersion,
    setSyncVersion,
  ] =
    useState(0);

  const [
    lastResults,
    setLastResults,
  ] =
    useState<SyncModuleResult[]>(
      [],
    );

  const activePromise =
    useRef<
      Promise<
        SyncModuleResult[]
      > | null
    >(null);

  const autoSyncKey =
    useRef<string | null>(
      null,
    );

  useEffect(() => {
    SecureStore.getItemAsync(
      LAST_SYNC_KEY,
    )
      .then((value) => {
        if (value) {
          setLastSyncedAt(
            value,
          );
        }
      })
      .catch(() => {});
  }, []);

  const syncAll =
    useCallback(
      async (
        options: {
          automatic?: boolean;
        } = {},
      ) => {
        if (
          !isAuthenticated ||
          !user
        ) {
          return [];
        }

        if (
          activePromise.current
        ) {
          return activePromise.current;
        }

        const work =
          (async () => {
            setStatus(
              "syncing",
            );

            const permitted =
              syncers.filter(
                (item) =>
                  canAccessModule(
                    user,
                    item.module,
                  ),
              );

            const settled =
              await Promise.allSettled(
                permitted.map(
                  (item) =>
                    item.run(),
                ),
              );

            const results =
              settled.map(
                (
                  result,
                  index,
                ) => {
                  const module =
                    permitted[
                      index
                    ].module;

                  if (
                    result.status ===
                    "fulfilled"
                  ) {
                    return {
                      module,
                      ok: true,
                    } satisfies SyncModuleResult;
                  }

                  const reason =
                    result.reason as any;

                  return {
                    module,
                    ok: false,
                    message:
                      reason
                        ?.response
                        ?.data
                        ?.message ||
                      reason
                        ?.message ||
                      "Sync failed",
                  } satisfies SyncModuleResult;
                },
              );

            setLastResults(
              results,
            );

            const successful =
              results.some(
                (result) =>
                  result.ok,
              );

            if (
              successful
            ) {
              const now =
                new Date().toISOString();

              setLastSyncedAt(
                now,
              );

              setSyncVersion(
                (value) =>
                  value + 1,
              );

              await SecureStore.setItemAsync(
                LAST_SYNC_KEY,
                now,
              ).catch(
                () => {},
              );
            }

            const allGood =
              results.length >
                0 &&
              results.every(
                (result) =>
                  result.ok,
              );

            setStatus(
              allGood
                ? "success"
                : successful
                  ? "success"
                  : "error",
            );

            if (
              options.automatic &&
              results.length ===
                0
            ) {
              setStatus(
                "idle",
              );
            }

            return results;
          })();

        activePromise.current =
          work;

        try {
          return await work;
        } finally {
          activePromise.current =
            null;
        }
      },
      [
        isAuthenticated,
        user,
      ],
    );

  useEffect(() => {
    if (
      !isAuthenticated ||
      !user
    ) {
      autoSyncKey.current =
        null;
      setLastResults([]);
      setStatus("idle");
      return;
    }

    const key =
      String(
        user.id ||
          user.email ||
          "session",
      );

    if (
      autoSyncKey.current ===
      key
    ) {
      return;
    }

    autoSyncKey.current =
      key;

    syncAll({
      automatic: true,
    }).catch(() => {});
  }, [
    isAuthenticated,
    user,
    syncAll,
  ]);

  const value =
    useMemo<DashboardSyncValue>(
      () => ({
        status,
        syncing:
          status ===
          "syncing",
        lastSyncedAt,
        syncVersion,
        lastResults,
        syncAll,
      }),
      [
        status,
        lastSyncedAt,
        syncVersion,
        lastResults,
        syncAll,
      ],
    );

  return (
    <DashboardSyncContext.Provider
      value={value}
    >
      {children}
    </DashboardSyncContext.Provider>
  );
}

export function useDashboardSync() {
  const value =
    useContext(
      DashboardSyncContext,
    );

  if (!value) {
    throw new Error(
      "useDashboardSync must be used inside DashboardSyncProvider",
    );
  }

  return value;
}
