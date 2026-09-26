import type {
  Category,
  ConfirmDialog,
  DailySummary,
  DiningTable,
  FormModal,
  OrderDetail,
  PaymentMethod,
  Product,
  SalesPeriodSummary,
  UiState,
} from "./types";
import { PAYMENT_LABELS } from "./types";
import {
  TURKISH_MONTHS,
  escapeHtml,
  formatCurrency,
  formatDateTime,
  formatDateShort,
  formatDayLabel,
  getWeekRange,
  todayLocalDate,
} from "./utils";

function icon(name: string, className: string = "w-5 h-5"): string {
  className = `${className} pointer-events-none shrink-0`.trim();
  const icons: Record<string, string> = {
    search: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${className}"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" /></svg>`,
    notifications: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${className}"><path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>`,
    settings: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${className}"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.991l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`,
    schedule: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${className}"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
    print: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${className}"><path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.617 0-1.11-.474-1.12-1.09L5.87 18m11.79 0H6.34M17.66 18H16.5m-9 0H7.66m10.74-8.829c.24.03.48.062.72.096m-.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L17.66 8m-11.32 1.171a1.125 1.125 0 01-.72-.096m.72.096L6.34 8m11.32 0v-1.5c0-.621-.504-1.125-1.125-1.125H7.231c-.621 0-1.125.504-1.125 1.125V8m11.32 0h-11.32" /></svg>`,
    delete: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${className}"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>`,
    remove: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="${className}"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12h-15" /></svg>`,
    add: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="${className}"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>`,
    payments: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${className}"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>`,
    table_restaurant: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${className}"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h12A2.25 2.25 0 0120.25 6v12A2.25 2.25 0 0118 20.25H6A2.25 2.25 0 013.75 18V6zM6 7.5h12m-12 4.5h12m-12 4.5h12" /></svg>`,
    table_bar: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${className}"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h12A2.25 2.25 0 0120.25 6v12A2.25 2.25 0 0118 20.25H6A2.25 2.25 0 013.75 18V6zM6 7.5h12m-12 4.5h12m-12 4.5h12" /></svg>`,
    shopping_cart_cancel: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${className}"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>`,
    restaurant: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${className}"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 7.05h.008v.008H12V7.05zM12 3.75h.008v.008H12V3.75zm0 9.75h.008v.008H12v-.008zM12 13.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" /></svg>`,
    restaurant_menu: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${className}"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 7.05h.008v.008H12V7.05zM12 3.75h.008v.008H12V3.75zm0 9.75h.008v.008H12v-.008zM12 13.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" /></svg>`,
    check_circle: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${className}"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
    error: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${className}"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>`,
    sync: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${className}"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>`,
    category: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${className}"><path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581a2.25 2.25 0 003.182 0l4.318-4.318a2.25 2.25 0 000-3.182L11.16 3.659A2.25 2.25 0 009.568 3z" /><path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6z" /></svg>`,
    receipt_long: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${className}"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>`,
    edit: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${className}"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>`,
    edit_note: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${className}"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.83 17.017a4.5 4.5 0 01-1.897 1.13L3 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10m4 3h1.5m-1.5 3h3" /></svg>`,
    close: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${className}"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>`,
    upload: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${className}"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>`,
    fullscreen: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${className}"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m5.25 11.25v-4.5m0 4.5h-4.5m4.5 0l-6-6" /></svg>`,
    fullscreen_exit: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${className}"><path stroke-linecap="round" stroke-linejoin="round" d="M9 3.75v4.5m0 0H4.5M9 8.25L3.75 3m6 17.25v-4.5m0 0H4.5m4.5 0L3.75 21M15 3.75v4.5m0 0h4.5M15 8.25L20.25 3m-5.25 18v-4.5m0 0h4.5m-4.5 0L20.25 21" /></svg>`,
    add_circle: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${className}"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
    image: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${className}"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008H12v-.008z" /></svg>`,
    history: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${className}"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
    warning: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${className}"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>`,
    help: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${className}"><path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg>`,
    chevron_left: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${className}"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>`,
    chevron_right: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${className}"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>`,
    calendar: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${className}"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>`,
    cash: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${className}"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`,
    card: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${className}"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>`,
  };
  return icons[name] || "";
}

export function paymentLabel(method?: string | null): string {
  if (method === "card") return PAYMENT_LABELS.card;
  if (method === "other") return PAYMENT_LABELS.other;
  return PAYMENT_LABELS.cash;
}

function tableCard(table: DiningTable, selectedTableId: number | null): string {
  const selected = table.id === selectedTableId;
  const isPackage = table.name.startsWith("Paket");
  const isOccupied = table.status === "occupied";

  const badgeText = isPackage ? "Paket" : isOccupied ? "Dolu" : "Boş";
  const badgeClass = isPackage
    ? "bg-surface-variant text-on-surface-variant"
    : isOccupied
      ? "bg-error-container text-on-error-container"
      : "bg-secondary-container text-on-secondary-container";

  const indicatorHtml = isPackage
    ? `${icon("receipt_long", "w-4 h-4 text-primary")}`
    : `<div class="w-1 h-8 ${isOccupied ? "bg-error" : "bg-secondary"} rounded-full shrink-0"></div>`;

  const amountOpacity = isOccupied || isPackage ? "" : "opacity-0";

  const borderStyle = selected
    ? "border border-primary bg-primary/[0.04]"
    : "border border-outline-variant";

  return `
    <div data-action="select-table" data-table-id="${table.id}" class="bg-surface-container-lowest ${borderStyle} rounded-lg p-2 cursor-pointer hover:shadow-md transition-all flex items-center justify-between gap-2 min-w-0">
      <div class="flex items-center gap-2 min-w-0 flex-1">
        ${indicatorHtml}
        <div class="min-w-0 flex-1">
          <div class="font-bold text-sm text-on-surface truncate">${escapeHtml(table.name)}</div>
          <div class="${badgeClass} text-[10px] px-1.5 py-px rounded w-fit font-semibold">${badgeText}</div>
        </div>
      </div>
      <div class="flex items-center gap-1 shrink-0">
        <span class="text-sm font-bold tabular-nums text-primary ${amountOpacity} whitespace-nowrap">${formatCurrency(table.currentTotal)}</span>
        ${isPackage ? `<button type="button" data-action="delete-package" data-table-id="${table.id}" class="p-1.5 text-error/70 hover:text-error hover:bg-error-container/20 rounded transition-colors shrink-0" title="Paketi Sil">${icon("delete", "w-3.5 h-3.5")}</button>` : ""}
      </div>
    </div>
  `;
}

function categoryFilter(category: Category, selectedCategoryId: number | null): string {
  const selected = selectedCategoryId === category.id;
  if (selected) {
    return `<button type="button" data-action="filter-category" data-category-id="${category.id}" class="px-4 py-1.5 rounded-full bg-primary text-on-primary text-sm font-semibold whitespace-nowrap shadow-sm shrink-0">${escapeHtml(category.name)}</button>`;
  } else {
    return `<button type="button" data-action="filter-category" data-category-id="${category.id}" class="px-4 py-1.5 rounded-full bg-surface-container border border-outline-variant text-on-surface text-sm font-medium whitespace-nowrap hover:bg-surface-container-high transition-colors shrink-0">${escapeHtml(category.name)}</button>`;
  }
}

function productCard(product: Product): string {
  const image = product.imageData
    ? `<img src="${product.imageData}" alt="${escapeHtml(product.name)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" decoding="async" loading="lazy" />`
    : `<div class="w-full h-full bg-surface-container flex items-center justify-center group-hover:scale-105 transition-transform duration-300">${icon("image", "w-6 h-6 text-outline")}</div>`;

  return `
    <button type="button" data-action="add-to-order" data-product-id="${product.id}" class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden flex flex-col hover:shadow-sm hover:border-primary transition-all active:scale-95 group text-left min-w-0">
      <div class="aspect-[4/3] w-full overflow-hidden bg-surface-container">
        ${image}
      </div>
      <div class="p-1 flex flex-col items-center gap-0.5 w-full min-w-0">
        <span class="font-semibold text-on-surface text-center text-xs xl:text-sm leading-tight truncate w-full" title="${escapeHtml(product.name)}">${escapeHtml(product.name)}</span>
        <span class="tabular-nums text-primary text-xs xl:text-sm font-bold whitespace-nowrap">${formatCurrency(product.price)}</span>
        <span class="text-[10px] font-semibold text-on-surface-variant whitespace-nowrap">KDV ${vatRateLabel(product.vatRate ?? 10)} dahil</span>
      </div>
    </button>
  `;
}

function vatBreakdown(items: { lineTotal: number; vatRate?: number | null }[]): { rate: number; gross: number; vat: number }[] {
  const map = new Map<number, number>();
  for (const it of items) {
    const raw = Number(it.vatRate);
    const r = Number.isFinite(raw) && raw >= 0 && raw <= 100 ? raw : 10;
    map.set(r, (map.get(r) ?? 0) + it.lineTotal);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([rate, gross]) => ({ rate, gross, vat: gross - gross / (1 + rate / 100) }));
}

function vatRateLabel(rate: number): string {
  return `%${Number.isInteger(rate) ? rate : rate}`;
}

function renderOrder(order: OrderDetail | null): string {
  if (!order) {
    return `
      <div class="flex-1 flex flex-col items-center justify-center p-4 text-center text-on-surface-variant gap-3 h-full min-h-[200px]">
        ${icon("table_restaurant", "w-16 h-16 text-outline/40")}
        <div>
          <h3 class="font-bold text-lg text-on-surface">Masa Seçilmedi</h3>
          <p class="text-sm text-on-surface-variant mt-1">Sipariş detaylarını görmek ve ürün eklemek için bir masa seçin.</p>
        </div>
      </div>
    `;
  }

  const items = order.items.length
    ? order.items
        .map(
          (item) => `
        <div class="bg-surface border border-outline-variant/50 rounded-lg p-2 min-w-0">
          <div class="flex justify-between items-start mb-1 gap-2 min-w-0">
            <span class="text-sm font-semibold text-on-surface truncate flex-1 min-w-0">${escapeHtml(item.productName)} <span class="text-[10px] font-bold text-on-surface-variant whitespace-nowrap">KDV ${vatRateLabel(Number.isFinite(Number(item.vatRate)) ? Number(item.vatRate) : 10)}</span></span>
            <span class="tabular-nums text-sm text-on-surface whitespace-nowrap shrink-0">${formatCurrency(item.unitPrice)}</span>
          </div>
          <div class="flex justify-between items-center mt-1.5 gap-2">
            <div class="flex items-center gap-1 bg-surface-container rounded-full p-1 border border-outline-variant shrink-0">
              <button type="button" data-action="decrease-item" data-item-id="${item.id}" data-quantity="${item.quantity}" class="w-6 h-6 flex items-center justify-center rounded-full bg-surface-container-lowest text-on-surface shadow-sm active:scale-90" title="Azalt">
                ${icon("remove", "w-4 h-4")}
              </button>
              <span class="tabular-nums text-sm w-6 text-center font-bold">${item.quantity}</span>
              <button type="button" data-action="increase-item" data-item-id="${item.id}" data-quantity="${item.quantity}" class="w-6 h-6 flex items-center justify-center rounded-full bg-surface-container-lowest text-on-surface shadow-sm active:scale-90" title="Arttır">
                ${icon("add", "w-4 h-4")}
              </button>
            </div>
            <div class="flex items-center gap-2 min-w-0">
              <span class="tabular-nums text-sm font-bold text-primary truncate">${formatCurrency(item.lineTotal)}</span>
              <button type="button" data-action="remove-item" data-item-id="${item.id}" class="text-error/70 hover:text-error transition-colors shrink-0 p-1" title="Sil">
                ${icon("delete", "w-[18px] h-[18px]")}
              </button>
            </div>
          </div>
        </div>
      `,
        )
        .join("")
    : `
      <div class="flex-1 flex flex-col items-center justify-center p-4 text-center text-outline gap-2 min-h-[160px]">
        ${icon("shopping_cart_cancel", "w-12 h-12 opacity-50")}
        <span class="text-sm font-medium">Bu masada henüz sipariş yok.</span>
      </div>
    `;

  const breakdown = vatBreakdown(order.items);
  const subtotal = breakdown.reduce((s, b) => s + (b.gross - b.vat), 0);
  const vatLines = breakdown
    .map(
      (b) => `
          <div class="flex justify-between text-sm text-on-surface-variant">
            <span>KDV (${vatRateLabel(b.rate)} dahil)</span>
            <span class="tabular-nums whitespace-nowrap">${formatCurrency(b.vat)}</span>
          </div>`,
    )
    .join("");

  return `
    <div class="flex-1 flex flex-col h-full min-h-0 bg-surface-container-lowest">
      <div class="p-3 xl:p-4 border-b border-outline-variant bg-surface-bright flex justify-between items-center gap-2 shrink-0 min-w-0">
        <div class="min-w-0 flex-1">
          <h3 class="font-bold text-base text-on-surface truncate">${escapeHtml(order.tableName)}</h3>
          <p class="text-xs text-on-surface-variant">Adisyon #${order.orderId ?? "Yeni"}</p>
        </div>
        <div class="flex gap-1 shrink-0">
          <button type="button" data-action="print-order" data-order-id="${order.orderId ?? ""}" class="text-on-surface-variant p-2 hover:bg-surface-variant rounded-full transition-colors" title="Yazdır">
            ${icon("print", "w-4 h-4 xl:w-5 xl:h-5")}
          </button>
          <button type="button" data-action="clear-order" data-table-id="${order.tableId}" class="text-error p-2 hover:bg-error-container/20 rounded-full transition-colors" title="Siparişi Temizle">
            ${icon("delete", "w-4 h-4 xl:w-5 xl:h-5")}
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-2 xl:p-3 space-y-2 min-h-0">
        ${items}
      </div>

      <div class="p-3 xl:p-4 bg-surface-bright border-t border-outline-variant shrink-0">
        <div class="space-y-1 mb-2">
          <div class="flex justify-between text-sm text-on-surface-variant">
            <span>Ara Toplam</span>
            <span class="tabular-nums whitespace-nowrap">${formatCurrency(subtotal)}</span>
          </div>
          ${vatLines}
          <div class="flex justify-between text-on-surface pt-1.5 border-t border-outline-variant/50 mt-1.5 gap-2">
            <span class="font-bold">Toplam Tutar</span>
            <span class="tabular-nums text-primary text-lg font-bold whitespace-nowrap">${formatCurrency(order.total)}</span>
          </div>
        </div>
        <button type="button" data-action="close-order" data-table-id="${order.tableId}" class="w-full min-h-[44px] rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-opacity ${order.items.length === 0 ? "bg-surface-variant text-on-surface-variant cursor-not-allowed" : "bg-secondary text-on-secondary hover:opacity-90 active:scale-[0.98]"}">
          ${icon("payments", "w-5 h-5")}
          Ödeme Al
        </button>
      </div>
    </div>
  `;
}

function renderPosView(state: UiState): string {
  const categories = state.dashboard.categories.filter((c) => c.isActive);
  const filteredProducts = state.dashboard.products.filter((product) => {
    if (!product.isActive) return false;
    if (!state.selectedCategoryId) return true;
    return product.categoryId === state.selectedCategoryId;
  });

  return `
    <div class="flex-1 flex flex-row min-h-0 overflow-x-auto min-w-0">
      <!-- Kat Planı: her zaman solda -->
      <section class="w-40 sm:w-52 lg:w-60 xl:w-72 shrink-0 border-r border-outline-variant bg-surface flex flex-col h-full min-h-0">
        <div class="flex justify-between items-center px-2 sm:px-3 py-2 shrink-0 gap-1">
          <h2 class="font-bold text-sm sm:text-base text-on-surface truncate">Kat Planı</h2>
          <span class="text-[10px] sm:text-xs text-on-surface-variant whitespace-nowrap shrink-0">${state.dashboard.tables.length} masa</span>
        </div>
        <div class="flex-1 flex flex-col gap-2 overflow-y-auto overflow-x-hidden px-2 sm:px-3 pb-3 min-h-0">
          ${state.dashboard.tables.map((table) => tableCard(table, state.selectedTableId)).join("") || '<div class="text-xs text-on-surface-variant">Masa yok.</div>'}
        </div>
      </section>

      <!-- Ürün kataloğu: her zaman ortada -->
      <section class="flex-1 flex flex-col bg-surface p-2 sm:p-3 border-r border-outline-variant min-w-[220px] h-full min-h-0">
        <div class="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-hide shrink-0">
          <button type="button" data-action="filter-category" data-category-id="" class="px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors shrink-0 ${state.selectedCategoryId === null ? "bg-primary text-on-primary" : "bg-surface-container border border-outline-variant text-on-surface hover:bg-surface-container-high"}">Tümü</button>
          ${categories.map((c) => categoryFilter(c, state.selectedCategoryId)).join("")}
        </div>
        <div class="flex-1 overflow-y-auto min-h-0 pr-0.5">
          <div id="product-grid" class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2">
            ${filteredProducts.length ? filteredProducts.map(productCard).join("") : '<div class="col-span-full rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs font-bold text-slate-500">Ürün bulunamadı.</div>'}
          </div>
        </div>
      </section>

      <!-- Adisyon paneli: her zaman sağda -->
      <section class="w-60 sm:w-72 lg:w-80 xl:w-[360px] bg-surface-container-lowest flex flex-col h-full min-h-0 shrink-0">
        ${renderOrder(state.activeOrder)}
      </section>
    </div>
  `;
}

function renderTablePage(state: UiState): string {
  const rows = state.dashboard.tables
    .map(
      (table) => `
    <div class="bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col items-center gap-1 p-3 hover:shadow-sm transition-shadow text-center min-w-0">
      <div class="w-full font-bold text-on-surface text-sm truncate">${escapeHtml(table.name)}</div>
      <div class="text-[10px] text-on-surface-variant">Sıra: ${table.positionIndex}</div>
      <span class="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${table.status === "occupied" ? "bg-error-container text-on-error-container" : "bg-secondary-container text-on-secondary-container"}">${table.status === "occupied" ? "Dolu" : "Boş"}</span>
      <div class="flex gap-1.5 mt-auto pt-1">
        <button type="button" data-action="edit-table" data-table-id="${table.id}" class="p-2 border border-outline-variant text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors" title="Düzenle">
          ${icon("edit", "w-3.5 h-3.5")}
        </button>
        <button type="button" data-action="delete-table" data-table-id="${table.id}" class="p-2 border border-error/20 text-error hover:bg-error-container/20 rounded-lg transition-colors" title="Sil">
          ${icon("delete", "w-3.5 h-3.5")}
        </button>
      </div>
    </div>
  `,
    )
    .join("");

  return `
    <div class="flex flex-col gap-3">
      <button type="button" data-action="new-table" class="bg-surface-container border-2 border-dashed border-outline-variant hover:border-primary hover:bg-surface-container-high rounded-xl px-3 py-3 flex items-center justify-center gap-2 text-on-surface-variant hover:text-primary transition-all min-h-[48px]">
        ${icon("add_circle", "w-4 h-4")}
        <span class="font-bold text-sm">Yeni Masa Ekle</span>
      </button>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2">
        ${rows || '<div class="col-span-full text-center text-sm text-on-surface-variant py-6">Henüz masa yok.</div>'}
      </div>
    </div>
  `;
}

function renderCategoryPage(state: UiState): string {
  const rows = state.dashboard.categories
    .map(
      (category) => `
    <div class="bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col items-center gap-1 p-3 hover:shadow-sm transition-shadow text-center min-w-0">
      <div class="w-full font-bold text-on-surface text-sm truncate">${escapeHtml(category.name)}</div>
      <div class="text-[10px] text-on-surface-variant">Sıra: ${category.sortOrder}</div>
      <span class="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${category.isActive ? "bg-secondary-container text-on-secondary-container" : "bg-surface-variant text-on-surface-variant"}">${category.isActive ? "Aktif" : "Pasif"}</span>
      <div class="flex gap-1.5 mt-auto pt-1">
        <button type="button" data-action="edit-category" data-category-id="${category.id}" class="p-2 border border-outline-variant text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors" title="Düzenle">
          ${icon("edit", "w-3.5 h-3.5")}
        </button>
        <button type="button" data-action="delete-category" data-category-id="${category.id}" class="p-2 border border-error/20 text-error hover:bg-error-container/20 rounded-lg transition-colors" title="Sil">
          ${icon("delete", "w-3.5 h-3.5")}
        </button>
      </div>
    </div>
  `,
    )
    .join("");

  return `
    <div class="flex flex-col gap-3">
      <button type="button" data-action="new-category" class="bg-surface-container border-2 border-dashed border-outline-variant hover:border-primary hover:bg-surface-container-high rounded-xl px-3 py-3 flex items-center justify-center gap-2 text-on-surface-variant hover:text-primary transition-all min-h-[48px]">
        ${icon("add_circle", "w-4 h-4")}
        <span class="font-bold text-sm">Yeni Kategori Ekle</span>
      </button>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2">
        ${rows || '<div class="col-span-full text-center text-sm text-on-surface-variant py-6">Henüz kategori yok.</div>'}
      </div>
    </div>
  `;
}

function renderProductPage(state: UiState): string {
  const rows = state.dashboard.products
    .map(
      (product) => {
        const category = state.dashboard.categories.find(c => c.id === product.categoryId)?.name ?? "Kategorisiz";
        const thumb = product.imageData
          ? `<img src="${product.imageData}" alt="${escapeHtml(product.name)}" class="w-full aspect-[4/3] rounded-lg object-cover border border-outline-variant" loading="lazy" />`
          : `<div class="w-full aspect-[4/3] rounded-lg bg-surface-container border border-outline-variant flex flex-col items-center justify-center gap-1">${icon("image", "w-6 h-6 text-outline")}<span class="text-[9px] font-bold text-outline">Görsel Yok</span></div>`;

        return `
          <div class="bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col hover:shadow-sm transition-shadow overflow-hidden min-w-0">
            <div class="p-1.5">
              ${thumb}
            </div>
            <div class="px-2 pb-2 pt-1 flex flex-col items-center gap-0.5 text-center min-w-0">
              <div class="font-bold text-on-surface text-xs truncate w-full">${escapeHtml(product.name)}</div>
              <div class="text-[10px] text-on-surface-variant truncate w-full">${escapeHtml(category)}</div>
              <span class="font-bold text-xs text-primary tabular-nums whitespace-nowrap">${formatCurrency(product.price)}</span>
              <span class="text-[10px] font-bold px-1.5 py-px rounded bg-surface-container text-on-surface-variant whitespace-nowrap">KDV ${vatRateLabel(product.vatRate ?? 10)}</span>
              <div class="flex gap-1.5 mt-1">
                <button type="button" data-action="edit-product" data-product-id="${product.id}" class="p-2 border border-outline-variant text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors" title="Düzenle">
                  ${icon("edit", "w-3.5 h-3.5")}
                </button>
                <button type="button" data-action="delete-product" data-product-id="${product.id}" class="p-2 border border-error/20 text-error hover:bg-error-container/20 rounded-lg transition-colors" title="Sil">
                  ${icon("delete", "w-3.5 h-3.5")}
                </button>
              </div>
            </div>
          </div>
        `;
      }
    )
    .join("");

  return `
    <div class="flex flex-col gap-3">
      <button type="button" data-action="new-product" class="bg-surface-container border-2 border-dashed border-outline-variant hover:border-primary hover:bg-surface-container-high rounded-xl px-3 py-3 flex items-center justify-center gap-2 text-on-surface-variant hover:text-primary transition-all min-h-[48px]">
        ${icon("add_circle", "w-4 h-4")}
        <span class="font-bold text-sm">Yeni Ürün Ekle</span>
      </button>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2">
        ${rows || '<div class="col-span-full text-center text-sm text-on-surface-variant py-6">Henüz ürün yok.</div>'}
      </div>
    </div>
  `;
}

function renderSettingsWrapper(state: UiState, child: string): string {
  const currentTab = state.view;
  return `
    <div class="flex-1 flex flex-col bg-surface p-3 lg:p-6 w-full min-h-0 overflow-hidden">
      <div class="mb-4 shrink-0">
        <h2 class="font-bold text-xl text-on-surface">Sistem Ayarları</h2>
        <p class="text-on-surface-variant text-sm mt-1">Masa, kategori ve ürünlerinizi yönetin. KDV oranı her ürüne özel tanımlanır (fiyatlara dahildir).</p>
      </div>

      <div class="flex items-center justify-between gap-2 bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 mb-4 shrink-0">
        <div class="min-w-0">
          <div class="text-sm font-bold text-on-surface">Dokunmatik Klavye</div>
          <div class="text-xs text-on-surface-variant truncate">Yazı alanına dokununca Windows ekran klavyesi otomatik açılır</div>
        </div>
        <button type="button" data-action="toggle-touch-keyboard" class="relative w-12 h-7 rounded-full transition-colors shrink-0 ${state.touchKeyboardEnabled ? "bg-secondary" : "bg-surface-variant"}" title="Dokunmatik klavyeyi aç/kapat">
          <span class="absolute top-1 ${state.touchKeyboardEnabled ? "right-1" : "left-1"} w-5 h-5 rounded-full bg-white shadow transition-all"></span>
        </button>
      </div>

      <div class="flex gap-2 border-b border-outline-variant pb-2 mb-4 shrink-0 overflow-x-auto scrollbar-hide">
        <button type="button" data-action="switch-view" data-view="tables" class="px-3 py-2 text-sm transition-all flex items-center gap-1.5 rounded-lg whitespace-nowrap shrink-0 ${currentTab === "tables" ? "bg-primary text-on-primary font-bold shadow-sm" : "text-on-surface-variant hover:bg-surface-container-high/50"}">
          ${icon("table_bar", "w-[18px] h-[18px]")}
          Masalar
        </button>
        <button type="button" data-action="switch-view" data-view="categories" class="px-3 py-2 text-sm transition-all flex items-center gap-1.5 rounded-lg whitespace-nowrap shrink-0 ${currentTab === "categories" ? "bg-primary text-on-primary font-bold shadow-sm" : "text-on-surface-variant hover:bg-surface-container-high/50"}">
          ${icon("category", "w-[18px] h-[18px]")}
          Kategoriler
        </button>
        <button type="button" data-action="switch-view" data-view="products" class="px-3 py-2 text-sm transition-all flex items-center gap-1.5 rounded-lg whitespace-nowrap shrink-0 ${currentTab === "products" ? "bg-primary text-on-primary font-bold shadow-sm" : "text-on-surface-variant hover:bg-surface-container-high/50"}">
          ${icon("restaurant_menu", "w-[18px] h-[18px]")}
          Ürünler
        </button>
      </div>

      <div class="flex-1 overflow-y-auto min-h-0 pr-1 pb-6">
        ${child}
      </div>
    </div>
  `;
}

function summaryCard(label: string, value: string, sub: string): string {
  return `
    <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 min-w-0">
      <div class="text-xs text-on-surface-variant font-medium truncate">${escapeHtml(label)}</div>
      <div class="text-lg font-bold text-on-surface tabular-nums truncate mt-0.5">${escapeHtml(value)}</div>
      <div class="text-[11px] text-on-surface-variant truncate">${escapeHtml(sub)}</div>
    </div>
  `;
}

function renderDailyView(state: UiState): string {
  const summary = state.salesSummary;
  const period = state.reportPeriod || "daily";
  const selectedDate = state.selectedDate || todayLocalDate();
  const isToday = selectedDate === todayLocalDate();

  const currentWeek = getWeekRange(todayLocalDate());
  const isCurrentWeek =
    state.reportStartDate === currentWeek.start && state.reportEndDate === currentWeek.end;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const isCurrentMonth =
    state.selectedYear === currentYear && state.selectedMonth === currentMonth;

  const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  const dateOpts = state.businessDates.includes(selectedDate)
    ? state.businessDates
    : [selectedDate, ...state.businessDates];

  const orders = state.closedOrders;
  const orderRows = orders.length
    ? orders
        .map(
          (entry) => `
      <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between shadow-sm gap-3 min-w-0">
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <div class="p-2.5 bg-secondary-container/20 text-on-secondary-container rounded-lg shrink-0">
            ${icon("receipt_long", "w-6 h-6")}
          </div>
          <div class="min-w-0 flex-1">
            <div class="font-bold text-on-surface truncate">${escapeHtml(entry.tableName)}</div>
            <div class="text-sm text-on-surface-variant mt-0.5">Adisyon #${entry.orderId} • ${entry.itemCount} ürün • ${paymentLabel(entry.paymentMethod)}</div>
            <div class="text-xs text-outline mt-0.5">${formatDateTime(entry.closedAt)}</div>
          </div>
        </div>
        <div class="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          <div class="tabular-nums text-lg font-bold text-primary whitespace-nowrap">${formatCurrency(entry.total)}</div>
          <button type="button" data-action="print-receipt" data-order-id="${entry.orderId}" class="py-2 px-3 border border-outline-variant text-on-surface hover:bg-surface-container rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 min-h-[40px]">
            ${icon("print", "w-[18px] h-[18px]")} <span class="hidden sm:inline">Yeniden Yazdır</span><span class="sm:hidden">Yazdır</span>
          </button>
        </div>
      </div>
    `,
        )
        .join("")
    : `<div class="rounded-xl border border-dashed border-outline-variant p-6 text-center text-sm text-on-surface-variant">Bu dönemde kapatılmış adisyon yok.</div>`;

  const productTable = summary && summary.productSales.length
    ? `
      <div class="overflow-x-auto rounded-xl border border-outline-variant">
        <table class="w-full text-sm min-w-[520px]">
          <thead>
            <tr class="bg-surface-container text-left text-xs text-on-surface-variant">
              <th class="px-3 py-2 font-semibold">Ürün</th>
              <th class="px-3 py-2 font-semibold">Kategori</th>
              <th class="px-3 py-2 font-semibold text-right">Adet</th>
              <th class="px-3 py-2 font-semibold text-right">Tutar</th>
            </tr>
          </thead>
          <tbody>
            ${summary.productSales.map((p) => `
              <tr class="border-t border-outline-variant/50 bg-surface-container-lowest">
                <td class="px-3 py-2 font-medium text-on-surface">${escapeHtml(p.productName)}</td>
                <td class="px-3 py-2 text-on-surface-variant">${escapeHtml(p.categoryName)}</td>
                <td class="px-3 py-2 text-right tabular-nums font-bold">${p.quantity}</td>
                <td class="px-3 py-2 text-right tabular-nums text-primary font-semibold whitespace-nowrap">${formatCurrency(p.total)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `
    : `<div class="rounded-xl border border-dashed border-outline-variant p-6 text-center text-sm text-on-surface-variant">Bu dönemde ürün satışı yok.</div>`;

  const paymentChips = summary && summary.payments.length
    ? summary.payments
        .map((p) => `<span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container border border-outline-variant text-xs font-semibold whitespace-nowrap">${escapeHtml(paymentLabel(p.method))}: <span class="tabular-nums">${formatCurrency(p.total)}</span> (${p.count})</span>`)
        .join("")
    : `<span class="text-xs text-on-surface-variant">Ödeme kırılımı yok.</span>`;

  let periodControlsHtml = "";
  if (period === "daily") {
    periodControlsHtml = `
      <button type="button" data-action="prev-date" class="p-2 border border-outline-variant rounded-lg hover:bg-surface-container shrink-0 min-w-[38px] min-h-[38px] flex items-center justify-center" title="Önceki gün">${icon("chevron_left", "w-4 h-4")}</button>
      <button type="button" data-action="select-today" class="px-3 min-h-[38px] rounded-lg text-xs font-bold border border-outline-variant hover:bg-surface-container whitespace-nowrap ${isToday ? "bg-primary text-on-primary border-primary" : "text-on-surface"}">Bugün</button>
      <div class="relative flex items-center gap-1.5 bg-surface-container-lowest border border-outline-variant rounded-lg px-2.5 min-h-[38px]">
        ${icon("calendar", "w-4 h-4 text-on-surface-variant")}
        <input id="business-date-input" type="date" value="${escapeHtml(selectedDate)}" max="${escapeHtml(todayLocalDate())}" class="bg-transparent text-xs font-semibold focus:outline-none min-h-[34px]" />
      </div>
      <select id="business-date-select" class="bg-surface-container-lowest border border-outline-variant rounded-lg px-2.5 text-xs font-semibold min-h-[38px] max-w-[180px]">
        ${dateOpts.map((d) => `<option value="${escapeHtml(d)}" ${d === selectedDate ? "selected" : ""}>${escapeHtml(d === todayLocalDate() ? "Bugün" : formatDateShort(d))} — ${escapeHtml(d)}</option>`).join("")}
      </select>
      <button type="button" data-action="next-date" ${isToday ? "disabled" : ""} class="p-2 border border-outline-variant rounded-lg hover:bg-surface-container shrink-0 min-w-[38px] min-h-[38px] flex items-center justify-center disabled:opacity-40" title="Sonraki gün">${icon("chevron_right", "w-4 h-4")}</button>
    `;
  } else if (period === "weekly") {
    periodControlsHtml = `
      <button type="button" data-action="prev-week" class="p-2 border border-outline-variant rounded-lg hover:bg-surface-container shrink-0 min-w-[38px] min-h-[38px] flex items-center justify-center" title="Önceki hafta">${icon("chevron_left", "w-4 h-4")}</button>
      <button type="button" data-action="select-current-week" class="px-3 min-h-[38px] rounded-lg text-xs font-bold border border-outline-variant hover:bg-surface-container whitespace-nowrap ${isCurrentWeek ? "bg-primary text-on-primary border-primary" : "text-on-surface"}">Bu Hafta</button>
      <div class="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant rounded-lg px-3 min-h-[38px] text-xs font-bold text-on-surface">
        ${icon("calendar", "w-4 h-4 text-on-surface-variant")}
        <span>${escapeHtml(state.reportLabel)}</span>
      </div>
      <button type="button" data-action="next-week" ${isCurrentWeek ? "disabled" : ""} class="p-2 border border-outline-variant rounded-lg hover:bg-surface-container shrink-0 min-w-[38px] min-h-[38px] flex items-center justify-center disabled:opacity-40" title="Sonraki hafta">${icon("chevron_right", "w-4 h-4")}</button>
    `;
  } else if (period === "monthly") {
    periodControlsHtml = `
      <button type="button" data-action="prev-month" class="p-2 border border-outline-variant rounded-lg hover:bg-surface-container shrink-0 min-w-[38px] min-h-[38px] flex items-center justify-center" title="Önceki ay">${icon("chevron_left", "w-4 h-4")}</button>
      <button type="button" data-action="select-current-month" class="px-3 min-h-[38px] rounded-lg text-xs font-bold border border-outline-variant hover:bg-surface-container whitespace-nowrap ${isCurrentMonth ? "bg-primary text-on-primary border-primary" : "text-on-surface"}">Bu Ay</button>
      <div class="flex items-center gap-1.5">
        <select id="report-month-select" class="bg-surface-container-lowest border border-outline-variant rounded-lg px-2.5 text-xs font-bold min-h-[38px]">
          ${TURKISH_MONTHS.map((m, idx) => `<option value="${idx + 1}" ${idx + 1 === state.selectedMonth ? "selected" : ""}>${m}</option>`).join("")}
        </select>
        <select id="report-year-select" class="bg-surface-container-lowest border border-outline-variant rounded-lg px-2 text-xs font-bold min-h-[38px]">
          ${yearOptions.map((y) => `<option value="${y}" ${y === state.selectedYear ? "selected" : ""}>${y}</option>`).join("")}
        </select>
      </div>
      <button type="button" data-action="next-month" ${isCurrentMonth ? "disabled" : ""} class="p-2 border border-outline-variant rounded-lg hover:bg-surface-container shrink-0 min-w-[38px] min-h-[38px] flex items-center justify-center disabled:opacity-40" title="Sonraki ay">${icon("chevron_right", "w-4 h-4")}</button>
    `;
  } else {
    periodControlsHtml = `
      <div class="flex items-center gap-2 flex-wrap">
        <div class="flex items-center gap-1 bg-surface-container-lowest border border-outline-variant rounded-lg px-2.5 min-h-[38px]">
          <span class="text-xs font-semibold text-on-surface-variant">Başlangıç:</span>
          <input id="report-start-date-input" type="date" value="${escapeHtml(state.reportStartDate)}" max="${escapeHtml(todayLocalDate())}" class="bg-transparent text-xs font-semibold focus:outline-none" />
        </div>
        <div class="flex items-center gap-1 bg-surface-container-lowest border border-outline-variant rounded-lg px-2.5 min-h-[38px]">
          <span class="text-xs font-semibold text-on-surface-variant">Bitiş:</span>
          <input id="report-end-date-input" type="date" value="${escapeHtml(state.reportEndDate)}" max="${escapeHtml(todayLocalDate())}" class="bg-transparent text-xs font-semibold focus:outline-none" />
        </div>
        <button type="button" data-action="apply-custom-range" class="px-3.5 min-h-[38px] rounded-lg text-xs font-bold bg-primary text-on-primary hover:opacity-90 transition-opacity">
          Getir
        </button>
      </div>
    `;
  }

  const periodSubtitle = summary
    ? `${summary.startDate === summary.endDate ? formatDateShort(summary.startDate) : `${formatDateShort(summary.startDate)} — ${formatDateShort(summary.endDate)}`} • Toplam ${summary.orderCount} adisyon, ${summary.itemCount} ürün satışı.`
    : "Seçilen dönemin Z Raporu ve detaylı satış dökümü.";

  return `
    <div class="flex-1 flex flex-col bg-surface p-3 lg:p-6 w-full min-h-0 overflow-hidden">
      <div class="mb-4 shrink-0 flex flex-col gap-3">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="min-w-0">
            <h2 class="font-bold text-xl text-on-surface truncate">Z Raporu & Satış Özeti — ${escapeHtml(summary?.label || state.reportLabel)}</h2>
            <p class="text-on-surface-variant text-sm mt-0.5">${escapeHtml(periodSubtitle)}</p>
          </div>
          <div class="flex items-center gap-2 flex-wrap shrink-0">
            <button type="button" data-action="print-daily-report" class="min-h-[44px] px-4 rounded-lg bg-secondary text-on-secondary text-sm font-bold hover:opacity-90 flex items-center gap-2 whitespace-nowrap shadow-sm">
              ${icon("print", "w-4 h-4")} Z Raporu Yazdır
            </button>
          </div>
        </div>

        <div class="flex items-center justify-between gap-3 flex-wrap">
          <!-- Dönem Sekmeleri: Günlük / Haftalık / Aylık / Özel -->
          <div class="inline-flex rounded-xl bg-surface-container p-1 border border-outline-variant/60 gap-1 shrink-0">
            <button type="button" data-action="set-period" data-period="daily" class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${period === "daily" ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"}">
              Günlük
            </button>
            <button type="button" data-action="set-period" data-period="weekly" class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${period === "weekly" ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"}">
              Haftalık
            </button>
            <button type="button" data-action="set-period" data-period="monthly" class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${period === "monthly" ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"}">
              Aylık
            </button>
            <button type="button" data-action="set-period" data-period="custom" class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${period === "custom" ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"}">
              Özel Aralık
            </button>
          </div>

          <!-- Seçili Döneme Özel Filtre Butonları -->
          <div class="flex items-center gap-2 flex-wrap min-w-0">
            ${periodControlsHtml}
          </div>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto min-h-0 pr-1 pb-6 space-y-4">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-2">
          ${summaryCard("Toplam Ciro", formatCurrency(summary?.total ?? 0), `${summary?.orderCount ?? 0} adisyon`)}
          ${summaryCard("Adisyon Sayısı", String(summary?.orderCount ?? 0), `Ortalama sepet ${formatCurrency(summary?.averageBasket ?? 0)}`)}
          ${summaryCard("Satılan Ürün", String(summary?.itemCount ?? 0), `${summary?.productSales.length ?? 0} çeşit`)}
          ${summaryCard("Ödeme Kırılımı", String(summary?.payments.length ?? 0), "farklı yöntem")}
        </div>

        <div class="flex items-center gap-2 flex-wrap">${paymentChips}</div>

        <div>
          <h3 class="font-bold text-base text-on-surface mb-2">Ürün Bazında Satış — ${escapeHtml(summary?.label || "")}</h3>
          ${productTable}
        </div>

        <div>
          <h3 class="font-bold text-base text-on-surface mb-2">Kapanan Adisyonlar (${orders.length})</h3>
          <div class="space-y-2">${orderRows}</div>
        </div>
      </div>
    </div>
  `;
}

function renderTableModal(state: UiState): string {
  const inputClass = "bg-surface-container border border-outline-variant rounded-lg px-3 min-h-[48px] text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full font-semibold";
  return `
    <div class="space-y-4">
      <div>
        <label class="block text-xs font-bold text-on-surface-variant mb-1.5">Masa Adı</label>
        <input id="table-name-input" value="${escapeHtml(state.tableDraft.name)}" class="${inputClass}" placeholder="Örn: Masa 1" />
      </div>
      <div class="flex justify-end gap-2 border-t border-outline-variant/30 pt-4 mt-4">
        <button type="button" data-action="close-modal" class="border border-outline-variant text-on-surface-variant hover:bg-surface-container rounded-lg text-sm font-medium px-5 min-h-[44px] transition-colors">İptal</button>
        <button type="button" data-action="save-table" class="bg-secondary text-on-secondary px-5 min-h-[44px] rounded-lg text-sm hover:opacity-90 font-bold transition-opacity shadow-sm flex items-center justify-center">${state.tableDraft.id ? "Güncelle" : "Ekle"}</button>
      </div>
    </div>
  `;
}

function renderCategoryModal(state: UiState): string {
  const inputClass = "bg-surface-container border border-outline-variant rounded-lg px-3 min-h-[48px] text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full font-semibold";
  return `
    <div class="space-y-4">
      <div>
        <label class="block text-xs font-bold text-on-surface-variant mb-1.5">Kategori Adı</label>
        <input id="category-name-input" value="${escapeHtml(state.categoryDraft.name)}" class="${inputClass}" placeholder="Örn: Tatlılar" />
      </div>
      <div class="flex justify-end gap-2 border-t border-outline-variant/30 pt-4 mt-4">
        <button type="button" data-action="close-modal" class="border border-outline-variant text-on-surface-variant hover:bg-surface-container rounded-lg text-sm font-medium px-5 min-h-[44px] transition-colors">İptal</button>
        <button type="button" data-action="save-category" class="bg-secondary text-on-secondary px-5 min-h-[44px] rounded-lg text-sm hover:opacity-90 font-bold transition-opacity shadow-sm flex items-center justify-center">${state.categoryDraft.id ? "Güncelle" : "Ekle"}</button>
      </div>
    </div>
  `;
}

function renderProductModal(state: UiState): string {
  const draft = state.productDraft;
  const inputClass = "bg-surface-container border border-outline-variant rounded-lg px-3 min-h-[48px] text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full font-semibold";
  const options = state.dashboard.categories
    .map(
      (c) =>
        `<option value="${c.id}" ${draft.categoryId === c.id ? "selected" : ""}>${escapeHtml(c.name)}</option>`,
    )
    .join("");

  return `
    <div class="space-y-4">
      <div>
        <label class="block text-xs font-bold text-on-surface-variant mb-1.5">Ürün Adı</label>
        <input id="product-name-input" value="${escapeHtml(draft.name)}" class="${inputClass}" placeholder="Örn: Klasik Burger" />
      </div>
      <div>
        <label class="block text-xs font-bold text-on-surface-variant mb-1.5">Kategori</label>
        <select id="product-category-input" class="${inputClass}">
          <option value="">Kategori seçin</option>
          ${options}
        </select>
      </div>
      <div>
        <label class="block text-xs font-bold text-on-surface-variant mb-1.5">Fiyat (TL, KDV dahil)</label>
        <input id="product-price-input" type="number" min="0" step="0.01" value="${escapeHtml(draft.price)}" class="${inputClass}" placeholder="0.00" />
      </div>
      <div>
        <label class="block text-xs font-bold text-on-surface-variant mb-1.5">KDV Oranı (fiyata dahil)</label>
        <select id="product-vat-input" class="${inputClass}">
          ${[1, 10, 20].map((r) => `<option value="${r}" ${Number(draft.vatRate) === r ? "selected" : ""}>%${r} KDV dahil</option>`).join("")}
          ${![1, 10, 20].includes(Number(draft.vatRate)) ? `<option value="${draft.vatRate}" selected>%${draft.vatRate} KDV dahil</option>` : ""}
        </select>
      </div>
      <div>
        <label class="block text-xs font-bold text-on-surface-variant mb-1.5">Görsel Yükle</label>
        <div class="flex items-center gap-3 flex-wrap">
          <input id="product-image-input" type="file" accept="image/*" class="hidden" />
          <button type="button" onclick="document.getElementById('product-image-input').click()" class="border border-outline-variant text-on-surface hover:bg-surface-container min-h-[44px] px-4 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap">
            ${icon("upload", "w-[18px] h-[18px]")} Dosya Seç
          </button>
          <span class="text-xs text-on-surface-variant truncate max-w-[200px]" id="selected-file-label">${draft.imageData ? "Görsel yüklendi" : "Görsel seçilmedi"}</span>
        </div>
      </div>
      ${
        draft.imageData
          ? `
        <div class="mt-2">
          <label class="block text-xs font-bold text-on-surface-variant mb-1.5">Önizleme (4:3 Kırpılmış)</label>
          <div class="aspect-[4/3] w-full overflow-hidden rounded-xl border border-outline-variant bg-surface-container">
            <img src="${draft.imageData}" alt="Önizleme" class="h-full w-full object-cover" />
          </div>
        </div>
      `
          : ""
      }
      <div class="flex justify-end gap-2 border-t border-outline-variant/30 pt-4 mt-4">
        <button type="button" data-action="close-modal" class="border border-outline-variant text-on-surface-variant hover:bg-surface-container rounded-lg text-sm font-medium px-5 min-h-[44px] transition-colors">İptal</button>
        <button type="button" data-action="save-product" class="bg-secondary text-on-secondary px-5 min-h-[44px] rounded-lg text-sm hover:opacity-90 font-bold transition-opacity shadow-sm flex items-center justify-center">${draft.id ? "Güncelle" : "Ekle"}</button>
      </div>
    </div>
  `;
}

function renderNewOrderModal(): string {
  return `
    <div class="flex flex-col gap-3">
      <button type="button" data-action="new-table-order" class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-3 flex items-center gap-3 hover:border-primary hover:shadow-sm transition-all text-left cursor-pointer min-h-[64px]">
        <div class="w-12 h-12 rounded-xl bg-secondary-container/20 text-secondary flex items-center justify-center shrink-0">
          ${icon("table_bar", "w-6 h-6")}
        </div>
        <div class="min-w-0">
          <div class="font-bold text-on-surface">Masa Siparişi</div>
          <div class="text-xs text-on-surface-variant mt-px">Restoran masasına yeni sipariş oluştur</div>
        </div>
      </button>
      <button type="button" data-action="new-package-order" class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-3 flex items-center gap-3 hover:border-primary hover:shadow-sm transition-all text-left cursor-pointer min-h-[64px]">
        <div class="w-12 h-12 rounded-xl bg-secondary-container/20 text-secondary flex items-center justify-center shrink-0">
          ${icon("receipt_long", "w-6 h-6")}
        </div>
        <div class="min-w-0">
          <div class="font-bold text-on-surface">Paket Siparişi</div>
          <div class="text-xs text-on-surface-variant mt-px">Paket / götürme siparişi oluştur</div>
        </div>
      </button>
    </div>
  `;
}

function renderPackageOrderModal(): string {
  const inputClass = "bg-surface-container border border-outline-variant rounded-lg px-3 min-h-[48px] text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full font-semibold";
  return `
    <div class="space-y-4">
      <div>
        <label class="block text-xs font-bold text-on-surface-variant mb-1.5">Müşteri Adı <span class="font-normal">(opsiyonel — boş bırakılırsa otomatik verilir)</span></label>
        <input id="package-customer-input" class="${inputClass}" placeholder="Örn: Ahmet Yılmaz" />
        <p class="text-[11px] text-on-surface-variant mt-1">Boş bırakırsanız o güne özel otomatik isim verilir: Paket Sipariş 1, Paket Sipariş 2...</p>
      </div>
      <div class="flex justify-end gap-2 border-t border-outline-variant/30 pt-4 mt-4">
        <button type="button" data-action="close-modal" class="border border-outline-variant text-on-surface-variant hover:bg-surface-container rounded-lg text-sm font-medium px-5 min-h-[44px] transition-colors">İptal</button>
        <button type="button" data-action="save-package-order" class="bg-secondary text-on-secondary px-5 min-h-[44px] rounded-lg text-sm hover:opacity-90 font-bold transition-opacity shadow-sm flex items-center justify-center">Oluştur</button>
      </div>
    </div>
  `;
}

function renderTableSelectModal(state: UiState): string {
  const tables = state.dashboard.tables.filter((t) => !t.name.startsWith("Paket"));
  if (!tables.length) {
    return `<div class="text-center py-6 text-on-surface-variant text-sm">Henüz masa bulunmuyor. Önce masa ekleyin.</div>`;
  }
  return `
    <div class="flex flex-col gap-1.5 max-h-[50vh] overflow-y-auto pr-1">
      ${tables.map(
        (t) => `
        <button type="button" data-action="select-table-and-close" data-table-id="${t.id}" class="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-2.5 py-2.5 flex items-center gap-2 hover:border-primary hover:shadow-sm transition-all text-left cursor-pointer min-h-[56px]">
          <div class="w-1 h-7 ${t.status === "occupied" ? "bg-error" : "bg-secondary"} rounded-full shrink-0"></div>
          <div class="flex-1 min-w-0">
            <div class="font-bold text-on-surface text-sm truncate">${escapeHtml(t.name)}</div>
            <div class="text-[10px] text-on-surface-variant">${t.status === "occupied" ? "Dolu" : "Boş"}</div>
          </div>
          <span class="tabular-nums text-xs text-primary whitespace-nowrap shrink-0">${formatCurrency(t.currentTotal)}</span>
        </button>
        `,
      ).join("")}
    </div>
  `;
}

function renderDailyReportModal(state: UiState): string {
  const s = state.dailySummary;
  if (!s) {
    return `<div class="text-center py-6 text-sm text-on-surface-variant">Özet yükleniyor...</div>`;
  }
  return `
    <div class="space-y-3 text-sm">
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <div class="font-bold text-on-surface">${escapeHtml(formatDayLabel(s.date))} — ${escapeHtml(s.date)}</div>
        ${s.isClosed ? `<span class="text-[11px] font-bold px-2 py-1 rounded bg-secondary-container/30 text-on-secondary-container">KAPANDI</span>` : `<span class="text-[11px] font-bold px-2 py-1 rounded bg-surface-container text-on-surface-variant">AÇIK</span>`}
      </div>
      <div class="grid grid-cols-2 gap-2">
        ${summaryCard("Ciro", formatCurrency(s.total), `${s.orderCount} adisyon`)}
        ${summaryCard("Ürün", `${s.itemCount} adet`, `Sepet ${formatCurrency(s.averageBasket)}`)}
      </div>
      <div class="max-h-[30vh] overflow-y-auto rounded-xl border border-outline-variant">
        <table class="w-full text-xs min-w-[380px]">
          <thead><tr class="bg-surface-container text-left"><th class="px-2 py-1.5">Ürün</th><th class="px-2 py-1.5 text-right">Adet</th><th class="px-2 py-1.5 text-right">Tutar</th></tr></thead>
          <tbody>${s.productSales.map((p) => `<tr class="border-t border-outline-variant/40"><td class="px-2 py-1.5">${escapeHtml(p.productName)}</td><td class="px-2 py-1.5 text-right tabular-nums font-bold">${p.quantity}</td><td class="px-2 py-1.5 text-right tabular-nums">${formatCurrency(p.total)}</td></tr>`).join("") || `<tr><td colspan="3" class="px-2 py-3 text-center text-on-surface-variant">Satış yok</td></tr>`}</tbody>
        </table>
      </div>
      <button type="button" data-action="print-daily-report" class="w-full min-h-[44px] rounded-lg bg-secondary text-on-secondary text-sm font-bold flex items-center justify-center gap-2">${icon("print", "w-4 h-4")} Z Raporunu Yazdır</button>
    </div>
  `;
}

const modalTitles: Record<FormModal, (state: UiState) => string> = {
  table: (s) => (s.tableDraft.id ? "Masayı Düzenle" : "Yeni Masa Ekle"),
  category: (s) => (s.categoryDraft.id ? "Kategoriyi Düzenle" : "Yeni Kategori Ekle"),
  product: (s) => (s.productDraft.id ? "Ürünü Düzenle" : "Yeni Ürün Ekle"),
  "new-order": () => "Yeni Sipariş",
  "package-order": () => "Paket Siparişi",
  "table-select": () => "Masa Seçin",
  "daily-report": () => "Gün Sonu Raporu",
};

function renderModal(state: UiState): string {
  if (!state.activeModal) return "";

  let body = "";
  let iconName = "edit_note";
  switch (state.activeModal) {
    case "table":
      body = renderTableModal(state);
      break;
    case "category":
      body = renderCategoryModal(state);
      break;
    case "product":
      body = renderProductModal(state);
      break;
    case "new-order":
      body = renderNewOrderModal();
      iconName = "add_circle";
      break;
    case "package-order":
      body = renderPackageOrderModal();
      iconName = "receipt_long";
      break;
    case "table-select":
      body = renderTableSelectModal(state);
      iconName = "table_bar";
      break;
    case "daily-report":
      body = renderDailyReportModal(state);
      iconName = "receipt_long";
      break;
  }

  return `
    <div class="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-2 backdrop-blur-sm sm:items-center sm:p-4">
      <div class="max-h-[92dvh] w-full max-w-[500px] overflow-y-auto rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-xl flex flex-col">
        <div class="mb-4 flex items-center justify-between pb-2 border-b border-outline-variant/30 shrink-0 gap-2">
          <h2 class="text-base font-bold text-on-surface flex items-center gap-2 min-w-0">
            ${icon(iconName, "w-5 h-5 text-primary")}
            <span class="truncate">${modalTitles[state.activeModal](state)}</span>
          </h2>
          <button type="button" data-action="close-modal" class="p-2.5 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors shrink-0" title="Kapat">
            ${icon("close", "w-5 h-5")}
          </button>
        </div>
        <div class="flex-1 min-w-0">
          ${body}
        </div>
      </div>
    </div>
  `;
}

function renderView(state: UiState): string {
  switch (state.view) {
    case "tables":
      return renderSettingsWrapper(state, renderTablePage(state));
    case "categories":
      return renderSettingsWrapper(state, renderCategoryPage(state));
    case "products":
      return renderSettingsWrapper(state, renderProductPage(state));
    case "history":
      return renderDailyView(state);
    case "pos":
    default:
      return renderPosView(state);
  }
}

function paymentSelectHtml(selected: PaymentMethod): string {
  const opts: { id: PaymentMethod; label: string; iconName: string }[] = [
    { id: "cash", label: PAYMENT_LABELS.cash, iconName: "cash" },
    { id: "card", label: PAYMENT_LABELS.card, iconName: "card" },
    { id: "other", label: PAYMENT_LABELS.other, iconName: "receipt_long" },
  ];
  return `
    <div class="w-full">
      <div class="text-xs font-bold text-gray-500 mb-2 text-left">Ödeme yöntemi seçin (geçmişe işlenir):</div>
      <div style="display:flex;gap:8px;">
        ${opts.map((o) => `
          <button type="button" data-action="select-payment" data-method="${o.id}"
            style="flex:1;min-height:52px;border-radius:10px;border:${selected === o.id ? "2px solid #006c49" : "1px solid #d1d5db"};background:${selected === o.id ? "#ecfdf5" : "#ffffff"};color:#111827;font-size:0.8rem;font-weight:700;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;">
            ${icon(o.iconName, "w-5 h-5 pointer-events-none")}
            ${o.label}
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function renderConfirmDialog(dialog: ConfirmDialog | null, pendingPayment: PaymentMethod): string {
  if (!dialog) return "";
  const isDanger = dialog.danger !== false;

  const iconBg = isDanger ? "#fee2e2" : "#dcfce7";
  const iconColor = isDanger ? "#dc2626" : "#15803d";
  const confirmBg = isDanger ? "#dc2626" : "#15803d";
  const iconHtml = isDanger
    ? icon("warning", "w-10 h-10 pointer-events-none")
    : icon("help", "w-10 h-10 pointer-events-none");

  const hasPrint = dialog.confirmPrintLabel && dialog.onConfirmPrint;

  return `
    <div style="position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;">
      <div style="position:absolute;inset:0;background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);" data-action="confirm-no"></div>
      <div style="position:relative;z-index:10;background:#ffffff;border-radius:1rem;box-shadow:0 20px 60px rgba(0,0,0,0.25);border:1px solid #e5e7eb;width:100%;max-width:420px;max-height:92dvh;overflow-y:auto;">
        <div style="display:flex;flex-direction:column;align-items:center;gap:14px;padding:28px 24px 20px;text-align:center;">
          <div style="border-radius:9999px;background:${iconBg};padding:14px;display:flex;align-items:center;justify-content:center;color:${iconColor};">
            ${iconHtml}
          </div>
          <div style="width:100%;">
            <h2 style="font-size:1.1rem;font-weight:700;color:#111827;margin:0 0 6px 0;line-height:1.4;">${escapeHtml(dialog.message)}</h2>
            ${dialog.subMessage ? `<p style="font-size:0.85rem;color:#6b7280;margin:0;line-height:1.5;">${escapeHtml(dialog.subMessage)}</p>` : ""}
          </div>
          ${dialog.showPaymentSelect ? paymentSelectHtml(pendingPayment) : ""}
        </div>
        <div style="display:flex;gap:12px;padding:0 20px 20px;${hasPrint ? "flex-wrap:wrap;" : ""}">
          <button type="button" data-action="confirm-no"
            style="flex:1;height:48px;border-radius:10px;border:1px solid #d1d5db;background:#ffffff;color:#374151;font-size:0.875rem;font-weight:600;cursor:pointer;min-width:80px;"
            onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='#ffffff'">
            Vazgeç
          </button>
          <button type="button" data-action="confirm-yes"
            style="flex:1;height:48px;border-radius:10px;border:none;background:${confirmBg};color:#ffffff;font-size:0.875rem;font-weight:600;cursor:pointer;min-width:80px;"
            onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
            ${escapeHtml(dialog.confirmLabel ?? "Evet")}
          </button>
          ${hasPrint ? `
          <button type="button" data-action="confirm-print"
            style="flex:1;min-width:100%;min-height:48px;border-radius:10px;border:2px solid ${confirmBg};background:#ffffff;color:#111827;font-size:0.875rem;font-weight:600;cursor:pointer;padding:8px;"
            onmouseover="this.style.background='#f0fdf4'" onmouseout="this.style.background='#ffffff'">
            ${icon("print", "w-4 h-4 inline-block align-text-bottom pointer-events-none")} ${escapeHtml(dialog.confirmPrintLabel!)}
          </button>
          ` : ""}
        </div>
      </div>
    </div>
  `;
}

export function renderApp(state: UiState): string {
  const isPos = state.view === "pos";
  const isHistory = state.view === "history";
  const isSettings = ["tables", "categories", "products"].includes(state.view);

  return `
    <div class="flex-1 flex flex-col h-full min-h-0 bg-surface-bright">
      <header class="shrink-0 bg-surface-bright border-b border-outline-variant px-3 lg:px-6 py-2 w-full z-40">
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <div class="flex items-center gap-3 lg:gap-6 min-w-0">
            <h1 class="text-base font-bold text-secondary flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0" data-action="switch-view" data-view="pos">
              ${icon("restaurant", "w-6 h-6 text-secondary")}
              <span class="hidden xs:inline sm:inline">Samsa POS</span>
            </h1>
            <nav class="flex items-center gap-3 lg:gap-5 overflow-x-auto scrollbar-hide">
              <button type="button" data-action="switch-view" data-view="pos" class="py-1.5 flex items-center text-sm transition-colors border-b-2 whitespace-nowrap shrink-0 ${isPos ? "text-primary font-bold border-primary" : "text-on-surface-variant border-transparent hover:text-primary"}">
                Masa Sipariş
              </button>
              <button type="button" data-action="switch-view" data-view="history" class="py-1.5 flex items-center text-sm transition-colors border-b-2 whitespace-nowrap shrink-0 ${isHistory ? "text-primary font-bold border-primary" : "text-on-surface-variant border-transparent hover:text-primary"}">
                Z Raporu & Satışlar
              </button>
            </nav>
          </div>
          <div class="flex items-center gap-2 min-w-0">
            <div class="relative hidden md:block">
              <input id="global-search-input" class="bg-surface-container border border-outline-variant rounded-full pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-48 lg:w-64" placeholder="Menü veya masa ara..." type="text">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">${icon("search", "w-4 h-4")}</span>
            </div>
            <div class="flex gap-1 shrink-0">
              <button type="button" data-action="toggle-fullscreen" class="p-2.5 text-on-surface-variant hover:bg-surface-container-high/50 rounded-full transition-colors" title="${state.isFullscreen ? "Pencere Modu" : "Tam Ekran"}">
                ${icon(state.isFullscreen ? "fullscreen_exit" : "fullscreen", "w-5 h-5")}
              </button>
              <button type="button" data-action="switch-view" data-view="tables" class="p-2.5 ${isSettings ? "text-primary bg-surface-container-high" : "text-on-surface-variant"} hover:bg-surface-container-high/50 rounded-full transition-colors" title="Ayarlar">
                ${icon("settings", "w-5 h-5")}
              </button>
            </div>
            <button type="button" data-action="new-order" class="bg-secondary text-on-secondary px-3 lg:px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 whitespace-nowrap shrink-0 min-h-[40px]">
              ${icon("add_circle", "w-4 h-4")} <span class="hidden sm:inline">Yeni Sipariş</span><span class="sm:hidden">Yeni</span>
            </button>
          </div>
        </div>
        <div class="relative mt-2 md:hidden">
          <input id="global-search-input-mobile" class="bg-surface-container border border-outline-variant rounded-full pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full" placeholder="Menü veya masa ara..." type="text">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">${icon("search", "w-4 h-4")}</span>
        </div>
      </header>
      <main class="flex-1 flex min-h-0 overflow-hidden w-full bg-surface-bright">
        ${renderView(state)}
      </main>
      ${renderModal(state)}
      ${renderConfirmDialog(state.confirmDialog, state.pendingPaymentMethod)}
      ${
        state.loading
          ? `<div class="pointer-events-none fixed inset-0 z-[10001] grid place-items-center bg-white/50 backdrop-blur-sm"><div class="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900 shadow-sm flex items-center gap-2">${icon("sync", "w-5 h-5 animate-spin")}Yükleniyor...</div></div>`
          : ""
      }
      ${
        state.toast
          ? `<div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10002] rounded-xl border px-4 py-2.5 text-sm font-bold shadow-lg flex items-center gap-2 max-w-[calc(100vw-2rem)] ${state.toast.type === "success" ? "border-secondary-container bg-secondary-container/20 text-on-secondary-container" : "border-error-container bg-error-container/20 text-on-error-container"}">
              ${icon(state.toast.type === "success" ? "check_circle" : "error", "w-5 h-5")}
              <span class="truncate">${escapeHtml(state.toast.message)}</span>
             </div>`
          : ""
      }
    </div>
  `;
}

export function buildReceiptHtml(order: OrderDetail): string {
  const rows = order.items
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.productName)}</td>
        <td>${item.quantity}</td>
        <td>${formatCurrency(item.unitPrice)}</td>
        <td>${formatCurrency(item.lineTotal)}</td>
      </tr>
    `,
    )
    .join("");

  const breakdown = vatBreakdown(order.items);
  const subtotal = breakdown.reduce((s, b) => s + (b.gross - b.vat), 0);
  const vatLines = breakdown
    .map((b) => `<div><span>KDV (${vatRateLabel(b.rate)} dahil):</span><span>${formatCurrency(b.vat)}</span></div>`)
    .join("");

  return `
    <!doctype html>
    <html lang="tr">
      <head>
        <meta charset="UTF-8" />
        <title>Fiş - ${escapeHtml(order.tableName)}</title>
        <style>
          @page { width: 80mm; margin: 0; }
          body { font-family: 'Courier New', monospace; width: 80mm; padding: 4mm 3mm; color: #000; background: #fff; font-size: 10px; line-height: 1.3; }
          h1, h2, p { margin: 0; }
          .header { text-align: center; margin-bottom: 4mm; border-bottom: 1px dashed #ccc; padding-bottom: 3mm; }
          .header h1 { font-size: 14px; font-weight: 700; }
          .muted { font-size: 9px; color: #555; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 3mm; }
          th, td { padding: 2mm 0; text-align: left; font-size: 9px; border-bottom: 1px dotted #ddd; }
          th { font-weight: 700; border-bottom: 1px solid #000; }
          td:last-child, th:last-child { text-align: right; }
          td:nth-child(2), th:nth-child(2) { text-align: center; }
          .lines { margin-top: 2mm; font-size: 9px; }
          .lines div { display: flex; justify-content: space-between; }
          .total { margin-top: 3mm; font-size: 12px; font-weight: 700; text-align: right; border-top: 1px dashed #ccc; padding-top: 2mm; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Samsa POS</h1>
          <p class="muted">${escapeHtml(order.tableName)}</p>
          <p class="muted">Fiş #${order.orderId ?? "Yeni"}</p>
          <p class="muted">${escapeHtml(formatDateTime(order.openedAt))}</p>
          ${order.businessDate ? `<p class="muted">İş günü: ${escapeHtml(order.businessDate)}</p>` : ""}
          <p class="muted">Ödeme: ${escapeHtml(paymentLabel(order.paymentMethod))}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Ürün</th>
              <th>Adet</th>
              <th>Birim</th>
              <th>Tutar</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="lines">
          <div><span>Ara Toplam:</span><span>${formatCurrency(subtotal)}</span></div>
          ${vatLines}
        </div>
        <div class="total">Toplam: ${formatCurrency(order.total)}</div>
      </body>
    </html>
  `;
}

export function buildDailyReportHtml(summary: SalesPeriodSummary | DailySummary): string {
  const isPeriod = "label" in summary;
  const label = isPeriod ? summary.label : formatDayLabel((summary as DailySummary).date);
  const rangeText = isPeriod
    ? (summary.startDate === summary.endDate
        ? formatDateShort(summary.startDate)
        : `${formatDateShort(summary.startDate)} — ${formatDateShort(summary.endDate)}`)
    : formatDateShort((summary as DailySummary).date);

  const productRows = summary.productSales
    .map(
      (p) => `
      <tr>
        <td>${escapeHtml(p.productName)}</td>
        <td>${p.quantity}</td>
        <td>${formatCurrency(p.total)}</td>
      </tr>
    `,
    )
    .join("");
  const paymentRows = summary.payments
    .map(
      (p) =>
        `<div><span>${escapeHtml(paymentLabel(p.method))} (${p.count}):</span><span>${formatCurrency(p.total)}</span></div>`,
    )
    .join("");

  return `
    <!doctype html>
    <html lang="tr">
      <head>
        <meta charset="UTF-8" />
        <title>Z Raporu - ${escapeHtml(label)}</title>
        <style>
          @page { width: 80mm; margin: 0; }
          body { font-family: 'Courier New', monospace; width: 80mm; padding: 4mm 3mm; color: #000; background: #fff; font-size: 10px; line-height: 1.3; }
          h1, p { margin: 0; }
          .header { text-align: center; margin-bottom: 4mm; border-bottom: 1px dashed #ccc; padding-bottom: 3mm; }
          .header h1 { font-size: 14px; font-weight: 700; }
          .period { font-size: 11px; font-weight: 700; margin-top: 2px; }
          .muted { font-size: 9px; color: #555; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 3mm; }
          th, td { padding: 2mm 0; text-align: left; font-size: 9px; border-bottom: 1px dotted #ddd; }
          th { border-bottom: 1px solid #000; font-weight: 700; }
          td:last-child, th:last-child { text-align: right; }
          td:nth-child(2), th:nth-child(2) { text-align: center; }
          .lines { margin-top: 2mm; font-size: 9px; }
          .lines div { display: flex; justify-content: space-between; }
          .total { margin-top: 3mm; font-size: 12px; font-weight: 700; text-align: right; border-top: 1px dashed #ccc; padding-top: 2mm; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Samsa POS</h1>
          <p class="period">Z RAPORU</p>
          <p class="period">${escapeHtml(label)}</p>
          <p class="muted">Tarih Aralığı: ${escapeHtml(rangeText)}</p>
          <p class="muted">Yazdırma: ${new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "medium" }).format(new Date())}</p>
        </div>
        <div class="lines">
          <div><span>Adisyon:</span><span>${summary.orderCount}</span></div>
          <div><span>Ürün adedi:</span><span>${summary.itemCount}</span></div>
          <div><span>Ortalama sepet:</span><span>${formatCurrency(summary.averageBasket)}</span></div>
          ${paymentRows}
        </div>
        <table>
          <thead><tr><th>Ürün</th><th>Adet</th><th>Tutar</th></tr></thead>
          <tbody>${productRows || `<tr><td colspan="3">Satış yok</td></tr>`}</tbody>
        </table>
        <div class="total">Ciro: ${formatCurrency(summary.total)}</div>
      </body>
    </html>
  `;
}

export function buildReceiptHtmlLegacy(order: OrderDetail): string {
  return buildReceiptHtml(order);
}
