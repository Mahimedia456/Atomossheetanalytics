import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getLastAutoSyncResult,
  syncAllDashboardModules,
} from "../services/autoSyncApi";

const AUTO_SYNC_TTL_MS =
  10 * 60 * 1000;

export default function useDashboardAutoSync({
  routeKey = "",
} = {}) {
  const mountedRef =
    useRef(true);

  const initialRouteRef =
    useRef(routeKey);

  const initialSyncFinishedRef =
    useRef(false);

  const activeSyncRef =
    useRef(null);

  const [syncing, setSyncing] =
    useState(false);

  const [initializing, setInitializing] =
    useState(true);

  const [result, setResult] =
    useState(
      getLastAutoSyncResult(),
    );

  /*
   * Every successful dashboard sync increments this value.
   * AppLayout uses it to remount the active report page so the
   * page immediately fetches the newly synchronized backend cache.
   */
  const [syncVersion, setSyncVersion] =
    useState(0);

  const [error, setError] =
    useState("");

  const runSync = useCallback(
    async ({
      force = false,
      silent = false,
    } = {}) => {
      /*
       * Reuse an active request instead of firing the same complete
       * dashboard sync multiple times at once.
       */
      if (activeSyncRef.current) {
        return activeSyncRef.current;
      }

      if (!silent) {
        setSyncing(true);
      }

      setError("");

      const syncPromise =
        syncAllDashboardModules({
          force,
          ttlMs:
            AUTO_SYNC_TTL_MS,
        });

      activeSyncRef.current =
        syncPromise;

      try {
        const response =
          await syncPromise;

        if (
          mountedRef.current &&
          response?.result
        ) {
          setResult(
            response.result,
          );

          /*
           * This is the important fix:
           * notify AppLayout that fresh backend data is ready.
           */
          setSyncVersion(
            (current) =>
              current + 1,
          );
        }

        return response;
      } catch (requestError) {
        const message =
          requestError
            ?.response
            ?.data
            ?.message ||
          requestError?.message ||
          "Dashboard auto sync failed.";

        if (mountedRef.current) {
          setError(message);
        }

        throw requestError;
      } finally {
        activeSyncRef.current =
          null;

        if (
          mountedRef.current &&
          !silent
        ) {
          setSyncing(false);
        }
      }
    },
    [],
  );

  /*
   * Initial protected-layout sync.
   *
   * Outlet remains hidden until this request finishes, therefore the
   * first report request always reads the refreshed backend cache.
   */
  useEffect(() => {
    mountedRef.current = true;

    async function initialize() {
      try {
        await runSync({
          force: true,
        });
      } catch {
        /*
         * The dashboard still opens if one module fails.
         */
      } finally {
        if (mountedRef.current) {
          initialSyncFinishedRef.current =
            true;

          setInitializing(false);
        }
      }
    }

    initialize();

    return () => {
      mountedRef.current = false;
    };
  }, [runSync]);

  /*
   * Force sync whenever the protected route changes.
   *
   * The new report page can mount before this asynchronous sync ends.
   * syncVersion then remounts that page after the fresh backend cache
   * is available, removing the need for a browser hard refresh.
   */
  useEffect(() => {
    if (
      !routeKey ||
      !initialSyncFinishedRef.current
    ) {
      return;
    }

    /*
     * Do not immediately repeat the initial sync for the route where
     * AppLayout was first mounted.
     */
    if (
      initialRouteRef.current ===
      routeKey
    ) {
      initialRouteRef.current = "";

      return;
    }

    runSync({
      force: true,
      silent: true,
    }).catch(() => {});
  }, [routeKey, runSync]);

  /*
   * Browser focus uses TTL-based synchronization.
   */
  useEffect(() => {
    function handleFocus() {
      runSync({
        force: false,
        silent: true,
      }).catch(() => {});
    }

    window.addEventListener(
      "focus",
      handleFocus,
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleFocus,
      );
    };
  }, [runSync]);

  return {
    syncing,
    initializing,
    result,
    error,
    syncVersion,

    forceSync: () =>
      runSync({
        force: true,
      }),
  };
}
