import { LogOut, Menu, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Topbar() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-atomos-bg/90 px-5 py-4 backdrop-blur lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-atomos-cyan">
            <ShieldCheck className="h-4 w-4" />
            Secure Workspace
          </div>

          <h2 className="mt-1 text-xl font-black text-white">
            Atomos Analytics Dashboard
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-bold text-white">{user?.email}</p>
            <p className="text-xs capitalize text-slate-500">{user?.role}</p>
          </div>

          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-black px-4 py-3 text-xs font-black uppercase tracking-[0.08em] text-white hover:border-atomos-cyan"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}