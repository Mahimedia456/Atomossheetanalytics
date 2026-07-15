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

  const firstRunRef =
    useRef(true);

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
   * Initial protected-layout sync:
   * wait for completion before rendering report pages so their
   * first GET request reads the refreshed backend cache.
   */
  useEffect(() => {
    mountedRef.current = true;

    async function initialize() {
      try {
        await runSync();
      } catch {
        // The dashboard still opens when one sync endpoint fails.
      } finally {
        if (mountedRef.current) {
          setInitializing(false);
          firstRunRef.current =
            false;
        }
      }
    }

    initialize();

    return () => {
      mountedRef.current = false;
    };
  }, [runSync]);

  /*
   * AppLayout remains mounted during navigation. On route changes,
   * smart sync runs only when the saved timestamp is older than
   * the TTL. It does not sync on every click.
   */
  useEffect(() => {
    if (
      firstRunRef.current ||
      !routeKey
    ) {
      return;
    }

    runSync({
      silent: true,
    }).catch(() => {});
  }, [routeKey, runSync]);

  /*
   * Refresh stale data when the user returns to the browser tab.
   */
  useEffect(() => {
    function handleFocus() {
      runSync({
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
