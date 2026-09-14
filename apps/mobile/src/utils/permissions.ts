import type { AtomosUser } from "@/types/auth";

export type MobileModuleKey =
  | "tickets"
  | "globalRma"
  | "rushRma"
  | "satisfaction"
  | "social"
  | "agents";

const permissionAliases: Record<
  MobileModuleKey,
  string[]
> = {
  tickets: [
    "tickets:view",
    "ticket:view",
  ],
  globalRma: [
    "rma:view",
    "global-rma:view",
    "global_rma:view",
  ],
  rushRma: [
    "rma:view",
    "rush-rma:view",
    "rush_rma:view",
  ],
  satisfaction: [
    "satisfaction:view",
  ],
  social: [
    "social:view",
  ],
  agents: [
    "agents:view",
    "agent-performance:view",
    "agent_performance:view",
  ],
};

export function isAdmin(
  user: AtomosUser | null | undefined,
) {
  return (
    String(
      user?.role || "",
    ).toLowerCase() ===
    "admin"
  );
}

export function hasAnyPermission(
  user: AtomosUser | null | undefined,
  permissions: string[],
) {
  if (isAdmin(user)) {
    return true;
  }

  const granted =
    Array.isArray(
      user?.permissions,
    )
      ? user?.permissions || []
      : [];

  return permissions.some(
    (permission) =>
      granted.includes(
        permission,
      ),
  );
}

export function canAccessModule(
  user: AtomosUser | null | undefined,
  module: MobileModuleKey,
) {
  return hasAnyPermission(
    user,
    permissionAliases[module],
  );
}

export function getModulePermissionAliases(
  module: MobileModuleKey,
) {
  return permissionAliases[module];
}
