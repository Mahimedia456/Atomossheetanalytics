import { toPng } from "html-to-image";
import jsPDF from "jspdf";

const PDF_MARGIN = 0;
const SKIP_SELECTOR = [
  "[data-pdf-skip='true']",
  "[data-pdf-hide='true']",
  "[data-html2canvas-ignore='true']",
  "[data-pdf-loader='true']",
  ".no-print",
  ".dashboard-filters",
  ".export-actions",
].join(",");

function wait(ms = 0) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function waitForPdfUiPaint() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(resolve);
    });
  });
}

function emit(onProgress, progress, message) {
  onProgress?.({ progress, message });
}

function createLoader() {
  const loader = document.createElement("div");
  loader.dataset.pdfLoader = "true";
  loader.style.cssText = `
    position:fixed;inset:0;z-index:2147483647;display:flex;
    align-items:center;justify-content:center;width:100vw;height:100dvh;
    overflow:hidden;background:rgba(0,0,0,.92);color:#fff;padding:24px;
    font-family:Manrope,Arial,sans-serif;isolation:isolate;
  `;
  loader.innerHTML = `
    <div style="width:100%;max-width:420px;padding:24px;border:1px solid rgba(0,220,197,.3);border-radius:28px;background:#050505;box-shadow:0 0 60px rgba(0,220,197,.18)">
      <p style="margin:0;color:#00dcc5;font-size:10px;font-weight:900;letter-spacing:.22em;text-transform:uppercase">Atomos PDF Export</p>
      <h2 style="margin:8px 0 0;font-size:20px;font-weight:900">Rendering full page</h2>
      <p data-pdf-loader-message style="min-height:44px;margin:8px 0 0;color:#a1a1aa;font-size:14px;line-height:1.7">Preparing dashboard snapshot...</p>
      <div style="margin-top:24px;height:12px;overflow:hidden;border:1px solid #27272a;border-radius:999px;background:#000">
        <div data-pdf-loader-bar style="width:0;height:100%;border-radius:999px;background:#00dcc5;transition:width .2s ease"></div>
      </div>
      <div data-pdf-loader-percent style="margin-top:10px;text-align:right;color:#00dcc5;font-size:14px;font-weight:900">0%</div>
    </div>
  `;
  document.body.appendChild(loader);
  return loader;
}

function updateLoader(loader, progress, message) {
  const value = Math.min(100, Math.max(0, Number(progress) || 0));
  const text = loader.querySelector("[data-pdf-loader-message]");
  const percent = loader.querySelector("[data-pdf-loader-percent]");
  const bar = loader.querySelector("[data-pdf-loader-bar]");
  if (text) text.textContent = message || "Preparing dashboard snapshot...";
  if (percent) percent.textContent = `${Math.round(value)}%`;
  if (bar) bar.style.width = `${value}%`;
}

function lockPage() {
  const html = document.documentElement;
  const body = document.body;
  const old = {
    htmlOverflow: html.style.overflow,
    bodyOverflow: body.style.overflow,
    bodyTouch: body.style.touchAction,
  };

  html.style.setProperty("overflow", "hidden", "important");
  body.style.setProperty("overflow", "hidden", "important");
  body.style.setProperty("touch-action", "none", "important");

  return () => {
    html.style.overflow = old.htmlOverflow;
    body.style.overflow = old.bodyOverflow;
    body.style.touchAction = old.bodyTouch;
  };
}

function createRuntimeStyle(rootId) {
  const style = document.createElement("style");
  const safeId = window.CSS?.escape ? window.CSS.escape(rootId) : rootId;
  style.textContent = `
    #${safeId}.pdf-export-mode ${SKIP_SELECTOR}{display:none!important}
    #${safeId}.pdf-export-mode [data-pdf-table='true']{display:none!important}
    #${safeId}.pdf-export-mode .dashboard-filters{display:none!important}
    #${safeId}.pdf-export-mode .no-print{display:none!important}
    #${safeId}.pdf-export-mode [data-pdf-table-wrapper='true']{display:none!important}
    #${safeId}.pdf-export-mode button,
    #${safeId}.pdf-export-mode select,
    #${safeId}.pdf-export-mode input,
    #${safeId}.pdf-export-mode textarea{visibility:hidden!important}
    #${safeId}.pdf-export-mode,
    #${safeId}.pdf-export-mode *{
      animation:none!important;
      transition:none!important;
      caret-color:transparent!important;
      scroll-behavior:auto!important;
    }
    #${safeId}.pdf-export-mode .recharts-wrapper,
    #${safeId}.pdf-export-mode .recharts-surface,
    #${safeId}.pdf-export-mode svg{overflow:visible!important}
  `;
  document.head.appendChild(style);
  return style;
}

async function waitForImages(root) {
  await Promise.all(
    Array.from(root.querySelectorAll("img")).map((image) => {
      if (image.complete && image.naturalWidth > 0) return Promise.resolve();
      return new Promise((resolve) => {
        const done = () => resolve();
        image.addEventListener("load", done, { once: true });
        image.addEventListener("error", done, { once: true });
        window.setTimeout(done, 3000);
      });
    }),
  );
}

function getCaptureSize(root) {
  const rect = root.getBoundingClientRect();
  return {
    width: Math.max(
      Math.ceil(root.scrollWidth),
      Math.ceil(root.clientWidth),
      Math.ceil(rect.width),
    ),
    height: Math.max(
      Math.ceil(root.scrollHeight),
      Math.ceil(root.clientHeight),
      Math.ceil(rect.height),
    ),
  };
}

async function captureWholeRoot(root) {
  const { width, height } = getCaptureSize(root);
  const pixelRatio = Math.min(1.25, window.devicePixelRatio || 1);

  const dataUrl = await toPng(root, {
    cacheBust: true,
    backgroundColor: "#000000",
    pixelRatio,
    width,
    height,
    canvasWidth: Math.ceil(width * pixelRatio),
    canvasHeight: Math.ceil(height * pixelRatio),
    skipAutoScale: true,
    filter: (child) => {
      if (!(child instanceof Element)) return true;
      if (child.matches?.(SKIP_SELECTOR)) return false;
      if (child.matches?.("[data-pdf-table='true']")) return false;
      if (child.closest?.("[data-pdf-table='true']")) return false;
      return true;
    },
  });

  return {
    dataUrl,
    width: Math.ceil(width * pixelRatio),
    height: Math.ceil(height * pixelRatio),
  };
}

function buildPdfFromImage(image, filename) {
  const pdfWidth = image.width + PDF_MARGIN * 2;
  const pdfHeight = image.height + PDF_MARGIN * 2;

  const pdf = new jsPDF({
    orientation: pdfWidth >= pdfHeight ? "landscape" : "portrait",
    unit: "px",
    format: [pdfWidth, pdfHeight],
    compress: true,
    hotfixes: ["px_scaling"],
  });

  pdf.setFillColor(0, 0, 0);
  pdf.rect(0, 0, pdfWidth, pdfHeight, "F");
  pdf.addImage(
    image.dataUrl,
    "PNG",
    PDF_MARGIN,
    PDF_MARGIN,
    image.width,
    image.height,
    undefined,
    "FAST",
  );

  const safe = String(filename).replace(/\.pdf$/i, "").trim() || "atomos-dashboard";
  pdf.save(`${safe}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function exportDashboardPdf({
  rootId,
  title = "Analytics Report",
  filename = "atomos-dashboard",
  onProgress,
} = {}) {
  const root = document.getElementById(rootId);
  if (!root) {
    throw new Error(`PDF root "${rootId}" was not found.`);
  }

  const loader = createLoader();
  const unlock = lockPage();
  const style = createRuntimeStyle(rootId);
  const originalTitle = document.title;
  root.classList.add("pdf-export-mode");

  const progress = (value, message) => {
    emit(onProgress, value, message);
    updateLoader(loader, value, message);
  };

  try {
    document.title = title;
    progress(8, "Preparing dashboard view...");
    await waitForPdfUiPaint();
    await wait(120);
    await waitForImages(root);

    progress(28, "Stabilizing charts and labels...");
    await waitForPdfUiPaint();
    await wait(220);

    progress(55, "Capturing full page snapshot...");
    const image = await captureWholeRoot(root);

    progress(82, "Generating single-page PDF...");
    await wait(60);
    buildPdfFromImage(image, filename);

    progress(100, "PDF ready. Download started.");
    await wait(600);
  } finally {
    document.title = originalTitle;
    root.classList.remove("pdf-export-mode");
    style.remove();
    unlock();
    loader.remove();
  }
}
