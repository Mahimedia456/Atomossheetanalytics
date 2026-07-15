import html2canvas from "html2canvas";
import jsPDF from "jspdf";

function waitForLayout() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });
}

function createCanvas({
  width,
  height,
}) {
  const canvas =
    document.createElement("canvas");

  canvas.width = Math.max(
    1,
    Math.floor(width),
  );

  canvas.height = Math.max(
    1,
    Math.floor(height),
  );

  return canvas;
}

function getPageSliceHeight({
  canvasWidth,
  pageWidth,
  pageHeight,
}) {
  /*
   * A4 landscape ratio:
   *
   * canvas slice height / canvas width
   * =
   * printable PDF height / printable PDF width
   */
  return Math.floor(
    canvasWidth *
      (pageHeight / pageWidth),
  );
}

function buildExportFilename(
  filename,
) {
  const date = new Date()
    .toISOString()
    .slice(0, 10);

  return `${filename}-${date}.pdf`;
}

function temporarilyHideElements(
  rootElement,
) {
  const hiddenElements =
    Array.from(
      rootElement.querySelectorAll(
        [
          "[data-html2canvas-ignore='true']",
          ".no-print",
        ].join(","),
      ),
    );

  const previousStyles =
    hiddenElements.map((element) => ({
      element,
      display:
        element.style.display,
    }));

  hiddenElements.forEach(
    (element) => {
      element.style.display = "none";
    },
  );

  return function restoreElements() {
    previousStyles.forEach(
      ({
        element,
        display,
      }) => {
        element.style.display =
          display;
      },
    );
  };
}

function temporarilyPrepareRoot(
  rootElement,
) {
  const previousStyles = {
    width:
      rootElement.style.width,
    maxWidth:
      rootElement.style.maxWidth,
    minWidth:
      rootElement.style.minWidth,
    overflow:
      rootElement.style.overflow,
    background:
      rootElement.style.background,
    backgroundColor:
      rootElement.style
        .backgroundColor,
  };

  /*
   * Preserve the current dashboard width rather than
   * compressing it to PDF dimensions before capture.
   */
  const currentWidth = Math.max(
    rootElement.scrollWidth,
    rootElement.clientWidth,
  );

  rootElement.style.width =
    `${currentWidth}px`;

  rootElement.style.maxWidth =
    "none";

  rootElement.style.minWidth =
    `${currentWidth}px`;

  rootElement.style.overflow =
    "visible";

  rootElement.style.background =
    "#000000";

  rootElement.style.backgroundColor =
    "#000000";

  return function restoreRoot() {
    rootElement.style.width =
      previousStyles.width;

    rootElement.style.maxWidth =
      previousStyles.maxWidth;

    rootElement.style.minWidth =
      previousStyles.minWidth;

    rootElement.style.overflow =
      previousStyles.overflow;

    rootElement.style.background =
      previousStyles.background;

    rootElement.style.backgroundColor =
      previousStyles.backgroundColor;
  };
}

async function captureDashboard(
  rootElement,
) {
  const width = Math.max(
    rootElement.scrollWidth,
    rootElement.clientWidth,
  );

  const height = Math.max(
    rootElement.scrollHeight,
    rootElement.clientHeight,
  );

  return html2canvas(
    rootElement,
    {
      backgroundColor: "#000000",

      /*
       * Scale 1.5 gives good quality without creating
       * an excessively large PDF.
       */
      scale: 1.5,

      useCORS: true,
      allowTaint: false,
      logging: false,

      scrollX: 0,
      scrollY: 0,

      width,
      height,

      windowWidth: width,
      windowHeight: height,

      ignoreElements: (element) =>
        element.hasAttribute?.(
          "data-html2canvas-ignore",
        ),
    },
  );
}

function addCanvasSliceToPdf({
  pdf,
  sourceCanvas,
  sourceY,
  sourceHeight,
  pageWidth,
  pageHeight,
  margin,
}) {
  const sliceCanvas =
    createCanvas({
      width:
        sourceCanvas.width,
      height: sourceHeight,
    });

  const context =
    sliceCanvas.getContext("2d");

  if (!context) {
    throw new Error(
      "Unable to create PDF canvas context.",
    );
  }

  /*
   * Fill the slice with black first. This prevents
   * transparent areas from becoming white.
   */
  context.fillStyle = "#000000";

  context.fillRect(
    0,
    0,
    sliceCanvas.width,
    sliceCanvas.height,
  );

  context.drawImage(
    sourceCanvas,

    // Source crop
    0,
    sourceY,
    sourceCanvas.width,
    sourceHeight,

    // Destination
    0,
    0,
    sliceCanvas.width,
    sourceHeight,
  );

  const printableWidth =
    pageWidth - margin * 2;

  const printableHeight =
    pageHeight - margin * 2;

  const imageRatio =
    sliceCanvas.width /
    sliceCanvas.height;

  const pageRatio =
    printableWidth /
    printableHeight;

  let imageWidth;
  let imageHeight;

  if (imageRatio > pageRatio) {
    imageWidth =
      printableWidth;

    imageHeight =
      imageWidth /
      imageRatio;
  } else {
    imageHeight =
      printableHeight;

    imageWidth =
      imageHeight *
      imageRatio;
  }

  /*
   * Align content at the top of the PDF page.
   * Do not vertically center it, because centering
   * causes the large empty spaces seen previously.
   */
  const imageX =
    margin +
    (
      printableWidth -
      imageWidth
    ) /
      2;

  const imageY = margin;

  pdf.setFillColor(
    0,
    0,
    0,
  );

  pdf.rect(
    0,
    0,
    pageWidth,
    pageHeight,
    "F",
  );

  pdf.addImage(
    sliceCanvas.toDataURL(
      "image/jpeg",
      0.94,
    ),
    "JPEG",
    imageX,
    imageY,
    imageWidth,
    imageHeight,
    undefined,
    "FAST",
  );
}

export async function exportDashboardPdf({
  rootId,
  filename,
}) {
  const rootElement =
    document.getElementById(
      rootId,
    );

  if (!rootElement) {
    throw new Error(
      `PDF root element "${rootId}" was not found. Add id="${rootId}" to the main page container.`,
    );
  }

  const previousScrollX =
    window.scrollX;

  const previousScrollY =
    window.scrollY;

  const restoreHiddenElements =
    temporarilyHideElements(
      rootElement,
    );

  const restoreRoot =
    temporarilyPrepareRoot(
      rootElement,
    );

  try {
    window.scrollTo(
      0,
      0,
    );

    /*
     * Give Recharts and the browser two frames to
     * recalculate widths after filters/buttons are hidden.
     */
    await waitForLayout();

    const dashboardCanvas =
      await captureDashboard(
        rootElement,
      );

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pageWidth =
      pdf.internal.pageSize.getWidth();

    const pageHeight =
      pdf.internal.pageSize.getHeight();

    const margin = 5;

    const printablePageWidth =
      pageWidth - margin * 2;

    const printablePageHeight =
      pageHeight - margin * 2;

    const pageSliceHeight =
      getPageSliceHeight({
        canvasWidth:
          dashboardCanvas.width,

        pageWidth:
          printablePageWidth,

        pageHeight:
          printablePageHeight,
      });

    let sourceY = 0;
    let pageIndex = 0;

    while (
      sourceY <
      dashboardCanvas.height
    ) {
      const remainingHeight =
        dashboardCanvas.height -
        sourceY;

      const currentSliceHeight =
        Math.min(
          pageSliceHeight,
          remainingHeight,
        );

      if (pageIndex > 0) {
        pdf.addPage();
      }

      addCanvasSliceToPdf({
        pdf,

        sourceCanvas:
          dashboardCanvas,

        sourceY,

        sourceHeight:
          currentSliceHeight,

        pageWidth,
        pageHeight,
        margin,
      });

      sourceY +=
        currentSliceHeight;

      pageIndex += 1;
    }

    pdf.save(
      buildExportFilename(
        filename,
      ),
    );
  } finally {
    restoreRoot();
    restoreHiddenElements();

    window.scrollTo(
      previousScrollX,
      previousScrollY,
    );
  }
}