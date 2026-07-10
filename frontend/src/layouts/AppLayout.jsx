import { LogOut, Menu, X } from "lucide-react";
import { useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import AtomosLogo from "../components/AtomosLogo";
import { useAuth } from "../context/AuthContext";

const defaultPages = [
  { title: "Home", path: "/", permission: "dashboard:view" },
  { title: "Tickets", path: "/reports/tickets", permission: "tickets:view" },
  {
    title: "Satisfaction",
    path: "/reports/satisfaction",
    permission: "satisfaction:view",
  },
  { title: "Global RMA", path: "/reports/rma", permission: "rma:view" },
  { title: "Agents", path: "/reports/agents", permission: "agents:view" },
  {
    title: "Rush RMA",
    path: "/reports/rush-rma",
    permission: "rush-rma:view",
  },
  { title: "Social", path: "/reports/social", permission: "social:view" },
];

export default function AppLayout({ pages = defaultPages }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { logout: authLogout, hasPermission } = useAuth();

  const visiblePages = useMemo(() => {
    return (pages || []).filter((page) => {
      if (page.permission && !hasPermission(page.permission)) return false;
      return true;
    });
  }, [pages, hasPermission]);

  function logout() {
    authLogout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-black text-white">
      <div className="pointer-events-none fixed inset-0 atomos-grid-bg opacity-20" />
      <div className="pointer-events-none fixed inset-0 atomos-glow opacity-80" />

      <header className="sticky top-0 z-50 border-b border-[#00dcc5]/20 bg-black/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-5 px-5 py-4">
          <NavLink to="/" className="flex items-center gap-4">
            <AtomosLogo className="h-8 w-[169px] text-white" />

            <div className="hidden border-l border-zinc-800 pl-4 xl:block">
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
            onClick={() => setOpen((value) => !value)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 text-white lg:hidden"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>

          <nav className="hidden items-center gap-2 lg:flex">
            {visiblePages.map((page) => (
              <NavLink
                key={page.path}
                to={page.path}
                end={page.path === "/"}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.08em] transition ${
                    isActive
                      ? "bg-[#00dcc5] text-black"
                      : "border border-zinc-800 bg-black text-zinc-300 hover:border-[#00dcc5]/70 hover:text-[#00dcc5]"
                  }`
                }
              >
                {page.title}
              </NavLink>
            ))}

            <button
              type="button"
              onClick={logout}
              className="ml-2 inline-flex items-center gap-2 rounded-full border border-zinc-800 px-4 py-2 text-xs font-black uppercase tracking-[0.08em] text-zinc-400 transition hover:border-red-500/60 hover:text-red-300"
            >
              <LogOut size={14} />
              Logout
            </button>
          </nav>
        </div>

        {open ? (
          <nav className="border-t border-zinc-900 bg-black px-5 py-4 lg:hidden">
            <div className="grid gap-2">
              {visiblePages.map((page) => (
                <NavLink
                  key={page.path}
                  to={page.path}
                  end={page.path === "/"}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `rounded-2xl px-4 py-3 text-sm font-bold ${
                      isActive
                        ? "bg-[#00dcc5] text-black"
                        : "border border-zinc-800 bg-black text-zinc-300"
                    }`
                  }
                >
                  {page.title}
                </NavLink>
              ))}

              <button
                type="button"
                onClick={logout}
                className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-left text-sm font-bold text-red-200"
              >
                Logout
              </button>
            </div>
          </nav>
        ) : null}
      </header>

      <main className="relative z-10 mx-auto w-full max-w-[1600px] px-5 py-6">
        <Outlet />
      </main>
    </div>
  );
}