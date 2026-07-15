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

  const [syncing, setSyncing] =
    useState(false);

  const [initializing, setInitializing] =
    useState(true);

  const [result, setResult] =
    useState(
      getLastAutoSyncResult(),
    );

  const [error, setError] =
    useState("");

  const runSync = useCallback(
    async ({
      force = false,
      silent = false,
    } = {}) => {
      if (!silent) {
        setSyncing(true);
      }

      setError("");

      try {
        const response =
          await syncAllDashboardModules({
            force,
            ttlMs:
              AUTO_SYNC_TTL_MS,
          });

        if (
          mountedRef.current &&
          response?.result
        ) {
          setResult(
            response.result,
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
   * Force is enabled because the user may have edited the Google
   * Sheet since the previous browser session.
   */
  useEffect(() => {
    mountedRef.current = true;

    async function initialize() {
      try {
        await runSync({
          force: true,
        });
      } catch {
        // Dashboard opens even if one endpoint fails.
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
   * Force sync whenever pathname changes.
   *
   * Example:
   * Tickets -> Satisfaction -> Global RMA
   *
   * Each navigation refreshes backend sheet data before the new
   * report page loads its latest records.
   */
  useEffect(() => {
    if (
      !routeKey ||
      !initialSyncFinishedRef.current
    ) {
      return;
    }

    /*
     * Do not immediately repeat the initial sync for the route
     * on which AppLayout was first mounted.
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
   * Browser focus uses TTL-based smart sync rather than forcing
   * a complete refresh every time the window is clicked.
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

    forceSync: () =>
      runSync({
        force: true,
      }),
  };
}