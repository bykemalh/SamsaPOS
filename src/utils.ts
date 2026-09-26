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

  // SQLite CURRENT_TIMESTAMP returns UTC without timezone (space-separated)
  // Normalize to ISO format with Z to avoid local-time misinterpretation
  const normalized = value.includes("T") ? value : value.replace(" ", "T") + "Z";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(normalized));
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** KDV dahil toplamdan ara toplam + KDV tutarını ayırır. rate: yüzde (örn. 10) */
export function splitVatIncluded(total: number, rate: number): { subtotal: number; vat: number } {
  const safeRate = Number.isFinite(rate) && rate >= 0 && rate <= 100 ? rate : 10;
  const divisor = 1 + safeRate / 100;
  const subtotal = total / divisor;
  return { subtotal, vat: total - subtotal };
}

export function todayLocalDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function shiftDate(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + deltaDays);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function formatDayLabel(dateStr: string): string {
  const today = todayLocalDate();
  if (dateStr === today) return "Bugün";
  if (dateStr === shiftDate(today, -1)) return "Dün";
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    weekday: "long",
  }).format(new Date(y, m - 1, d));
}

export function formatDateShort(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}

export const TURKISH_MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

export const TURKISH_MONTHS_SHORT = [
  "Oca", "Şub", "Mar", "Nis", "May", "Haz",
  "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"
];

export function getWeekRange(dateStr: string): { start: string; end: string; label: string } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  const day = dt.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(dt);
  monday.setDate(dt.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const pad = (n: number) => String(n).padStart(2, "0");
  const start = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
  const end = `${sunday.getFullYear()}-${pad(sunday.getMonth() + 1)}-${pad(sunday.getDate())}`;

  const label = `${monday.getDate()} ${TURKISH_MONTHS_SHORT[monday.getMonth()]} - ${sunday.getDate()} ${TURKISH_MONTHS_SHORT[sunday.getMonth()]} ${sunday.getFullYear()}`;
  return { start, end, label };
}

export function getMonthRange(year: number, month: number): { start: string; end: string; label: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const start = `${year}-${pad(month)}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${pad(month)}-${pad(lastDay)}`;
  const label = `${TURKISH_MONTHS[month - 1]} ${year}`;
  return { start, end, label };
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function shiftWeek(dateStr: string, deltaWeeks: number): string {
  return shiftDate(dateStr, deltaWeeks * 7);
}

export function formatRangeLabel(startDate: string, endDate: string): string {
  if (startDate === endDate) return formatDayLabel(startDate);
  return `${formatDateShort(startDate)} — ${formatDateShort(endDate)}`;
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
    // 0x0 iframe bazı motorlarda boş sayfa bastırır; ekran dışına 80mm genişlikte koy.
    iframe.style.position = "fixed";
    iframe.style.left = "-10000px";
    iframe.style.top = "0";
    iframe.style.width = "80mm";
    iframe.style.height = "auto";
    iframe.style.border = "0";

    document.body.appendChild(iframe);

    let settled = false;
    const cleanup = () => {
      if (iframe.isConnected) {
        iframe.remove();
      }
    };
    const succeed = () => {
      if (settled) return;
      settled = true;
      resolve();
      // afterprint her zaman ateşlenmeyebilir; geç temizlik sigortası
      window.setTimeout(cleanup, 60000);
    };
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error instanceof Error ? error : new Error("Yazdirma baslatilamadi."));
    };

    const frameWindow = iframe.contentWindow;
    if (!frameWindow) {
      iframe.remove();
      reject(new Error("Yazdirma cercevesi olusturulamadi."));
      return;
    }

    frameWindow.onafterprint = () => {
      cleanup();
    };

    let printStarted = false;
    const startPrint = () => {
      if (printStarted || settled) return;
      printStarted = true;
      try {
        frameWindow.focus();
        frameWindow.print();
        succeed();
      } catch (error) {
        fail(error);
      }
    };

    // İçerik tam yerleşsin diye load sonrası kısa bekle; tek ateşleme garantili.
    iframe.onload = () => window.setTimeout(startPrint, 350);
    // onload kaçarsa yedek: daha geç ve yine tek seferlik
    window.setTimeout(startPrint, 2500);

    try {
      const doc = frameWindow.document;
      doc.open();
      doc.write(html);
      doc.close();
    } catch (error) {
      fail(error);
    }
  });
}

export async function readFullscreenState(): Promise<boolean> {
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    return await getCurrentWindow().isFullscreen();
  } catch {
    return Boolean(document.fullscreenElement);
  }
}

export async function setFullscreenState(enabled: boolean): Promise<boolean> {
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().setFullscreen(enabled);
    return await getCurrentWindow().isFullscreen();
  } catch {
    if (enabled) {
      await document.documentElement.requestFullscreen();
    } else if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
    return Boolean(document.fullscreenElement);
  }
}
