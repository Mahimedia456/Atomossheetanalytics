import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, Loader2 } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";

import AtomosLogo from "../../components/AtomosLogo";
import { useAuth } from "../../context/AuthContext";

const accounts = [
  { label: "Admin", email: "admin@atomos.com", password: "admin123" },
  { label: "Viewer", email: "viewer@atomos.com", password: "viewer123" },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState("admin@atomos.com");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login({
        email: email.trim(),
        password,
      });

      navigate("/", { replace: true });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Invalid email or password."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-6 text-white">
      <div className="pointer-events-none absolute inset-0 atomos-grid-bg opacity-20" />
      <div className="pointer-events-none absolute inset-0 atomos-glow" />

      <section className="relative z-10 w-full max-w-[460px] rounded-[26px] border border-zinc-800 bg-[#050505]/95 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.7)] sm:p-6">
        <div className="flex justify-center">
          <AtomosLogo className="h-8 w-[170px] text-white" />
        </div>

        <div className="mt-5 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#00dcc5]">
            Analytics Workspace
          </p>

          <h1 className="mt-3 text-2xl font-black tracking-[-0.04em] text-white">
            Sign in to continue
          </h1>

          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Ticket, RMA and satisfaction dashboards.
          </p>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-bold text-red-200">
            {error}
          </div>
        ) : null}

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
              Email Address
            </label>

            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-zinc-500"
                size={18}
              />

              <input
                className="h-[54px] w-full rounded-[18px] border border-zinc-800 bg-black pl-12 pr-4 text-sm font-medium text-white outline-none transition placeholder:text-zinc-600 focus:border-[#00dcc5] focus:ring-4 focus:ring-[#00dcc5]/10"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
                placeholder="name@mahimediasolutions.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
              Password
            </label>

            <div className="relative">
              <LockKeyhole
                className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-zinc-500"
                size={18}
              />

              <input
                className="h-[54px] w-full rounded-[18px] border border-zinc-800 bg-black pl-12 pr-12 text-sm font-medium text-white outline-none transition placeholder:text-zinc-600 focus:border-[#00dcc5] focus:ring-4 focus:ring-[#00dcc5]/10"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
                placeholder="Enter password"
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-zinc-900 hover:text-white"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            disabled={submitting}
            className="flex h-[56px] w-full items-center justify-center gap-2 rounded-[22px] bg-[#00dcc5] text-sm font-black text-black transition hover:shadow-[0_0_28px_rgba(0,220,197,0.24)] disabled:opacity-60"
            type="submit"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : null}
            {submitting ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div className="mt-5 grid grid-cols-2 gap-2">
          {accounts.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => {
                setEmail(account.email);
                setPassword(account.password);
                setError("");
              }}
              className="min-w-0 rounded-[16px] border border-zinc-800 bg-black p-3 text-left transition hover:border-[#00dcc5]/70 hover:bg-[#00dcc5]/10"
            >
              <p className="text-sm font-black text-white">{account.label}</p>
              <p className="mt-1 truncate text-[11px] text-zinc-500">
                {account.email}
              </p>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}