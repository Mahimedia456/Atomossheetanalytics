import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_PREFIX = "atomos_report_cache_v1";
const DEFAULT_MAX_AGE_MS =
  24 * 60 * 60 * 1000;

type CachedEnvelope<T> = {
  value: T;
  savedAt: string;
};

export type CacheMetadata = {
  fromCache?: boolean;
  cacheSavedAt?: string;
  cacheStale?: boolean;
};

function stableObject(
  input: Record<
    string,
    string | number | undefined
  >,
) {
  return Object.keys(input)
    .sort()
    .reduce(
      (result, key) => {
        const value =
          input[key];

        if (
          value !== undefined &&
          value !== null &&
          String(value).trim() !== ""
        ) {
          result[key] =
            value;
        }

        return result;
      },
      {} as Record<
        string,
        string | number
      >,
    );
}

export function makeReportCacheKey(
  module: string,
  filters: Record<
    string,
    string | number | undefined
  > = {},
) {
  return `${CACHE_PREFIX}:${module}:${JSON.stringify(
    stableObject(filters),
  )}`;
}

export async function writeReportCache<T>(
  key: string,
  value: T,
) {
  const envelope: CachedEnvelope<T> = {
    value,
    savedAt:
      new Date().toISOString(),
  };

  await AsyncStorage.setItem(
    key,
    JSON.stringify(envelope),
  );
}

export async function readReportCache<T>(
  key: string,
) {
  const raw =
    await AsyncStorage.getItem(
      key,
    );

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(
      raw,
    ) as CachedEnvelope<T>;
  } catch {
    await AsyncStorage.removeItem(
      key,
    ).catch(() => {});

    return null;
  }
}

export async function withReportCache<
  T extends Record<
    string,
    unknown
  >,
>(
  key: string,
  request: () => Promise<T>,
  options: {
    maxAgeMs?: number;
  } = {},
) {
  try {
    const fresh =
      await request();

    await writeReportCache(
      key,
      fresh,
    ).catch(() => {});

    return {
      ...fresh,
      fromCache: false,
      cacheSavedAt:
        new Date().toISOString(),
      cacheStale: false,
    } as T & CacheMetadata;
  } catch (error) {
    const cached =
      await readReportCache<T>(
        key,
      );

    if (!cached) {
      throw error;
    }

    const age =
      Date.now() -
      new Date(
        cached.savedAt,
      ).getTime();

    const maxAge =
      options.maxAgeMs ??
      DEFAULT_MAX_AGE_MS;

    return {
      ...cached.value,
      fromCache: true,
      cacheSavedAt:
        cached.savedAt,
      cacheStale:
        !Number.isFinite(age) ||
        age > maxAge,
    } as T & CacheMetadata;
  }
}

export async function clearReportCache() {
  const keys =
    await AsyncStorage.getAllKeys();

  const reportKeys =
    keys.filter(
      (key) =>
        key.startsWith(
          CACHE_PREFIX,
        ),
    );

  if (
    reportKeys.length
  ) {
    await AsyncStorage.multiRemove(
      reportKeys,
    );
  }
}
