import {
  useEffect,
  useState,
} from "react";

import {
  BarChart3,
  Headphones,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  SmilePlus,
  TrendingUp,
  Zap,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

import {
  AUTO_SYNC_COMPLETED_EVENT,
  AUTO_SYNC_STARTED_EVENT,
  clearAutoSyncResult,
  getLastAutoSyncResult,
  syncAllDashboardModules,
} from "../../services/autoSyncApi";

const modules = [
  {
    title: "Ticket Analytics",
    desc: "Ticket volume, product, category, region and TSE agent insights.",
    icon: BarChart3,
  },
  {
    title: "Satisfaction",
    desc: "Customer satisfaction reporting, ratings and customer feedback analytics.",
    icon: SmilePlus,
  },
  {
    title: "Global RMA",
    desc: "Global USA and EMEA RMA reporting, products, faults and stock movement analytics.",
    icon: TrendingUp,
  },
  // {
  //   title: "Agent Performance",
  //   desc: "TSE and agent-wise ticket handling, activity and performance analytics.",
  //   icon: Headphones,
  // },
  {
    title: "Rush RMA",
    desc: "Rush RMA reporting and operational analytics for USA and EMEA.",
    icon: Zap,
  },
  {
    title: "Social",
    desc: "Social posts, customer queries, responses and resolve status analytics.",
    icon: MessageCircle,
  },
];

function formatSyncMessage(
  result,
  prefix = "Auto sync completed.",
) {
  if (!result?.modules) {
    return "";
  }

  const completed = Object.values(
    result.modules,
  )
    .filter(
      (module) => module.ok,
    )
    .map((module) => {
      if (module.count === null) {
        return module.label;
      }

      return `${module.label}: ${Number(
        module.count,
      ).toLocaleString()}`;
    });

  const failed = Object.values(
    result.modules,
  )
    .filter(
      (module) => !module.ok,
    )
    .map(
      (module) =>
        module.label,
    );

  return [
    prefix,
    completed.join(", "),
    failed.length
      ? `Failed: ${failed.join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export default function HomePage() {
  const { user } = useAuth();

  const [syncing, setSyncing] =
    useState(false);

  const [message, setMessage] =
    useState(() =>
      formatSyncMessage(
        getLastAutoSyncResult(),
      ),
    );

  async function runAllSync() {
    setSyncing(true);
    setMessage("");

    try {
      const response =
        await syncAllDashboardModules({
          force: true,
        });

      setMessage(
        formatSyncMessage(
          response?.result,
          "Sync completed.",
        ),
      );
    } catch (error) {
      setMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Sync failed.",
      );
    } finally {
      setSyncing(false);
    }
  }

  function handleUnsync() {
    clearAutoSyncResult();

    setMessage(
      "Saved sync status was removed from this browser. Backend data remains unchanged.",
    );
  }

  /*
   * Keep Home status synchronized with AppLayout's central sync.
   */
  useEffect(() => {
    function handleSyncStarted() {
      setSyncing(true);
    }

    function handleSyncCompleted(
      event,
    ) {
      setSyncing(false);

      setMessage(
        formatSyncMessage(
          event.detail,
        ),
      );
    }

    window.addEventListener(
      AUTO_SYNC_STARTED_EVENT,
      handleSyncStarted,
    );

    window.addEventListener(
      AUTO_SYNC_COMPLETED_EVENT,
      handleSyncCompleted,
    );

    return () => {
      window.removeEventListener(
        AUTO_SYNC_STARTED_EVENT,
        handleSyncStarted,
      );

      window.removeEventListener(
        AUTO_SYNC_COMPLETED_EVENT,
        handleSyncCompleted,
      );
    };
  }, []);

  return (
    <div className="space-y-8">
      <section className="dashboard-card overflow-hidden bg-black">
        <div className="grid gap-8 p-8 lg:grid-cols-[1fr_520px] lg:p-10">
          <div className="flex flex-col justify-center">
            <div className="mb-7 inline-flex w-fit items-center gap-2 rounded-full border border-[#00dcc5]/40 bg-[#00dcc5]/10 px-5 py-3 text-xs font-black uppercase tracking-[0.22em] text-[#00dcc5]">
              <ShieldCheck className="h-4 w-4" />
              Atomos Analytics Workspace
            </div>

            <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">
              Welcome,{" "}
              {user?.name ||
                user?.full_name ||
                "Admin"}
            </h1>


            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={runAllSync}
                disabled={syncing}
                className="btn btn-primary inline-flex items-center justify-center gap-2"
              >
                <RefreshCw
                  size={16}
                  className={
                    syncing
                      ? "animate-spin"
                      : ""
                  }
                />

                {syncing
                  ? "Syncing..."
                  : "Sync All Data"}
              </button>

              <button
                type="button"
                onClick={handleUnsync}
                disabled={syncing}
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-2 text-sm font-black text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Unsync
              </button>
            </div>

            {message ? (
              <p className="mt-5 max-w-3xl text-sm font-bold leading-6 text-[#00dcc5]">
                {message}
              </p>
            ) : null}
          </div>

          <div className="relative overflow-hidden rounded-[28px] border border-zinc-800 bg-black p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(0,220,197,0.11),transparent_55%)]" />

            <div className="relative z-10 flex min-h-[370px] flex-col">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-zinc-500">
                Presented By
              </p>

              <div className="flex flex-1 items-center justify-center">
                <img
                  src="/mahi.logo.webp"
                  alt="Mahimedia Solutions"
                  className="max-h-[170px] w-full max-w-[390px] object-contain"
                />
              </div>

              <div className="border-t border-zinc-900 pt-5 text-center">
                <p className="text-base font-black text-white">
                  Mahimedia Solutions
                </p>

                <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#00dcc5]">
                  Analytics & Reporting Solutions
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-2">
        {modules.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="dashboard-card bg-black p-6"
            >
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00dcc5]/10 text-[#00dcc5]">
                <Icon className="h-7 w-7" />
              </div>

              <h3 className="text-xl font-black text-white">
                {item.title}
              </h3>

              <p className="mt-3 text-sm leading-7 text-zinc-500">
                {item.desc}
              </p>
            </div>
          );
        })}
      </section>
    </div>
  );
}