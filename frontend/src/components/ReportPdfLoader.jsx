import {
  useEffect,
  useState,
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
  if (blockedKeys.has(event.key)) {
    event.preventDefault();
  }
}

export default function ReportPdfLoader({
  open = false,
  reportName = "Dashboard",
  progress = 0,
  message = "Preparing dashboard...",
}) {
  const [portalHost, setPortalHost] = useState(null);

  useEffect(() => {
    if (!open || typeof document === "undefined") {
      setPortalHost(null);
      return undefined;
    }

    const host = document.createElement("div");

    host.setAttribute(
      "data-report-pdf-loader-host",
      "true",
    );

    Object.assign(host.style, {
      position: "fixed",
      inset: "0",
      width: "100vw",
      height: "100vh",
      zIndex: "2147483647",
      display: "block",
      backgroundColor: "#000000",
      opacity: "1",
      visibility: "visible",
      pointerEvents: "auto",
      isolation: "isolate",
    });

    // Mount outside <body>. PDF export utilities commonly modify body
    // children while preparing html2canvas, which previously hid the loader.
    document.documentElement.appendChild(host);
    setPortalHost(host);

    const html = document.documentElement;
    const body = document.body;

    const previous = {
      htmlOverflow: html.style.getPropertyValue("overflow"),
      htmlOverflowPriority:
        html.style.getPropertyPriority("overflow"),
      htmlOverscroll:
        html.style.getPropertyValue("overscroll-behavior"),
      htmlOverscrollPriority:
        html.style.getPropertyPriority("overscroll-behavior"),
      bodyOverflow: body.style.getPropertyValue("overflow"),
      bodyOverflowPriority:
        body.style.getPropertyPriority("overflow"),
      bodyOverscroll:
        body.style.getPropertyValue("overscroll-behavior"),
      bodyOverscrollPriority:
        body.style.getPropertyPriority("overscroll-behavior"),
      bodyTouchAction:
        body.style.getPropertyValue("touch-action"),
      bodyTouchActionPriority:
        body.style.getPropertyPriority("touch-action"),
    };

    html.style.setProperty("overflow", "hidden", "important");
    html.style.setProperty(
      "overscroll-behavior",
      "none",
      "important",
    );
    body.style.setProperty("overflow", "hidden", "important");
    body.style.setProperty(
      "overscroll-behavior",
      "none",
      "important",
    );
    body.style.setProperty("touch-action", "none", "important");

    window.addEventListener("wheel", preventScroll, {
      passive: false,
      capture: true,
    });
    window.addEventListener("touchmove", preventScroll, {
      passive: false,
      capture: true,
    });
    window.addEventListener(
      "keydown",
      preventKeyboardScroll,
      true,
    );

    return () => {
      window.removeEventListener(
        "wheel",
        preventScroll,
        true,
      );
      window.removeEventListener(
        "touchmove",
        preventScroll,
        true,
      );
      window.removeEventListener(
        "keydown",
        preventKeyboardScroll,
        true,
      );

      html.style.setProperty(
        "overflow",
        previous.htmlOverflow,
        previous.htmlOverflowPriority,
      );
      html.style.setProperty(
        "overscroll-behavior",
        previous.htmlOverscroll,
        previous.htmlOverscrollPriority,
      );
      body.style.setProperty(
        "overflow",
        previous.bodyOverflow,
        previous.bodyOverflowPriority,
      );
      body.style.setProperty(
        "overscroll-behavior",
        previous.bodyOverscroll,
        previous.bodyOverscrollPriority,
      );
      body.style.setProperty(
        "touch-action",
        previous.bodyTouchAction,
        previous.bodyTouchActionPriority,
      );

      host.remove();
      setPortalHost(null);
    };
  }, [open]);

  if (!open || !portalHost) {
    return null;
  }

  const safeProgress = Math.min(
    100,
    Math.max(0, Number(progress) || 0),
  );

  const completed = safeProgress >= 100;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      aria-label={`${reportName} PDF export progress`}
      className="flex cursor-wait items-center justify-center overflow-hidden px-5"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        minWidth: "100vw",
        minHeight: "100vh",
        zIndex: 2147483647,
        backgroundColor: "#000000",
        backgroundImage: "none",
        opacity: 1,
        visibility: "visible",
        pointerEvents: "auto",
        isolation: "isolate",
        overscrollBehavior: "none",
        touchAction: "none",
      }}
      onWheel={preventScroll}
      onTouchMove={preventScroll}
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-[30px] border border-[#00dcc5]/30 bg-[#050505] p-7 shadow-[0_0_110px_rgba(0,220,197,0.22)]">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#00dcc5]/30 bg-[#00dcc5]/10 text-[#00dcc5]">
            {completed ? (
              <CheckCircle2 size={27} />
            ) : safeProgress >= 70 ? (
              <FileDown size={27} />
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
              {completed
                ? `${reportName} PDF download has started.`
                : message || "Preparing dashboard..."}
            </p>
          </div>
        </div>

        <div className="mt-7">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-zinc-500">
              Export progress
            </span>

            <span className="text-sm font-black text-[#00dcc5]">
              {Math.round(safeProgress)}%
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
    portalHost,
  );
}
