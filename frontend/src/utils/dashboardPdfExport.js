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


// Read the real on-screen numeric SVG labels before image capture.
// jsPDF draws them as crisp vector text *after* the raster screenshot, so
// html-to-image cannot silently discard the numbers. No UI elements change.
function collectChartValueLabels(root) {
  const rootRect = root.getBoundingClientRect();
  const labels = [];
  const scrollX = root.scrollLeft || 0;
  const scrollY = root.scrollTop || 0;
  const seen = new Set();

  // IMPORTANT: do not export axes, ticks or tooltip text as data labels.
  // Recharts axis numbers look like chart values, but they must not be moved
  // to the plotting area during PDF conversion.
  for (const element of root.querySelectorAll(".recharts-wrapper svg text")) {
    if (element.closest(".recharts-cartesian-axis, .recharts-cartesian-grid, .recharts-legend-wrapper, .recharts-tooltip-wrapper")) continue;
    const value = (element.textContent || "").replace(/\s+/g, " ").trim();
    if (!value || !/\d/.test(value)) continue;

    const css = getComputedStyle(element);
    const weight = Number(css.fontWeight) || (/bold/i.test(css.fontWeight) ? 700 : 400);
    const attrWeight = Number(element.getAttribute("font-weight")) || 0;
    const isExplicitDataLabel = Boolean(element.closest(".recharts-label, .recharts-label-list, .recharts-pie-labels"));
    // Our on-screen data labels use 700/800/900 weight.  Axis ticks are
    // usually 400.  Do not infer values from arbitrary SVG text.
    if (!isExplicitDataLabel && Math.max(weight, attrWeight) < 650) continue;
    if (css.display === "none" || css.visibility === "hidden" || Number(css.opacity) === 0) continue;

    const rect = element.getBoundingClientRect();
    if (!Number.isFinite(rect.left) || !Number.isFinite(rect.top) || rect.width < 1 || rect.height < 1) continue;
    const x = rect.left - rootRect.left + scrollX;
    const y = rect.top - rootRect.top + scrollY;
    const key = `${value}|${Math.round(x)}|${Math.round(y)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    labels.push({
      value,
      x,
      y,
      width: rect.width,
      height: rect.height,
      fontPx: parseFloat(css.fontSize) || 11,
      weight: Math.max(weight, attrWeight),
    });
  }
  console.info(`[Atomos PDF] Actual chart data labels: ${labels.length} (axis ticks excluded)`);
  return labels;
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

async function embedVisibleValues(image, labels, layoutWidth) {
  if (!labels.length) {
    console.warn("[Atomos PDF] No chart values found. Export image will be unchanged.");
    return image;
  }
  const bitmap = new Image();
  bitmap.src = image.dataUrl;
  await new Promise((resolve, reject) => {
    if (bitmap.complete && bitmap.naturalWidth) return resolve();
    bitmap.onload = resolve;
    bitmap.onerror = reject;
  });
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.naturalWidth;
  canvas.height = bitmap.naturalHeight;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Chart value raster overlay could not initialize.");
  context.drawImage(bitmap, 0, 0);
  const scale = image.width / Math.max(1, layoutWidth);
  context.textAlign = "left";
  context.textBaseline = "top";
  context.lineJoin = "round";
  for (const label of labels) {
    const x = label.x * scale;
    const y = label.y * scale;
    const fontPx = Math.max(1, label.fontPx * scale);
    context.font = `${label.weight || 800} ${fontPx}px Arial, sans-serif`;
    context.lineWidth = Math.max(2, fontPx * 0.23);
    context.strokeStyle = "rgba(0,0,0,0.92)";
    context.fillStyle = "#FFFFFF";
    context.strokeText(label.value, x, y);
    context.fillText(label.value, x, y);
  }
  const result = { ...image, dataUrl: canvas.toDataURL("image/jpeg", 0.91), format: "JPEG" };
  canvas.width = 1;
  canvas.height = 1;
  return result;
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
  pdf.addImage(image.dataUrl, image.format || "PNG", PDF_MARGIN, PDF_MARGIN,
    image.width, image.height, undefined, "FAST");
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

    const chartLabels = collectChartValueLabels(root);
    const layoutWidth = getCaptureSize(root).width;
    await waitForPdfUiPaint();
    progress(55, "Capturing full page snapshot with chart labels...");
    const capturedImage = await captureWholeRoot(root);
    const image = await embedVisibleValues(capturedImage, chartLabels, layoutWidth);

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
