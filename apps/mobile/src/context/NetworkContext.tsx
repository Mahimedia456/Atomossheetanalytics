import * as Network from "expo-network";
import {
  AppState,
  AppStateStatus,
} from "react-native";
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

type NetworkValue = {
  isConnected: boolean | null;
  isInternetReachable:
    | boolean
    | null;
  checkedAt: string | null;
  refreshNetworkState: () => Promise<void>;
};

const NetworkContext =
  createContext<NetworkValue | null>(
    null,
  );

export function NetworkProvider({
  children,
}: PropsWithChildren) {
  const [
    isConnected,
    setIsConnected,
  ] =
    useState<boolean | null>(
      null,
    );

  const [
    isInternetReachable,
    setIsInternetReachable,
  ] =
    useState<boolean | null>(
      null,
    );

  const [
    checkedAt,
    setCheckedAt,
  ] =
    useState<string | null>(
      null,
    );

  const active =
    useRef(true);

  const refreshNetworkState =
    useCallback(
      async () => {
        try {
          const state =
            await Network.getNetworkStateAsync();

          if (!active.current) {
            return;
          }

          setIsConnected(
            state.isConnected ??
              null,
          );

          setIsInternetReachable(
            state.isInternetReachable ??
              null,
          );

          setCheckedAt(
            new Date().toISOString(),
          );
        } catch {
          if (!active.current) {
            return;
          }

          setIsConnected(null);
          setIsInternetReachable(
            null,
          );
        }
      },
      [],
    );

  useEffect(() => {
    active.current = true;

    refreshNetworkState();

    const timer =
      setInterval(
        refreshNetworkState,
        15000,
      );

    const subscription =
      AppState.addEventListener(
        "change",
        (
          state: AppStateStatus,
        ) => {
          if (
            state ===
            "active"
          ) {
            refreshNetworkState();
          }
        },
      );

    return () => {
      active.current = false;
      clearInterval(timer);
      subscription.remove();
    };
  }, [
    refreshNetworkState,
  ]);

  const value =
    useMemo<NetworkValue>(
      () => ({
        isConnected,
        isInternetReachable,
        checkedAt,
        refreshNetworkState,
      }),
      [
        isConnected,
        isInternetReachable,
        checkedAt,
        refreshNetworkState,
      ],
    );

  return (
    <NetworkContext.Provider
      value={value}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetworkStatus() {
  const value =
    useContext(
      NetworkContext,
    );

  if (!value) {
    throw new Error(
      "useNetworkStatus must be used inside NetworkProvider",
    );
  }

  return value;
}
