import {
  CheckCircle2,
  Loader2,
  LogOut,
  Menu,
  RefreshCcw,
  TriangleAlert,
  X,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import AtomosLogo from "../components/AtomosLogo";
import { useAuth } from "../context/AuthContext";
import useDashboardAutoSync from "../hooks/useDashboardAutoSync";

const defaultPages = [
  {
    title: "Home",
    path: "/",
    adminOnly: true,
  },
  {
    title: "Tickets",
    path: "/reports/tickets",
  },
  {
    title: "Global RMA",
    path: "/reports/rma",
  },
  {
    title: "Rush RMA",
    path: "/reports/rush-rma",
  },
  {
    title: "Satisfaction",
    path: "/reports/satisfaction",
  },
  {
    title: "Agent Performance",
    path: "/reports/agents",
    adminOnly: true,
  },
  {
    title: "Social",
    path: "/reports/social",
  },
];

function normalizeRole(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isAdminRole(user) {
  const role = normalizeRole(
    user?.role,
  );

  return [
    "admin",
    "owner",
    "super_admin",
    "super-admin",
  ].includes(role);
}

function NavigationItem({
  page,
  mobile = false,
  onClick,
}) {
  return (
    <NavLink
      to={page.path}
      end={page.path === "/"}
      onClick={onClick}
      className={({ isActive }) => {
        if (mobile) {
          return [
            "rounded-2xl px-4 py-3 text-sm font-bold transition",
            isActive
              ? "bg-[#00dcc5] text-black"
              : "border border-zinc-800 bg-black text-zinc-300 hover:border-[#00dcc5]/70 hover:text-[#00dcc5]",
          ].join(" ");
        }

        return [
          "whitespace-nowrap rounded-full px-3 py-2 text-[11px] font-black uppercase tracking-[0.06em] transition 2xl:px-4 2xl:text-xs",
          isActive
            ? "bg-[#00dcc5] text-black"
            : "border border-zinc-800 bg-black text-zinc-300 hover:border-[#00dcc5]/70 hover:text-[#00dcc5]",
        ].join(" ");
      }}
    >
      {page.title}
    </NavLink>
  );
}

function formatSyncSummary(result) {
  if (!result?.modules) {
    return "";
  }

  return Object.values(
    result.modules,
  )
    .filter(
      (module) =>
        module.ok &&
        module.count !== null,
    )
    .map(
      (module) =>
        `${module.label}: ${Number(
          module.count,
        ).toLocaleString()}`,
    )
    .join(", ");
}

function AutoSyncStatus({
  syncing,
  result,
  error,
  onSync,
}) {
  const failedModules =
    Object.values(
      result?.modules || {},
    ).filter(
      (module) => !module.ok,
    );

  const summary =
    formatSyncSummary(result);

  return (
    <div className="border-b border-zinc-900 bg-zinc-950/95">
      <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-5">
        <div className="flex min-w-0 items-center gap-2 text-xs font-bold">
          {syncing ? (
            <>
              <Loader2
                size={14}
                className="shrink-0 animate-spin text-[#00dcc5]"
              />

              <span className="text-zinc-300">
                Syncing all dashboard modules...
              </span>
            </>
          ) : error ? (
            <>
              <TriangleAlert
                size={14}
                className="shrink-0 text-red-400"
              />

              <span className="truncate text-red-200">
                {error}
              </span>
            </>
          ) : failedModules.length ? (
            <>
              <TriangleAlert
                size={14}
                className="shrink-0 text-amber-400"
              />

              <span className="text-amber-200">
                Auto sync completed with{" "}
                {failedModules.length} module
                {failedModules.length === 1
                  ? ""
                  : "s"}{" "}
                failed.
              </span>
            </>
          ) : result ? (
            <>
              <CheckCircle2
                size={14}
                className="shrink-0 text-[#00dcc5]"
              />

              <span className="truncate text-zinc-300">
                Auto sync completed.
                {summary
                  ? ` ${summary}`
                  : ""}
              </span>
            </>
          ) : (
            <span className="text-zinc-500">
              Dashboard auto sync ready.
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onSync}
          disabled={syncing}
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-zinc-800 bg-black px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-zinc-400 transition hover:border-[#00dcc5] hover:text-[#00dcc5] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCcw
            size={12}
            className={
              syncing
                ? "animate-spin"
                : ""
            }
          />

          Sync all
        </button>
      </div>
    </div>
  );
}

export default function AppLayout({
  pages = defaultPages,
}) {
  const [open, setOpen] =
    useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const {
    user,
    logout: authLogout,
  } = useAuth();

  const adminUser =
    isAdminRole(user);

  const {
    syncing,
    initializing,
    result,
    error,
    forceSync,
  } = useDashboardAutoSync({
    routeKey:
      location.pathname,
  });

  const sourcePages =
    Array.isArray(pages) &&
    pages.length
      ? pages
      : defaultPages;

  const visiblePages =
    useMemo(
      () =>
        sourcePages.filter(
          (page) =>
            !page.adminOnly ||
            adminUser,
        ),
      [
        sourcePages,
        adminUser,
      ],
    );

  const dashboardHomePath =
    adminUser
      ? "/"
      : "/reports/tickets";

  function logout() {
    setOpen(false);
    authLogout();

    navigate("/login", {
      replace: true,
    });
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-black text-white">
      <div className="pointer-events-none fixed inset-0 atomos-grid-bg opacity-20" />
      <div className="pointer-events-none fixed inset-0 atomos-glow opacity-80" />

      <header className="sticky top-0 z-50 border-b border-[#00dcc5]/20 bg-black/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-4 px-4 py-4 sm:px-5">
          <NavLink
            to={dashboardHomePath}
            className="flex min-w-0 items-center gap-4"
          >
            <AtomosLogo className="h-8 w-[150px] shrink-0 text-white 2xl:w-[169px]" />

            <div className="hidden border-l border-zinc-800 pl-4 2xl:block">
              <h1 className="text-sm font-black uppercase tracking-[0.18em] text-white">
                Analytics Workspace
              </h1>

              <p className="mt-1 text-xs font-medium text-zinc-500">
                Google Sheet reporting and RMA analytics
              </p>
            </div>
          </NavLink>

          <button
            type="button"
            onClick={() =>
              setOpen(
                (value) => !value,
              )
            }
            aria-label={
              open
                ? "Close navigation"
                : "Open navigation"
            }
            aria-expanded={open}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 text-white transition hover:border-[#00dcc5] hover:text-[#00dcc5] xl:hidden"
          >
            {open ? (
              <X size={20} />
            ) : (
              <Menu size={20} />
            )}
          </button>

          <nav className="hidden min-w-0 items-center gap-1.5 xl:flex 2xl:gap-2">
            {visiblePages.map(
              (page) => (
                <NavigationItem
                  key={page.path}
                  page={page}
                />
              ),
            )}

            <button
              type="button"
              onClick={logout}
              className="ml-1 inline-flex shrink-0 items-center gap-2 rounded-full border border-zinc-800 px-3 py-2 text-[11px] font-black uppercase tracking-[0.06em] text-zinc-400 transition hover:border-red-500/60 hover:text-red-300 2xl:ml-2 2xl:px-4 2xl:text-xs"
            >
              <LogOut size={14} />
              Logout
            </button>
          </nav>
        </div>

        {open ? (
          <nav className="border-t border-zinc-900 bg-black px-5 py-4 xl:hidden">
            <div className="grid gap-2">
              {visiblePages.map(
                (page) => (
                  <NavigationItem
                    key={page.path}
                    page={page}
                    mobile
                    onClick={() =>
                      setOpen(false)
                    }
                  />
                ),
              )}

              <button
                type="button"
                onClick={logout}
                className="mt-1 inline-flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-left text-sm font-bold text-red-200"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </nav>
        ) : null}
      </header>

      <AutoSyncStatus
        syncing={syncing}
        result={result}
        error={error}
        onSync={forceSync}
      />

      <main className="relative z-10 mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-5">
        {initializing ? (
          <div className="flex min-h-[55vh] items-center justify-center">
            <div className="dashboard-card flex max-w-md flex-col items-center p-8 text-center">
              <Loader2
                size={34}
                className="animate-spin text-[#00dcc5]"
              />

              <h2 className="mt-5 text-xl font-black text-white">
                Syncing dashboard data
              </h2>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Tickets, Satisfaction, Global RMA,
                Rush RMA, Social and Agent Performance
                are being refreshed.
              </p>
            </div>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}