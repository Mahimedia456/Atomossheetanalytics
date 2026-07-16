import {
  useEffect,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  CheckCircle2,
  FileDown,
  Loader2,
} from "lucide-react";

const blockedKeys = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  " ",
]);

function preventScroll(event) {
  event.preventDefault();
}

function preventKeyboardScroll(event) {
  if (
    blockedKeys.has(
      event.key,
    )
  ) {
    event.preventDefault();
  }
}

export default function ReportPdfLoader({
  open = false,
  reportName = "Dashboard",
  progress = 0,
  message = "Preparing dashboard...",
}) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const html =
      document.documentElement;

    const body =
      document.body;

    const previous = {
      htmlOverflow:
        html.style.overflow,

      htmlOverscroll:
        html.style
          .overscrollBehavior,

      bodyOverflow:
        body.style.overflow,

      bodyOverscroll:
        body.style
          .overscrollBehavior,

      bodyTouchAction:
        body.style.touchAction,
    };

    html.style.setProperty(
      "overflow",
      "hidden",
      "important",
    );

    html.style.setProperty(
      "overscroll-behavior",
      "none",
      "important",
    );

    body.style.setProperty(
      "overflow",
      "hidden",
      "important",
    );

    body.style.setProperty(
      "overscroll-behavior",
      "none",
      "important",
    );

    body.style.setProperty(
      "touch-action",
      "none",
      "important",
    );

    window.addEventListener(
      "wheel",
      preventScroll,
      {
        passive: false,
      },
    );

    window.addEventListener(
      "touchmove",
      preventScroll,
      {
        passive: false,
      },
    );

    window.addEventListener(
      "keydown",
      preventKeyboardScroll,
    );

    return () => {
      window.removeEventListener(
        "wheel",
        preventScroll,
      );

      window.removeEventListener(
        "touchmove",
        preventScroll,
      );

      window.removeEventListener(
        "keydown",
        preventKeyboardScroll,
      );

      html.style.overflow =
        previous.htmlOverflow;

      html.style.overscrollBehavior =
        previous.htmlOverscroll;

      body.style.overflow =
        previous.bodyOverflow;

      body.style.overscrollBehavior =
        previous.bodyOverscroll;

      body.style.touchAction =
        previous.bodyTouchAction;
    };
  }, [open]);

  if (
    !open ||
    typeof document ===
      "undefined"
  ) {
    return null;
  }

  const safeProgress =
    Math.min(
      100,
      Math.max(
        0,
        Number(progress) || 0,
      ),
    );

  const completed =
    safeProgress >= 100;

  const finalMessage =
    completed
      ? `${reportName} PDF download has started.`
      : message;

  return createPortal(
    <div
      data-pdf-loader="true"
      data-pdf-skip="true"
      data-html2canvas-ignore="true"
      role="dialog"
      aria-modal="true"
      aria-label={`${reportName} PDF export progress`}
      className="fixed inset-0 z-[2147483647] flex h-[100dvh] w-screen cursor-wait items-center justify-center overflow-hidden bg-black px-5"
      style={{
        isolation: "isolate",
        overscrollBehavior:
          "none",
        touchAction: "none",
      }}
      onWheel={
        preventScroll
      }
      onTouchMove={
        preventScroll
      }
    >
      <div className="pointer-events-none absolute inset-0 bg-black" />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(0,220,197,0.16),transparent_44%)]" />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-[30px] border border-[#00dcc5]/30 bg-[#050505] p-7 shadow-[0_0_110px_rgba(0,220,197,0.22)]">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#00dcc5]/30 bg-[#00dcc5]/10 text-[#00dcc5]">
            {completed ? (
              <CheckCircle2
                size={27}
              />
            ) : safeProgress >=
              70 ? (
              <FileDown
                size={27}
              />
            ) : (
              <Loader2
                size={27}
                className="animate-spin"
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#00dcc5]">
              Atomos PDF Export
            </p>

            <h2 className="mt-2 text-xl font-black text-white">
              {completed
                ? `${reportName} PDF is ready`
                : `Exporting ${reportName}`}
            </h2>

            <p className="mt-2 min-h-[48px] text-sm leading-6 text-zinc-400">
              {finalMessage}
            </p>
          </div>
        </div>

        <div className="mt-7">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-zinc-500">
              Export progress
            </span>

            <span className="text-sm font-black text-[#00dcc5]">
              {Math.round(
                safeProgress,
              )}
              %
            </span>
          </div>

          <div className="h-3 overflow-hidden rounded-full border border-zinc-800 bg-black">
            <div
              className="h-full rounded-full bg-[#00dcc5] transition-[width] duration-300 ease-out"
              style={{
                width: `${safeProgress}%`,
              }}
            />
          </div>
        </div>

        <p className="mt-5 text-center text-[11px] font-bold text-zinc-600">
          Please keep this page open until the download starts.
        </p>
      </div>
    </div>,
    document.body,
  );
}