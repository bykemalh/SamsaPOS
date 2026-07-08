export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatDateTime(value?: string | null): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function cropImageToAspectRatio(
  file: File,
  aspectRatio = 4 / 3,
  maxWidth = 800,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        const sourceWidth = img.naturalWidth;
        const sourceHeight = img.naturalHeight;
        const sourceAspect = sourceWidth / sourceHeight;

        let cropWidth: number;
        let cropHeight: number;
        let sourceX: number;
        let sourceY: number;

        if (sourceAspect > aspectRatio) {
          cropHeight = sourceHeight;
          cropWidth = sourceHeight * aspectRatio;
          sourceX = (sourceWidth - cropWidth) / 2;
          sourceY = 0;
        } else {
          cropWidth = sourceWidth;
          cropHeight = sourceWidth / aspectRatio;
          sourceX = 0;
          sourceY = (sourceHeight - cropHeight) / 2;
        }

        const outputWidth = Math.min(maxWidth, cropWidth);
        const outputHeight = Math.round(outputWidth / aspectRatio);

        const canvas = document.createElement("canvas");
        canvas.width = outputWidth;
        canvas.height = outputHeight;

        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Gorsel islenemedi."));
          return;
        }

        context.drawImage(
          img,
          sourceX,
          sourceY,
          cropWidth,
          cropHeight,
          0,
          0,
          outputWidth,
          outputHeight,
        );

        resolve(canvas.toDataURL("image/jpeg", 0.88));
      };

      img.onerror = () => reject(new Error("Gorsel okunamadi."));
      img.src = String(reader.result);
    };

    reader.onerror = () => reject(new Error("Dosya okunamadi."));
    reader.readAsDataURL(file);
  });
}

export function printHtml(html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";

    document.body.appendChild(iframe);

    const frameWindow = iframe.contentWindow;
    if (!frameWindow) {
      iframe.remove();
      reject(new Error("Yazdirma cercevesi olusturulamadi."));
      return;
    }

    const cleanup = () => {
      if (iframe.isConnected) {
        iframe.remove();
      }
    };

    frameWindow.onafterprint = cleanup;

    const doc = frameWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    let started = false;
    const startPrint = () => {
      if (started) {
        return;
      }
      started = true;

      try {
        frameWindow.focus();
        frameWindow.print();
        resolve();
        window.setTimeout(cleanup, 120000);
      } catch (error) {
        cleanup();
        reject(error instanceof Error ? error : new Error("Yazdirma baslatilamadi."));
      }
    };

    if (doc.readyState === "complete") {
      window.requestAnimationFrame(() => window.setTimeout(startPrint, 100));
      return;
    }

    iframe.onload = () => window.setTimeout(startPrint, 100);
    window.setTimeout(startPrint, 500);
  });
}
