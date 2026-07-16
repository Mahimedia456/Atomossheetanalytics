import { toPng } from "html-to-image";
import jsPDF from "jspdf";

const MAX_TABLE_ROWS = 36;
const PAGE_MARGIN = 6;
const HEADER_HEIGHT = 50;

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
    overflow:hidden;background:#000;color:#fff;padding:24px;
    font-family:Manrope,Arial,sans-serif;isolation:isolate;
  `;
  loader.innerHTML = `
    <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 45%,rgba(0,220,197,.16),transparent 44%),#000"></div>
    <div style="position:relative;z-index:2;width:100%;max-width:440px;padding:28px;border:1px solid rgba(0,220,197,.3);border-radius:30px;background:#050505;box-shadow:0 0 100px rgba(0,220,197,.2)">
      <div style="display:flex;gap:16px;align-items:flex-start">
        <div style="display:flex;align-items:center;justify-content:center;width:56px;height:56px;flex:0 0 56px;border:1px solid rgba(0,220,197,.3);border-radius:16px;background:rgba(0,220,197,.1)">
          <div style="width:25px;height:25px;border:3px solid rgba(0,220,197,.25);border-top-color:#00dcc5;border-radius:999px;animation:atomosPdfSpin .8s linear infinite"></div>
        </div>
        <div style="min-width:0;flex:1">
          <p style="margin:0;color:#00dcc5;font-size:10px;font-weight:900;letter-spacing:.22em;text-transform:uppercase">Atomos PDF Export</p>
          <h2 data-pdf-loader-title style="margin:8px 0 0;font-size:20px;font-weight:900">Exporting dashboard</h2>
          <p data-pdf-loader-message style="min-height:48px;margin:8px 0 0;color:#a1a1aa;font-size:14px;line-height:1.7">Preparing PDF...</p>
        </div>
      </div>
      <div style="margin-top:26px">
        <div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:9px">
          <span style="color:#71717a;font-size:12px;font-weight:700">Export progress</span>
          <span data-pdf-loader-percent style="color:#00dcc5;font-size:14px;font-weight:900">0%</span>
        </div>
        <div style="height:12px;overflow:hidden;border:1px solid #27272a;border-radius:999px;background:#000">
          <div data-pdf-loader-bar style="width:0;height:100%;border-radius:999px;background:#00dcc5;transition:width .22s ease"></div>
        </div>
      </div>
    </div>
    <style>@keyframes atomosPdfSpin{to{transform:rotate(360deg)}}</style>
  `;
  document.body.appendChild(loader);
  return loader;
}

function updateLoader(loader, progress, message) {
  const value = Math.min(100, Math.max(0, Number(progress) || 0));
  const title = loader.querySelector("[data-pdf-loader-title]");
  const text = loader.querySelector("[data-pdf-loader-message]");
  const percent = loader.querySelector("[data-pdf-loader-percent]");
  const bar = loader.querySelector("[data-pdf-loader-bar]");
  if (title) title.textContent = value >= 100 ? "PDF is ready" : "Exporting dashboard";
  if (text) text.textContent = message || "Preparing PDF...";
  if (percent) percent.textContent = `${Math.round(value)}%`;
  if (bar) bar.style.width = `${value}%`;
}

function lockPage() {
  const html = document.documentElement;
  const body = document.body;
  const old = {
    htmlOverflow: html.style.overflow,
    htmlOverscroll: html.style.overscrollBehavior,
    bodyOverflow: body.style.overflow,
    bodyOverscroll: body.style.overscrollBehavior,
    bodyTouch: body.style.touchAction,
  };
  const prevent = (event) => event.preventDefault();
  html.style.setProperty("overflow", "hidden", "important");
  html.style.setProperty("overscroll-behavior", "none", "important");
  body.style.setProperty("overflow", "hidden", "important");
  body.style.setProperty("overscroll-behavior", "none", "important");
  body.style.setProperty("touch-action", "none", "important");
  window.addEventListener("wheel", prevent, { passive: false });
  window.addEventListener("touchmove", prevent, { passive: false });
  return () => {
    window.removeEventListener("wheel", prevent);
    window.removeEventListener("touchmove", prevent);
    html.style.overflow = old.htmlOverflow;
    html.style.overscrollBehavior = old.htmlOverscroll;
    body.style.overflow = old.bodyOverflow;
    body.style.overscrollBehavior = old.bodyOverscroll;
    body.style.touchAction = old.bodyTouch;
  };
}

function createRuntimeStyle(rootId) {
  const style = document.createElement("style");
  const safeId = window.CSS?.escape ? window.CSS.escape(rootId) : rootId;
  style.textContent = `
    #${safeId}.pdf-export-mode ${SKIP_SELECTOR}{display:none!important}
    #${safeId}.pdf-export-mode,#${safeId}.pdf-export-mode *{animation:none!important;transition:none!important;caret-color:transparent!important}
    #${safeId}.pdf-export-mode button,#${safeId}.pdf-export-mode select,#${safeId}.pdf-export-mode input,#${safeId}.pdf-export-mode textarea{display:none!important}
    #${safeId}.pdf-export-mode [data-pdf-table='true'] tbody tr:nth-child(n + ${MAX_TABLE_ROWS + 1}){display:none!important}
    #${safeId}.pdf-export-mode [data-pdf-table='true'],#${safeId}.pdf-export-mode [data-pdf-table='true']>*{overflow:visible!important;overflow-x:visible!important;overflow-y:visible!important;max-height:none!important}
  `;
  document.head.appendChild(style);
  return style;
}

function collectSections(root) {
  const explicit = Array.from(root.querySelectorAll(":scope > [data-pdf-section='true']"));
  return explicit.filter((node) => {
    if (!(node instanceof HTMLElement)) return false;
    const rect = node.getBoundingClientRect();
    const style = window.getComputedStyle(node);
    return rect.width > 2 && rect.height > 2 && style.display !== "none" && style.visibility !== "hidden";
  });
}

async function waitForImages(root) {
  await Promise.all(Array.from(root.querySelectorAll("img")).map((image) => {
    if (image.complete && image.naturalWidth > 0) return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => resolve();
      image.addEventListener("load", done, { once: true });
      image.addEventListener("error", done, { once: true });
      window.setTimeout(done, 5000);
    });
  }));
}

async function captureSection(node) {
  const rect = node.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(node.scrollWidth || rect.width));
  const height = Math.max(1, Math.ceil(node.scrollHeight || rect.height));
  const pixelRatio = 1.35;
  const dataUrl = await toPng(node, {
    cacheBust: true,
    backgroundColor: "#000000",
    pixelRatio,
    width,
    height,
    canvasWidth: Math.ceil(width * pixelRatio),
    canvasHeight: Math.ceil(height * pixelRatio),
    filter: (child) => {
      if (!(child instanceof Element)) return true;
      return !child.matches?.(SKIP_SELECTOR);
    },
  });
  return { dataUrl, width: Math.ceil(width * pixelRatio), height: Math.ceil(height * pixelRatio) };
}

function loadImageData(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context) return reject(new Error("Unable to prepare image."));
      context.drawImage(image, 0, 0);
      resolve({ dataUrl: canvas.toDataURL("image/png"), width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = reject;
    image.src = `${url}${url.includes("?") ? "&" : "?"}pdf=${Date.now()}`;
  });
}

function blackPage(pdf) {
  pdf.setFillColor(0, 0, 0);
  pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), "F");
}

function drawHeader(pdf, title, logo) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const totalWidth = pageWidth - PAGE_MARGIN * 2;
  const brandingWidth = 75;
  pdf.setDrawColor(39, 39, 42);
  pdf.setLineWidth(0.4);
  pdf.roundedRect(PAGE_MARGIN, PAGE_MARGIN, totalWidth, HEADER_HEIGHT, 4, 4, "S");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(25);
  const lines = pdf.splitTextToSize(String(title || "Analytics Report"), totalWidth - brandingWidth - 22);
  pdf.text(lines.slice(0, 2), PAGE_MARGIN + 9, PAGE_MARGIN + 28);
  const bx = PAGE_MARGIN + totalWidth - brandingWidth - 5;
  const by = PAGE_MARGIN + 5;
  const bh = HEADER_HEIGHT - 10;
  pdf.roundedRect(bx, by, brandingWidth, bh, 4, 4, "S");
  pdf.setFontSize(7);
  pdf.setTextColor(113, 113, 122);
  pdf.text("PRESENTED BY", bx + brandingWidth / 2, by + 7, { align: "center" });
  if (logo?.dataUrl) {
    const maxW = brandingWidth - 14;
    const maxH = bh - 15;
    const ratio = logo.width / logo.height;
    let w = maxW;
    let h = w / ratio;
    if (h > maxH) { h = maxH; w = h * ratio; }
    pdf.addImage(logo.dataUrl, "PNG", bx + (brandingWidth - w) / 2, by + 9 + (maxH - h) / 2, w, h, undefined, "FAST");
  }
  return PAGE_MARGIN + HEADER_HEIGHT + 5;
}

function addKeepTogether(pdf, image, cursorY) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const usableW = pageW - PAGE_MARGIN * 2;
  const usableH = pageH - PAGE_MARGIN * 2;
  const naturalH = (image.height * usableW) / image.width;
  let drawW = usableW;
  let drawH = naturalH;
  if (drawH > usableH) {
    const ratio = usableH / drawH;
    drawW *= ratio;
    drawH *= ratio;
  }
  if (drawH > pageH - PAGE_MARGIN - cursorY) {
    pdf.addPage();
    blackPage(pdf);
    cursorY = PAGE_MARGIN;
  }
  const x = PAGE_MARGIN + (usableW - drawW) / 2;
  pdf.addImage(image.dataUrl, "PNG", x, cursorY, drawW, drawH, undefined, "FAST");
  return cursorY + drawH + 4;
}

function decodeDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });
}

async function addTablePages(pdf, image) {
  const source = await decodeDataUrl(image.dataUrl);
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const usableW = pageW - PAGE_MARGIN * 2;
  const usableH = pageH - PAGE_MARGIN * 2;
  const pxPerMm = image.width / usableW;
  const slicePx = Math.max(1, Math.floor(usableH * pxPerMm));
  for (let y = 0; y < image.height; y += slicePx) {
    pdf.addPage();
    blackPage(pdf);
    const h = Math.min(slicePx, image.height - y);
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = h;
    const context = canvas.getContext("2d");
    if (!context) continue;
    context.fillStyle = "#000";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, 0, y, image.width, h, 0, 0, image.width, h);
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", PAGE_MARGIN, PAGE_MARGIN, usableW, h / pxPerMm, undefined, "FAST");
    canvas.width = 1;
    canvas.height = 1;
  }
  return pageH - PAGE_MARGIN;
}

export async function exportDashboardPdf({
  rootId,
  title = "Analytics Report",
  filename = "atomos-dashboard",
  logoUrl = "/mahi.logo.webp",
  onProgress,
} = {}) {
  const root = document.getElementById(rootId);
  if (!root) throw new Error(`PDF root "${rootId}" was not found.`);
  const loader = createLoader();
  const unlock = lockPage();
  const style = createRuntimeStyle(rootId);
  root.classList.add("pdf-export-mode");
  const progress = (value, message) => {
    emit(onProgress, value, message);
    updateLoader(loader, value, message);
  };
  try {
    progress(3, "Initializing PDF export...");
    await waitForPdfUiPaint();
    await wait(350);
    await waitForImages(root);
    const sections = collectSections(root);
    if (!sections.length) throw new Error("No visible PDF sections were found in this page.");
    let logo = null;
    try { logo = await loadImageData(logoUrl); } catch { logo = null; }
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
    blackPage(pdf);
    let cursorY = drawHeader(pdf, title, logo);
    for (let index = 0; index < sections.length; index += 1) {
      progress(12 + Math.round(((index + 1) / sections.length) * 72), `Rendering section ${index + 1} of ${sections.length}...`);
      await waitForPdfUiPaint();
      await wait(80);
      const node = sections[index];
      const image = await captureSection(node);
      if (node.matches("[data-pdf-table='true']")) {
        cursorY = await addTablePages(pdf, image);
      } else {
        cursorY = addKeepTogether(pdf, image, cursorY);
      }
    }
    progress(94, "Finalizing PDF...");
    await wait(250);
    const safe = String(filename).replace(/\.pdf$/i, "").trim() || "atomos-dashboard";
    pdf.save(`${safe}-${new Date().toISOString().slice(0, 10)}.pdf`);
    progress(100, "PDF ready. Download started.");
    await wait(1300);
  } finally {
    root.classList.remove("pdf-export-mode");
    style.remove();
    unlock();
    loader.remove();
  }
}
