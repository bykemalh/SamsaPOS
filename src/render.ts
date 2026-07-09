import type {
  Category,
  ClosedOrderSummary,
  ConfirmDialog,
  DiningTable,
  FormModal,
  OrderDetail,
  Product,
  UiState,
} from "./types";
import { escapeHtml, formatCurrency, formatDateTime } from "./utils";

function icon(name: string, className: string = "w-5 h-5"): string {
  className = `${className} pointer-events-none`.trim();
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
    help: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${className}"><path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg>`
  };
  return icons[name] || "";
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
    ? `${icon("receipt_long", "w-4 h-4 text-primary shrink-0")}`
    : `<div class="w-1 h-8 ${isOccupied ? "bg-error" : "bg-secondary"} rounded-full"></div>`;

  const amountOpacity = isOccupied || isPackage ? "" : "opacity-0";

  const borderStyle = selected
    ? "border border-primary bg-primary/[0.04]"
    : "border border-outline-variant";

  return `
    <div data-action="select-table" data-table-id="${table.id}" class="bg-surface-container-lowest ${borderStyle} rounded-lg p-sm cursor-pointer hover:shadow-md transition-all flex items-center justify-between gap-md">
      <div class="flex items-center gap-md">
        ${indicatorHtml}
        <div>
          <div class="font-bold text-on-surface">${escapeHtml(table.name)}</div>
          <div class="${badgeClass} font-label-md text-[10px] px-xs rounded w-fit">${badgeText}</div>
        </div>
      </div>
      <div class="flex items-center gap-xs">
        <span class="font-numeric-pos text-numeric-pos text-primary ${amountOpacity}">${formatCurrency(table.currentTotal)}</span>
        ${isPackage ? `<button type="button" data-action="delete-package" data-table-id="${table.id}" class="p-1 text-error/70 hover:text-error hover:bg-error-container/20 rounded transition-colors" title="Paketi Sil">${icon("delete", "w-3.5 h-3.5")}</button>` : ""}
      </div>
    </div>
  `;
}

function categoryFilter(category: Category, selectedCategoryId: number | null): string {
  const selected = selectedCategoryId === category.id;
  if (selected) {
    return `<button type="button" data-action="filter-category" data-category-id="${category.id}" class="px-lg py-sm rounded-full bg-primary text-on-primary font-label-md text-label-md whitespace-nowrap shadow-sm">${escapeHtml(category.name)}</button>`;
  } else {
    return `<button type="button" data-action="filter-category" data-category-id="${category.id}" class="px-lg py-sm rounded-full bg-surface-container border border-outline-variant text-on-surface font-label-md text-label-md whitespace-nowrap hover:bg-surface-container-high transition-colors">${escapeHtml(category.name)}</button>`;
  }
}

function productCard(product: Product): string {
  const image = product.imageData
    ? `<img src="${product.imageData}" alt="${escapeHtml(product.name)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" decoding="async" />`
    : `<div class="w-full h-full bg-surface-container flex items-center justify-center group-hover:scale-105 transition-transform duration-300">${icon("image", "w-6 h-6 text-outline")}</div>`;

  return `
    <button type="button" data-action="add-to-order" data-product-id="${product.id}" class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden flex flex-col hover:shadow-sm hover:border-primary transition-all active:scale-95 group text-left">
      <div class="aspect-[4/3] w-full overflow-hidden bg-surface-container">
        ${image}
      </div>
      <div class="p-[3px] flex flex-col items-center gap-[1px] w-full">
        <span class="font-semibold text-on-surface text-center text-xs xl:text-sm leading-tight truncate w-full" title="${escapeHtml(product.name)}">${escapeHtml(product.name)}</span>
        <span class="font-numeric-pos text-primary text-xs xl:text-sm font-bold">${formatCurrency(product.price)}</span>
      </div>
    </button>
  `;
}

function renderOrder(order: OrderDetail | null): string {
  if (!order) {
    return `
      <div class="flex-1 flex flex-col items-center justify-center p-lg text-center text-on-surface-variant gap-md h-full">
        ${icon("table_restaurant", "w-16 h-16 text-outline/40")}
        <div>
          <h3 class="font-bold text-lg text-on-surface">Masa Seçilmedi</h3>
          <p class="text-body-md text-on-surface-variant mt-1">Sipariş detaylarını görmek ve ürün eklemek için sol taraftan bir masa seçin.</p>
        </div>
      </div>
    `;
  }

  const items = order.items.length
    ? order.items
        .map(
          (item) => `
        <div class="bg-surface border border-outline-variant/50 rounded-lg p-sm">
          <div class="flex justify-between items-start mb-xs gap-sm">
            <span class="font-body-md text-body-md font-semibold text-on-surface truncate">${escapeHtml(item.productName)}</span>
            <span class="font-numeric-pos text-numeric-pos text-on-surface whitespace-nowrap">${formatCurrency(item.unitPrice)}</span>
          </div>
          <div class="flex justify-between items-center mt-sm">
            <div class="flex items-center gap-xs bg-surface-container rounded-full p-xs border border-outline-variant">
              <button type="button" data-action="decrease-item" data-item-id="${item.id}" data-quantity="${item.quantity}" class="w-6 h-6 flex items-center justify-center rounded-full bg-surface-container-lowest text-on-surface shadow-sm active:scale-90">
                ${icon("remove", "w-4 h-4")}
              </button>
              <span class="font-numeric-pos text-numeric-pos w-6 text-center">${item.quantity}</span>
              <button type="button" data-action="increase-item" data-item-id="${item.id}" data-quantity="${item.quantity}" class="w-6 h-6 flex items-center justify-center rounded-full bg-surface-container-lowest text-on-surface shadow-sm active:scale-90">
                ${icon("add", "w-4 h-4")}
              </button>
            </div>
            <div class="flex items-center gap-md">
              <span class="font-numeric-pos text-numeric-pos text-primary">${formatCurrency(item.lineTotal)}</span>
              <button type="button" data-action="remove-item" data-item-id="${item.id}" class="text-error/70 hover:text-error transition-colors" title="Sil">
                ${icon("delete", "w-[18px] h-[18px]")}
              </button>
            </div>
          </div>
        </div>
      `,
        )
        .join("")
    : `
      <div class="flex-1 flex flex-col items-center justify-center p-md text-center text-outline gap-sm min-h-[200px]">
        ${icon("shopping_cart_cancel", "w-12 h-12 opacity-50")}
        <span class="text-body-md font-medium">Bu masada henüz sipariş yok.</span>
      </div>
    `;

  const subtotal = order.total / 1.1;
  const kdv = order.total - subtotal;

  return `
    <div class="flex-1 flex flex-col h-full bg-surface-container-lowest">
      <div class="p-md xl:p-lg border-b border-outline-variant bg-surface-bright flex justify-between items-center shrink-0">
        <div class="min-w-0">
          <h3 class="font-headline-sm text-headline-sm text-on-surface truncate">${escapeHtml(order.tableName)}</h3>
          <p class="font-label-md text-label-md text-on-surface-variant">Adisyon #${order.orderId ?? "Yeni"}</p>
        </div>
        <div class="flex gap-xs shrink-0">
          <button type="button" data-action="print-order" data-order-id="${order.orderId ?? ""}" class="text-on-surface-variant p-xs hover:bg-surface-variant rounded-full transition-colors" title="Yazdır">
            ${icon("print", "w-4 h-4 xl:w-5 xl:h-5")}
          </button>
          <button type="button" data-action="clear-order" data-table-id="${order.tableId}" class="text-error p-xs hover:bg-error-container/20 rounded-full transition-colors" title="Siparişi Temizle">
            ${icon("delete", "w-4 h-4 xl:w-5 xl:h-5")}
          </button>
        </div>
      </div>
      
      <!-- Order Items Area -->
      <div class="flex-1 overflow-y-auto p-sm xl:p-md space-y-sm">
        ${items}
      </div>
      
      <!-- Summary Area -->
      <div class="p-md xl:p-lg bg-surface-bright border-t border-outline-variant shrink-0">
        <div class="space-y-xs mb-sm xl:mb-md">
          <div class="flex justify-between font-body-md text-body-md text-on-surface-variant">
            <span>Ara Toplam</span>
            <span class="font-numeric-pos">${formatCurrency(subtotal)}</span>
          </div>
          <div class="flex justify-between font-body-md text-body-md text-on-surface-variant">
            <span>KDV (%10)</span>
            <span class="font-numeric-pos">${formatCurrency(kdv)}</span>
          </div>
          <div class="flex justify-between font-headline-sm xl:font-headline-md text-headline-sm xl:text-headline-md text-on-surface pt-sm border-t border-outline-variant/50 mt-sm">
            <span>Toplam Tutar</span>
            <span class="font-numeric-pos text-primary text-lg xl:text-xl font-bold">${formatCurrency(order.total)}</span>
          </div>
        </div>
        <button type="button" data-action="close-order" data-table-id="${order.tableId}" class="w-full h-10 xl:h-12 rounded-lg font-label-md xl:font-headline-sm text-label-md xl:text-headline-sm flex items-center justify-center gap-sm transition-opacity ${order.items.length === 0 ? "bg-surface-variant text-on-surface-variant cursor-not-allowed" : "bg-secondary text-on-secondary hover:opacity-90 active:scale-[0.98]"}">
          ${icon("payments", "w-5 h-5 xl:w-6 xl:h-6")}
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
    <!-- Left Section: Kat Planı (Tables) -->
    <section class="w-1/5 xl:w-1/4 border-r border-outline-variant overflow-y-auto p-md xl:p-lg bg-surface flex flex-col h-full shrink-0">
      <div class="flex justify-between items-center mb-md xl:mb-lg shrink-0">
        <h2 class="font-headline-sm xl:font-headline-md text-headline-sm xl:text-headline-md text-on-surface">Kat Planı</h2>
        <button type="button" data-action="switch-view" data-view="pos" class="text-secondary hover:underline font-label-md text-label-md">Yenile</button>
      </div>
      <div class="flex-1 overflow-y-auto space-y-sm pr-1">
        ${state.dashboard.tables.map((table) => tableCard(table, state.selectedTableId)).join("")}
      </div>
    </section>

    <!-- Center Section: Product Catalog -->
    <section class="flex-1 flex flex-col bg-surface p-md xl:p-lg border-r border-outline-variant overflow-hidden h-full">
      <!-- Horizontal Categories Bar -->
      <div class="flex gap-sm overflow-x-auto pb-sm mb-sm xl:mb-md scrollbar-hide shrink-0">
        <button type="button" data-action="filter-category" data-category-id="" class="px-md xl:px-lg py-sm rounded-full ${state.selectedCategoryId === null ? "bg-primary text-on-primary" : "bg-surface-container border border-outline-variant text-on-surface hover:bg-surface-container-high"} font-label-md text-label-md whitespace-nowrap transition-colors">Tümü</button>
        ${categories.map((c) => categoryFilter(c, state.selectedCategoryId)).join("")}
      </div>
      <!-- Product Grid -->
      <div class="flex-1 overflow-y-auto pr-sm">
        <div id="product-grid" class="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-[3px] xl:gap-sm">
          ${filteredProducts.length ? filteredProducts.map(productCard).join("") : '<div class="col-span-full rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs font-bold text-slate-500">Ürün bulunamadı.</div>'}
        </div>
      </div>
    </section>

    <!-- Right Section: Adisyon Panel -->
    <section class="w-56 md:w-64 lg:w-72 xl:w-action-panel-width bg-surface-container-lowest flex flex-col shadow-[-4px_0_12px_rgba(0,0,0,0.02)] z-10 h-full shrink-0">
      ${renderOrder(state.activeOrder)}
    </section>
  `;
}

function renderTablePage(state: UiState): string {
  const rows = state.dashboard.tables
    .map(
      (table) => `
    <div class="bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col items-center gap-xs p-md hover:shadow-sm transition-shadow text-center">
      <div class="w-full font-bold text-on-surface text-sm truncate">${escapeHtml(table.name)}</div>
      <div class="text-[10px] text-on-surface-variant">Sıra: ${table.positionIndex}</div>
      <span class="text-[9px] px-xs py-0.5 rounded font-bold uppercase tracking-wide ${table.status === "occupied" ? "bg-error-container text-on-error-container" : "bg-secondary-container text-on-secondary-container"}">${table.status === "occupied" ? "Dolu" : "Boş"}</span>
      <div class="flex gap-xs mt-auto pt-xs">
        <button type="button" data-action="edit-table" data-table-id="${table.id}" class="p-1 border border-outline-variant text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors" title="Düzenle">
          ${icon("edit", "w-3.5 h-3.5")}
        </button>
        <button type="button" data-action="delete-table" data-table-id="${table.id}" class="p-1 border border-error/20 text-error hover:bg-error-container/20 rounded-lg transition-colors" title="Sil">
          ${icon("delete", "w-3.5 h-3.5")}
        </button>
      </div>
    </div>
  `,
    )
    .join("");

  return `
    <div class="flex flex-col gap-sm">
      <button type="button" data-action="new-table" class="bg-surface-container border-2 border-dashed border-outline-variant hover:border-primary hover:bg-surface-container-high rounded-xl px-sm py-sm flex items-center justify-center gap-xs text-on-surface-variant hover:text-primary transition-all">
        ${icon("add_circle", "w-4 h-4")}
        <span class="font-bold text-xs">Yeni Masa Ekle</span>
      </button>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-sm">
        ${rows}
      </div>
    </div>
  `;
}

function renderCategoryPage(state: UiState): string {
  const rows = state.dashboard.categories
    .map(
      (category) => `
    <div class="bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col items-center gap-xs p-md hover:shadow-sm transition-shadow text-center">
      <div class="w-full font-bold text-on-surface text-sm truncate">${escapeHtml(category.name)}</div>
      <div class="text-[10px] text-on-surface-variant">Sıra: ${category.sortOrder}</div>
      <span class="text-[9px] px-xs py-0.5 rounded font-bold uppercase tracking-wide ${category.isActive ? "bg-secondary-container text-on-secondary-container" : "bg-surface-variant text-on-surface-variant"}">${category.isActive ? "Aktif" : "Pasif"}</span>
      <div class="flex gap-xs mt-auto pt-xs">
        <button type="button" data-action="edit-category" data-category-id="${category.id}" class="p-1 border border-outline-variant text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors" title="Düzenle">
          ${icon("edit", "w-3.5 h-3.5")}
        </button>
        <button type="button" data-action="delete-category" data-category-id="${category.id}" class="p-1 border border-error/20 text-error hover:bg-error-container/20 rounded-lg transition-colors" title="Sil">
          ${icon("delete", "w-3.5 h-3.5")}
        </button>
      </div>
    </div>
  `,
    )
    .join("");

  return `
    <div class="flex flex-col gap-sm">
      <button type="button" data-action="new-category" class="bg-surface-container border-2 border-dashed border-outline-variant hover:border-primary hover:bg-surface-container-high rounded-xl px-sm py-sm flex items-center justify-center gap-xs text-on-surface-variant hover:text-primary transition-all">
        ${icon("add_circle", "w-4 h-4")}
        <span class="font-bold text-xs">Yeni Kategori Ekle</span>
      </button>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-sm">
        ${rows}
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
          ? `<img src="${product.imageData}" alt="${escapeHtml(product.name)}" class="w-full aspect-square rounded-lg object-cover border border-outline-variant" />`
          : `<div class="w-full aspect-square rounded-lg bg-surface-container border border-outline-variant flex flex-col items-center justify-center gap-xs">${icon("image", "w-6 h-6 text-outline")}<span class="text-[9px] font-bold text-outline">Görsel Yok</span></div>`;

        return `
          <div class="bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col hover:shadow-sm transition-shadow overflow-hidden">
            <div class="p-xs">
              ${thumb}
            </div>
            <div class="px-sm pb-sm pt-xs flex flex-col items-center gap-px text-center">
              <div class="font-bold text-on-surface text-xs truncate w-full">${escapeHtml(product.name)}</div>
              <div class="text-[9px] text-on-surface-variant truncate w-full">${escapeHtml(category)}</div>
              <span class="font-bold text-xs text-primary">${formatCurrency(product.price)}</span>
              <div class="flex gap-xs mt-1">
                <button type="button" data-action="edit-product" data-product-id="${product.id}" class="p-1 border border-outline-variant text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors" title="Düzenle">
                  ${icon("edit", "w-3.5 h-3.5")}
                </button>
                <button type="button" data-action="delete-product" data-product-id="${product.id}" class="p-1 border border-error/20 text-error hover:bg-error-container/20 rounded-lg transition-colors" title="Sil">
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
    <div class="flex flex-col gap-sm">
      <button type="button" data-action="new-product" class="bg-surface-container border-2 border-dashed border-outline-variant hover:border-primary hover:bg-surface-container-high rounded-xl px-sm py-sm flex items-center justify-center gap-xs text-on-surface-variant hover:text-primary transition-all">
        ${icon("add_circle", "w-4 h-4")}
        <span class="font-bold text-xs">Yeni Ürün Ekle</span>
      </button>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-sm">
        ${rows}
      </div>
    </div>
  `;
}

function renderSettingsWrapper(state: UiState, child: string): string {
  const currentTab = state.view; // "tables" | "categories" | "products"
  return `
    <div class="flex-1 flex flex-col bg-surface p-lg w-full overflow-hidden h-full">
      <div class="mb-lg shrink-0">
        <h2 class="font-headline-md text-headline-md text-on-surface">Sistem Ayarları</h2>
        <p class="text-on-surface-variant text-body-md mt-1">Sipariş sistemi için masa, kategori ve ürünlerinizi özelleştirin.</p>
      </div>
      
      <!-- Sub Tabs -->
      <div class="flex gap-sm border-b border-outline-variant pb-xs mb-lg shrink-0 overflow-x-auto scrollbar-hide">
        <button type="button" data-action="switch-view" data-view="tables" class="px-md py-sm font-label-md text-label-md transition-all flex items-center gap-sm rounded-lg ${currentTab === "tables" ? "bg-primary text-on-primary font-bold shadow-sm" : "text-on-surface-variant hover:bg-surface-container-high/50" }">
          ${icon("table_bar", "w-[18px] h-[18px]")}
          Masa Ayarları
        </button>
        <button type="button" data-action="switch-view" data-view="categories" class="px-md py-sm font-label-md text-label-md transition-all flex items-center gap-sm rounded-lg ${currentTab === "categories" ? "bg-primary text-on-primary font-bold shadow-sm" : "text-on-surface-variant hover:bg-surface-container-high/50" }">
          ${icon("category", "w-[18px] h-[18px]")}
          Kategori Ayarları
        </button>
        <button type="button" data-action="switch-view" data-view="products" class="px-md py-sm font-label-md text-label-md transition-all flex items-center gap-sm rounded-lg ${currentTab === "products" ? "bg-primary text-on-primary font-bold shadow-sm" : "text-on-surface-variant hover:bg-surface-container-high/50" }">
          ${icon("restaurant_menu", "w-[18px] h-[18px]")}
          Ürün Ayarları
        </button>
      </div>

      <div class="flex-1 overflow-y-auto pr-sm pb-lg">
        ${child}
      </div>
    </div>
  `;
}

function renderHistoryPage(history: ClosedOrderSummary[]): string {
  if (!history.length) {
    return `
      <div class="flex-1 flex flex-col items-center justify-center p-lg text-center text-on-surface-variant gap-md h-full">
        ${icon("history", "w-16 h-16 text-outline/40")}
        <div>
          <h3 class="font-bold text-lg text-on-surface">Sipariş Geçmişi Boş</h3>
          <p class="text-body-md text-on-surface-variant mt-1">Henüz kapatılmış veya ödemesi alınmış bir sipariş bulunmuyor.</p>
        </div>
      </div>
    `;
  }

  const items = history
    .map(
      (entry) => `
      <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex items-center justify-between shadow-sm hover:shadow-md transition-shadow gap-md">
        <div class="flex items-center gap-md">
          <div class="p-3 bg-secondary-container/20 text-on-secondary-container rounded-lg">
            ${icon("receipt_long", "w-6 h-6")}
          </div>
          <div>
            <div class="font-bold text-on-surface text-lg">${escapeHtml(entry.tableName)}</div>
            <div class="text-body-md text-on-surface-variant mt-1">Adisyon #${entry.orderId} • ${entry.itemCount} ürün</div>
            <div class="text-xs text-outline mt-0.5">${formatDateTime(entry.closedAt)}</div>
          </div>
        </div>
        <div class="flex items-center gap-lg">
          <div class="font-numeric-pos text-xl font-bold text-primary">${formatCurrency(entry.total)}</div>
          <button type="button" data-action="print-receipt" data-order-id="${entry.orderId}" class="py-2 px-4 border border-outline-variant text-on-surface hover:bg-surface-container rounded-lg font-label-md text-label-md flex items-center gap-xs transition-colors">
            ${icon("print", "w-[18px] h-[18px]")} Yeniden Yazdır
          </button>
        </div>
      </div>
    `,
    )
    .join("");

  return `
    <div class="flex-1 flex flex-col bg-surface p-lg w-full overflow-hidden h-full">
      <div class="mb-lg shrink-0">
        <h2 class="font-headline-md text-headline-md text-on-surface">Paket / Sipariş Geçmişi</h2>
        <p class="text-on-surface-variant text-body-md mt-1">Tamamlanan ve kapatılan tüm adisyonların dökümünü inceleyin.</p>
      </div>
      <div class="flex-1 overflow-y-auto space-y-sm pr-sm pb-lg">
        ${items}
      </div>
    </div>
  `;
}

function renderTableModal(state: UiState): string {
  const inputClass = "bg-surface-container border border-outline-variant rounded-lg px-md h-11 text-body-md focus:outline-none focus:ring-2 focus:ring-primary w-full font-bold";
  return `
    <div class="space-y-md">
      <div>
        <label class="block text-xs font-bold text-on-surface-variant mb-xs">Masa Adı</label>
        <input id="table-name-input" value="${escapeHtml(state.tableDraft.name)}" class="${inputClass}" placeholder="Örn: Masa 1" />
      </div>
      <div class="flex justify-end gap-sm border-t border-outline-variant/30 pt-md mt-md">
        <button type="button" data-action="close-modal" class="border border-outline-variant text-on-surface-variant hover:bg-surface-container rounded-lg font-label-md text-label-md px-lg h-11 transition-colors">İptal</button>
        <button type="button" data-action="save-table" class="bg-secondary text-on-secondary px-lg h-11 rounded-lg font-label-md text-label-md hover:opacity-90 font-bold transition-opacity shadow-sm flex items-center justify-center">${state.tableDraft.id ? "Güncelle" : "Ekle"}</button>
      </div>
    </div>
  `;
}

function renderCategoryModal(state: UiState): string {
  const inputClass = "bg-surface-container border border-outline-variant rounded-lg px-md h-11 text-body-md focus:outline-none focus:ring-2 focus:ring-primary w-full font-bold";
  return `
    <div class="space-y-md">
      <div>
        <label class="block text-xs font-bold text-on-surface-variant mb-xs">Kategori Adı</label>
        <input id="category-name-input" value="${escapeHtml(state.categoryDraft.name)}" class="${inputClass}" placeholder="Örn: Tatlılar" />
      </div>
      <div class="flex justify-end gap-sm border-t border-outline-variant/30 pt-md mt-md">
        <button type="button" data-action="close-modal" class="border border-outline-variant text-on-surface-variant hover:bg-surface-container rounded-lg font-label-md text-label-md px-lg h-11 transition-colors">İptal</button>
        <button type="button" data-action="save-category" class="bg-secondary text-on-secondary px-lg h-11 rounded-lg font-label-md text-label-md hover:opacity-90 font-bold transition-opacity shadow-sm flex items-center justify-center">${state.categoryDraft.id ? "Güncelle" : "Ekle"}</button>
      </div>
    </div>
  `;
}

function renderProductModal(state: UiState): string {
  const draft = state.productDraft;
  const inputClass = "bg-surface-container border border-outline-variant rounded-lg px-md h-11 text-body-md focus:outline-none focus:ring-2 focus:ring-primary w-full font-bold";
  const options = state.dashboard.categories
    .map(
      (c) =>
        `<option value="${c.id}" ${draft.categoryId === c.id ? "selected" : ""}>${escapeHtml(c.name)}</option>`,
    )
    .join("");

  return `
    <div class="space-y-md">
      <div>
        <label class="block text-xs font-bold text-on-surface-variant mb-xs">Ürün Adı</label>
        <input id="product-name-input" value="${escapeHtml(draft.name)}" class="${inputClass}" placeholder="Örn: Klasik Burger" />
      </div>
      <div>
        <label class="block text-xs font-bold text-on-surface-variant mb-xs">Kategori</label>
        <select id="product-category-input" class="${inputClass}">
          <option value="">Kategori seçin</option>
          ${options}
        </select>
      </div>
      <div>
        <label class="block text-xs font-bold text-on-surface-variant mb-xs">Fiyat (TL)</label>
        <input id="product-price-input" type="number" min="0" step="0.01" value="${escapeHtml(draft.price)}" class="${inputClass}" placeholder="0.00" />
      </div>
      <div>
        <label class="block text-xs font-bold text-on-surface-variant mb-xs">Görsel Yükle</label>
        <div class="flex items-center gap-md">
          <input id="product-image-input" type="file" accept="image/*" class="hidden" />
          <button type="button" onclick="document.getElementById('product-image-input').click()" class="border border-outline-variant text-on-surface hover:bg-surface-container h-11 px-md rounded-lg font-label-md text-label-md flex items-center gap-xs transition-colors">
            ${icon("upload", "w-[18px] h-[18px]")} Dosya Seç
          </button>
          <span class="text-xs text-on-surface-variant truncate max-w-[200px]" id="selected-file-label">${draft.imageData ? "Görsel yüklendi" : "Görsel seçilmedi"}</span>
        </div>
      </div>
      ${
        draft.imageData
          ? `
        <div class="mt-sm">
          <label class="block text-xs font-bold text-on-surface-variant mb-xs">Önizleme (4:3 Kırpılmış)</label>
          <div class="aspect-[4/3] w-full overflow-hidden rounded-xl border border-outline-variant bg-surface-container">
            <img src="${draft.imageData}" alt="Önizleme" class="h-full w-full object-cover" />
          </div>
        </div>
      `
          : ""
      }
      <div class="flex justify-end gap-sm border-t border-outline-variant/30 pt-md mt-md">
        <button type="button" data-action="close-modal" class="border border-outline-variant text-on-surface-variant hover:bg-surface-container rounded-lg font-label-md text-label-md px-lg h-11 transition-colors">İptal</button>
        <button type="button" data-action="save-product" class="bg-secondary text-on-secondary px-lg h-11 rounded-lg font-label-md text-label-md hover:opacity-90 font-bold transition-opacity shadow-sm flex items-center justify-center">${draft.id ? "Güncelle" : "Ekle"}</button>
      </div>
    </div>
  `;
}

function renderNewOrderModal(): string {
  return `
    <div class="flex flex-col gap-md">
      <button type="button" data-action="new-table-order" class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex items-center gap-md hover:border-primary hover:shadow-sm transition-all text-left cursor-pointer">
        <div class="w-12 h-12 rounded-xl bg-secondary-container/20 text-secondary flex items-center justify-center shrink-0">
          ${icon("table_bar", "w-6 h-6")}
        </div>
        <div>
          <div class="font-bold text-on-surface">Masa Siparişi</div>
          <div class="text-xs text-on-surface-variant mt-px">Restoran masasına yeni sipariş oluştur</div>
        </div>
      </button>
      <button type="button" data-action="new-package-order" class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex items-center gap-md hover:border-primary hover:shadow-sm transition-all text-left cursor-pointer">
        <div class="w-12 h-12 rounded-xl bg-secondary-container/20 text-secondary flex items-center justify-center shrink-0">
          ${icon("receipt_long", "w-6 h-6")}
        </div>
        <div>
          <div class="font-bold text-on-surface">Paket Siparişi</div>
          <div class="text-xs text-on-surface-variant mt-px">Paket / götürme siparişi oluştur</div>
        </div>
      </button>
    </div>
  `;
}

function renderPackageOrderModal(): string {
  const inputClass = "bg-surface-container border border-outline-variant rounded-lg px-md h-11 text-body-md focus:outline-none focus:ring-2 focus:ring-primary w-full font-bold";
  return `
    <div class="space-y-md">
      <div>
        <label class="block text-xs font-bold text-on-surface-variant mb-xs">Müşteri Adı</label>
        <input id="package-customer-input" class="${inputClass}" placeholder="Örn: Ahmet Yılmaz" />
      </div>
      <div class="flex justify-end gap-sm border-t border-outline-variant/30 pt-md mt-md">
        <button type="button" data-action="close-modal" class="border border-outline-variant text-on-surface-variant hover:bg-surface-container rounded-lg font-label-md text-label-md px-lg h-11 transition-colors">İptal</button>
        <button type="button" data-action="save-package-order" class="bg-secondary text-on-secondary px-lg h-11 rounded-lg font-label-md text-label-md hover:opacity-90 font-bold transition-opacity shadow-sm flex items-center justify-center">Oluştur</button>
      </div>
    </div>
  `;
}

function renderTableSelectModal(state: UiState): string {
  const tables = state.dashboard.tables.filter((t) => !t.name.startsWith("Paket"));
  if (!tables.length) {
    return `<div class="text-center py-lg text-on-surface-variant text-sm">Henüz masa bulunmuyor. Önce masa ekleyin.</div>`;
  }
  return `
    <div class="flex flex-col gap-xs max-h-[50vh] overflow-y-auto pr-1">
      ${tables.map(
        (t) => `
        <button type="button" data-action="select-table-and-close" data-table-id="${t.id}" class="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-sm py-sm flex items-center gap-sm hover:border-primary hover:shadow-sm transition-all text-left cursor-pointer">
          <div class="w-1 h-7 ${t.status === "occupied" ? "bg-error" : "bg-secondary"} rounded-full"></div>
          <div class="flex-1 min-w-0">
            <div class="font-bold text-on-surface text-sm truncate">${escapeHtml(t.name)}</div>
            <div class="text-[10px] text-on-surface-variant">${t.status === "occupied" ? "Dolu" : "Boş"}</div>
          </div>
          <span class="font-numeric-pos text-xs text-primary">${formatCurrency(t.currentTotal)}</span>
        </button>
        `,
      ).join("")}
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
  }

  return `
    <div class="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-2 backdrop-blur-sm sm:items-center sm:p-4">
      <div class="max-h-[92dvh] w-full max-w-[500px] sm:min-w-[460px] md:min-w-[500px] overflow-y-auto rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xl flex flex-col">
        <div class="mb-lg flex items-center justify-between pb-sm border-b border-outline-variant/30 shrink-0">
          <h2 class="text-lg font-bold text-on-surface flex items-center gap-xs">
            ${icon(iconName, "w-5 h-5 text-primary")}
            ${modalTitles[state.activeModal](state)}
          </h2>
          <button type="button" data-action="close-modal" class="p-xs text-on-surface-variant hover:bg-surface-container rounded-full transition-colors" title="Kapat">
            ${icon("close", "w-5 h-5")}
          </button>
        </div>
        <div class="flex-1">
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
      return renderHistoryPage(state.closedOrders);
    case "pos":
    default:
      return renderPosView(state);
  }
}

function renderConfirmDialog(dialog: ConfirmDialog | null): string {
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
    <div style="position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;inset:0;background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);" data-action="confirm-no"></div>
      <div style="position:relative;z-index:10;background:#ffffff;border-radius:1rem;box-shadow:0 20px 60px rgba(0,0,0,0.25);border:1px solid #e5e7eb;width:100%;max-width:400px;margin:0 16px;">
        <div style="display:flex;flex-direction:column;align-items:center;gap:16px;padding:32px 32px 24px;text-align:center;">
          <div style="border-radius:9999px;background:${iconBg};padding:16px;display:flex;align-items:center;justify-content:center;color:${iconColor};">
            ${iconHtml}
          </div>
          <div>
            <h2 style="font-size:1.125rem;font-weight:700;color:#111827;margin:0 0 6px 0;line-height:1.4;">${escapeHtml(dialog.message)}</h2>
            ${dialog.subMessage ? `<p style="font-size:0.875rem;color:#6b7280;margin:0;line-height:1.5;">${escapeHtml(dialog.subMessage)}</p>` : ""}
          </div>
        </div>
        <div style="display:flex;gap:12px;padding:0 24px 24px;${hasPrint ? "flex-wrap:wrap;" : ""}">
          <button type="button" data-action="confirm-no"
            style="flex:1;height:44px;border-radius:10px;border:1px solid #d1d5db;background:#ffffff;color:#374151;font-size:0.875rem;font-weight:600;cursor:pointer;min-width:80px;"
            onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='#ffffff'">
            Hayır
          </button>
          <button type="button" data-action="confirm-yes"
            style="flex:1;height:44px;border-radius:10px;border:none;background:${confirmBg};color:#ffffff;font-size:0.875rem;font-weight:600;cursor:pointer;min-width:80px;"
            onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
            ${escapeHtml(dialog.confirmLabel ?? "Evet")}
          </button>
          ${hasPrint ? `
          <button type="button" data-action="confirm-print"
            style="flex:1;min-width:100%;height:44px;border-radius:10px;border:2px solid ${confirmBg};background:#ffffff;color:#111827;font-size:0.875rem;font-weight:600;cursor:pointer;"
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
    <div class="flex-1 flex flex-col h-full bg-surface-bright dark:bg-surface-container">
      <header class="fixed top-0 left-0 right-0 h-16 bg-surface-bright dark:bg-surface-container border-b border-outline-variant flex justify-between items-center px-lg w-full z-40">
        <div class="flex items-center gap-xl h-full">
          <h1 class="font-display-lg text-headline-sm font-bold text-secondary flex items-center gap-sm cursor-pointer" data-action="switch-view" data-view="pos">
            ${icon("restaurant", "w-6 h-6 text-secondary")}
            Samsa POS
          </h1>
          <nav class="h-full flex items-center gap-lg">
            <button type="button" data-action="switch-view" data-view="pos" class="h-full flex items-center font-body-md text-body-md transition-colors border-b-2 pb-1 ${isPos ? "text-primary font-bold border-primary" : "text-on-surface-variant dark:text-outline border-transparent hover:text-primary"}">
              Masa Sipariş
            </button>
            <button type="button" data-action="switch-view" data-view="history" class="h-full flex items-center font-body-md text-body-md transition-colors border-b-2 pb-1 ${isHistory ? "text-primary font-bold border-primary" : "text-on-surface-variant dark:text-outline border-transparent hover:text-primary"}">
              Paket / Sipariş Geçmişi
            </button>
          </nav>
        </div>
        <div class="flex items-center gap-md">
          <div class="relative">
            <input id="global-search-input" class="bg-surface-container border border-outline-variant rounded-full pl-lg pr-md py-xs text-body-md focus:outline-none focus:ring-2 focus:ring-primary w-64" placeholder="Menü veya masa ara..." type="text">
            <span class="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant">${icon("search", "w-4 h-4")}</span>
          </div>
          <div class="flex gap-sm">
            <button type="button" data-action="toggle-fullscreen" class="p-xs text-on-surface-variant hover:bg-surface-container-high/50 rounded-full transition-colors" title="${state.isFullscreen ? "Pencere Modu" : "Tam Ekran"}">
              ${icon(state.isFullscreen ? "fullscreen_exit" : "fullscreen", "w-5 h-5")}
            </button>
            <button type="button" data-action="switch-view" data-view="tables" class="p-xs ${isSettings ? "text-primary bg-surface-container-high" : "text-on-surface-variant"} hover:bg-surface-container-high/50 rounded-full transition-colors" title="Ayarlar">
              ${icon("settings", "w-5 h-5")}
            </button>
          </div>
          <button type="button" data-action="new-order" class="bg-secondary text-on-secondary px-md py-sm rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity">
            ${icon("add_circle", "w-4 h-4")} Yeni Sipariş
          </button>
        </div>
      </header>
      <main class="flex-1 mt-16 flex overflow-hidden w-full bg-surface-bright">
        ${renderView(state)}
      </main>
      ${renderModal(state)}
      ${renderConfirmDialog(state.confirmDialog)}
      ${
        state.loading
          ? `<div class="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-white/50 backdrop-blur-sm"><div class="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900 shadow-sm flex items-center gap-sm">${icon("sync", "w-5 h-5 animate-spin")}Yükleniyor...</div></div>`
          : ""
      }
      ${
        state.toast
          ? `<div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl border px-6 py-3 text-base font-bold shadow-lg flex items-center gap-sm ${state.toast.type === "success" ? "border-secondary-container bg-secondary-container/20 text-on-secondary-container" : "border-error-container bg-error-container/20 text-on-error-container"}">
              ${icon(state.toast.type === "success" ? "check_circle" : "error", "w-6 h-6")}
              ${escapeHtml(state.toast.message)}
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
          .total { margin-top: 3mm; font-size: 12px; font-weight: 700; text-align: right; border-top: 1px dashed #ccc; padding-top: 2mm; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Samsa POS</h1>
          <p class="muted">${escapeHtml(order.tableName)}</p>
          <p class="muted">Fiş #${order.orderId ?? "Yeni"}</p>
          <p class="muted">${escapeHtml(formatDateTime(order.openedAt))}</p>
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
        <div class="total">Toplam: ${formatCurrency(order.total)}</div>
      </body>
    </html>
  `;
}
