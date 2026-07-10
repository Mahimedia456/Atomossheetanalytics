import { NavLink } from "react-router-dom";
import {
  BarChart3,
  Gauge,
  Headphones,
  LayoutDashboard,
  Shield,
  SmilePlus,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

const navItems = [
  {
    label: "Home",
    path: "/",
    icon: LayoutDashboard,
    permission: "dashboard:view",
  },
  {
    label: "Ticket Analytics",
    path: "/reports/tickets",
    icon: BarChart3,
    permission: "tickets:view",
  },
  {
    label: "Satisfaction",
    path: "/reports/satisfaction",
    icon: SmilePlus,
    permission: "satisfaction:view",
  },
  {
    label: "Global RMA",
    path: "/reports/rma",
    icon: TrendingUp,
    permission: "rma:view",
  },
  {
    label: "Agent Performance",
    path: "/reports/agents",
    icon: Headphones,
    permission: "agents:view",
  },
  {
    label: "Rush RMA",
    path: "/reports/rush-rma",
    icon: Zap,
    permission: "rush-rma:view",
  },
  {
    label: "Admin",
    path: "/admin",
    icon: Users,
    permission: "admin:view",
  },
];

export default function Sidebar() {
  const { user, hasPermission } = useAuth();

  const visibleItems = navItems.filter((item) =>
    hasPermission(item.permission)
  );

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-slate-800 bg-[#050b14] lg:block">
      <div className="flex h-full flex-col">
        <div className="border-b border-slate-800 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-atomos-cyan text-black">
              <Gauge className="h-7 w-7" />
            </div>

            <div>
              <h1 className="text-lg font-black leading-tight">Atomos</h1>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-atomos-cyan">
                Zendesk Analytics
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto p-4">
          {visibleItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition",
                    isActive
                      ? "bg-atomos-cyan text-black"
                      : "text-slate-400 hover:bg-white/[0.04] hover:text-white",
                  ].join(" ")
                }
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-4">
          <div className="rounded-2xl border border-slate-800 bg-black p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-atomos-cyan/10 text-atomos-cyan">
                <Shield className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-black">{user?.name}</p>
                <p className="text-xs capitalize text-slate-500">
                  {user?.role}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}