import type {
  AppView,
  Category,
  ClosedOrderSummary,
  DiningTable,
  FormModal,
  OrderDetail,
  Product,
  UiState,
} from "./types";
import { escapeHtml, formatCurrency, formatDateTime } from "./utils";

const btn = "min-h-10 rounded-xl border px-3 py-2 text-sm font-bold shadow-sm";
const btnPrimary = `${btn} border-slate-800 bg-gradient-to-r from-slate-800 to-slate-900 text-white`;
const btnGhost = `${btn} border-slate-200 bg-white text-slate-800`;
const btnDanger = `${btn} border-rose-200 bg-rose-50 text-rose-700`;
const input =
  "min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none shadow-sm focus:border-slate-800";
const panel = "rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm";
const card = "rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-3 shadow-sm";

function navBtn(view: AppView, current: AppView, label: string): string {
  return `<button type="button" data-action="switch-view" data-view="${view}" class="${current === view ? btnPrimary : btnGhost} text-xs">${label}</button>`;
}

function tableCard(table: DiningTable, selectedTableId: number | null): string {
  const selected = table.id === selectedTableId;
  const statusClass =
    table.status === "occupied"
      ? "border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50"
      : table.status === "reserved"
        ? "border-sky-200 bg-gradient-to-br from-sky-50 to-blue-50"
        : "border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50";

  return `
    <button type="button" data-action="select-table" data-table-id="${table.id}" class="w-full rounded-xl border p-3 text-left shadow-sm ${statusClass} ${selected ? "border-slate-800 ring-2 ring-slate-800/20" : ""}">
      <div class="flex items-center justify-between gap-2">
        <span class="text-sm font-bold text-slate-900">${escapeHtml(table.name)}</span>
        <span class="rounded-full px-2 py-1 text-[10px] font-bold uppercase ${table.status === "occupied" ? "bg-amber-400 text-slate-950" : table.status === "reserved" ? "bg-sky-400 text-slate-950" : "bg-emerald-400 text-slate-950"}">${escapeHtml(table.status)}</span>
      </div>
      <div class="mt-2 flex items-center justify-between text-xs font-bold text-slate-600">
        <span>${table.itemCount} urun</span>
        <span class="text-slate-900">${formatCurrency(table.currentTotal)}</span>
      </div>
    </button>
  `;
}

function categoryFilter(category: Category, selectedCategoryId: number | null): string {
  const selected = selectedCategoryId === category.id;
  return `<button type="button" data-action="filter-category" data-category-id="${category.id}" class="${selected ? btnPrimary : btnGhost}">${escapeHtml(category.name)}</button>`;
}

function productCard(product: Product): string {
  const image = product.imageData
    ? `<div class="aspect-[4/3] w-full overflow-hidden rounded-xl"><img src="${product.imageData}" alt="${escapeHtml(product.name)}" class="h-full w-full object-cover" /></div>`
    : `<div class="flex aspect-[4/3] w-full items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-500">Gorsel yok</div>`;

  return `
    <button type="button" data-action="add-to-order" data-product-id="${product.id}" class="rounded-xl border border-slate-200/80 bg-white p-2 text-left shadow-sm">
      ${image}
      <div class="mt-2">
        <div class="text-sm font-bold text-slate-900">${escapeHtml(product.name)}</div>
        <div class="mt-1 text-xs font-bold text-slate-600">${formatCurrency(product.price)}</div>
      </div>
    </button>
  `;
}

function renderOrder(order: OrderDetail | null): string {
  if (!order) {
    return `<div class="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm font-bold text-slate-500">Masa secin.</div>`;
  }

  const items = order.items.length
    ? order.items
        .map(
          (item) => `
        <div class="${card}">
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="text-sm font-bold text-slate-900">${escapeHtml(item.productName)}</div>
              <div class="text-xs font-bold text-slate-500">${formatCurrency(item.unitPrice)} x ${item.quantity}</div>
            </div>
            <div class="text-right">
              <div class="text-sm font-bold text-slate-900">${formatCurrency(item.lineTotal)}</div>
              <button type="button" data-action="remove-item" data-item-id="${item.id}" class="mt-1 text-xs font-bold text-rose-600">Sil</button>
            </div>
          </div>
          <div class="mt-2 flex items-center gap-2">
            <button type="button" data-action="decrease-item" data-item-id="${item.id}" data-quantity="${item.quantity}" class="h-10 w-10 rounded-xl border border-slate-300 bg-slate-100 text-lg font-bold text-slate-900 shadow-sm">-</button>
            <div class="min-w-10 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-center text-sm font-bold text-slate-900">${item.quantity}</div>
            <button type="button" data-action="increase-item" data-item-id="${item.id}" data-quantity="${item.quantity}" class="h-10 w-10 rounded-xl border border-slate-800 bg-slate-900 text-lg font-bold text-white shadow-sm">+</button>
          </div>
        </div>
      `,
        )
        .join("")
    : `<div class="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs font-bold text-slate-500">Urun yok.</div>`;

  return `
    <div class="space-y-2">
      <div class="${panel}">
        <div class="flex items-center justify-between gap-2">
          <div>
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Adisyon</div>
            <h2 class="text-lg font-bold text-slate-900">${escapeHtml(order.tableName)}</h2>
          </div>
          <button type="button" data-action="print-order" data-order-id="${order.orderId ?? ""}" class="${btnGhost}">Fis</button>
        </div>
        <div class="mt-1 text-xs font-bold text-slate-500">${formatDateTime(order.openedAt)}</div>
      </div>
      <div class="max-h-[calc(100vh-22rem)] space-y-2 overflow-y-auto">${items}</div>
      <div class="${panel}">
        <div class="flex items-center justify-between">
          <span class="text-sm font-bold text-slate-600">Toplam</span>
          <span class="text-xl font-bold text-slate-900">${formatCurrency(order.total)}</span>
        </div>
        <div class="mt-2 grid grid-cols-2 gap-2">
          <button type="button" data-action="clear-order" data-table-id="${order.tableId}" class="${btnGhost}">Temizle</button>
          <button type="button" data-action="close-order" data-table-id="${order.tableId}" class="${btnPrimary}">Kapat</button>
        </div>
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
    <section class="grid min-h-[calc(100vh-4rem)] grid-cols-[240px_minmax(0,1fr)_300px] gap-3">
      <aside class="${panel}">
        <h2 class="mb-2 text-sm font-bold text-slate-900">Masalar</h2>
        <div class="max-h-[calc(100vh-8rem)] space-y-2 overflow-y-auto">
          ${state.dashboard.tables.map((table) => tableCard(table, state.selectedTableId)).join("")}
        </div>
      </aside>
      <section class="${panel}">
        <div class="mb-2 flex flex-wrap items-center gap-2">
          <button type="button" data-action="filter-category" data-category-id="" class="${state.selectedCategoryId === null ? btnPrimary : btnGhost}">Tumu</button>
          ${categories.map((c) => categoryFilter(c, state.selectedCategoryId)).join("")}
        </div>
        <div class="grid max-h-[calc(100vh-8rem)] grid-cols-4 gap-2 overflow-y-auto">
          ${filteredProducts.length ? filteredProducts.map(productCard).join("") : '<div class="col-span-4 rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs font-bold text-slate-500">Urun yok</div>'}
        </div>
      </section>
      <aside class="${panel}">${renderOrder(state.activeOrder)}</aside>
    </section>
  `;
}

function renderTablePage(state: UiState): string {
  return `
    <section class="${panel}">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-base font-bold text-slate-900">Masa Listesi</h2>
        <button type="button" data-action="new-table" class="${btnPrimary} text-xs">+ Yeni Masa</button>
      </div>
      <div class="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        ${state.dashboard.tables
          .map(
            (table) => `
          <div class="${card}">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-sm font-bold text-slate-900">${escapeHtml(table.name)}</div>
                <div class="text-xs font-bold text-slate-500">${table.itemCount} urun</div>
              </div>
              <span class="rounded-full bg-white px-2 py-1 text-[10px] font-bold uppercase text-slate-600 shadow-sm">${escapeHtml(table.status)}</span>
            </div>
            <div class="mt-2 flex gap-2">
              <button type="button" data-action="edit-table" data-table-id="${table.id}" class="${btnGhost} text-xs">Duzenle</button>
              <button type="button" data-action="delete-table" data-table-id="${table.id}" class="${btnDanger} text-xs">Sil</button>
            </div>
          </div>
        `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderCategoryPage(state: UiState): string {
  return `
    <section class="${panel}">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-base font-bold text-slate-900">Kategori Listesi</h2>
        <button type="button" data-action="new-category" class="${btnPrimary} text-xs">+ Yeni Kategori</button>
      </div>
      <div class="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        ${state.dashboard.categories
          .map(
            (category) => `
          <div class="${card}">
            <div class="flex items-center justify-between">
              <div class="text-sm font-bold text-slate-900">${escapeHtml(category.name)}</div>
              <div class="flex gap-2">
                <button type="button" data-action="edit-category" data-category-id="${category.id}" class="${btnGhost} text-xs">Duzenle</button>
                <button type="button" data-action="delete-category" data-category-id="${category.id}" class="${btnDanger} text-xs">Sil</button>
              </div>
            </div>
          </div>
        `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderProductPage(state: UiState): string {
  return `
    <section class="${panel}">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-base font-bold text-slate-900">Urun Listesi</h2>
        <button type="button" data-action="new-product" class="${btnPrimary} text-xs">+ Yeni Urun</button>
      </div>
      <div class="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        ${state.dashboard.products
          .map(
            (product) => `
          <div class="${card}">
            ${
              product.imageData
                ? `<div class="mb-2 aspect-[4/3] w-full overflow-hidden rounded-xl"><img src="${product.imageData}" alt="${escapeHtml(product.name)}" class="h-full w-full object-cover" /></div>`
                : ""
            }
            <div class="text-sm font-bold text-slate-900">${escapeHtml(product.name)}</div>
            <div class="text-xs font-bold text-slate-500">${formatCurrency(product.price)}</div>
            <div class="mt-2 flex gap-2">
              <button type="button" data-action="edit-product" data-product-id="${product.id}" class="${btnGhost} text-xs">Duzenle</button>
              <button type="button" data-action="delete-product" data-product-id="${product.id}" class="${btnDanger} text-xs">Sil</button>
            </div>
          </div>
        `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderHistoryPage(history: ClosedOrderSummary[]): string {
  if (!history.length) {
    return `<div class="${panel} p-6 text-center text-sm font-bold text-slate-500">Kayit yok.</div>`;
  }

  return `
    <section class="${panel}">
      <div class="space-y-2">
        ${history
          .map(
            (entry) => `
          <div class="${card}">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-sm font-bold text-slate-900">${escapeHtml(entry.tableName)}</div>
                <div class="text-xs font-bold text-slate-500">${formatDateTime(entry.closedAt)} • ${entry.itemCount} urun</div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-slate-900">${formatCurrency(entry.total)}</span>
                <button type="button" data-action="print-receipt" data-order-id="${entry.orderId}" class="${btnGhost} text-xs">Fis</button>
              </div>
            </div>
          </div>
        `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderTableModal(state: UiState): string {
  return `
    <div class="space-y-2">
      <input id="table-name-input" value="${escapeHtml(state.tableDraft.name)}" class="${input}" placeholder="Masa adi" />
      <div class="flex gap-2">
        <button type="button" data-action="save-table" class="${btnPrimary}">${state.tableDraft.id ? "Guncelle" : "Ekle"}</button>
        <button type="button" data-action="close-modal" class="${btnGhost}">Iptal</button>
      </div>
    </div>
  `;
}

function renderCategoryModal(state: UiState): string {
  return `
    <div class="space-y-2">
      <input id="category-name-input" value="${escapeHtml(state.categoryDraft.name)}" class="${input}" placeholder="Kategori adi" />
      <div class="flex gap-2">
        <button type="button" data-action="save-category" class="${btnPrimary}">${state.categoryDraft.id ? "Guncelle" : "Ekle"}</button>
        <button type="button" data-action="close-modal" class="${btnGhost}">Iptal</button>
      </div>
    </div>
  `;
}

function renderProductModal(state: UiState): string {
  const draft = state.productDraft;
  const options = state.dashboard.categories
    .map(
      (c) =>
        `<option value="${c.id}" ${draft.categoryId === c.id ? "selected" : ""}>${escapeHtml(c.name)}</option>`,
    )
    .join("");

  return `
    <div class="space-y-2">
      <input id="product-name-input" value="${escapeHtml(draft.name)}" class="${input}" placeholder="Urun adi" />
      <select id="product-category-input" class="${input}">
        <option value="">Kategori secin</option>
        ${options}
      </select>
      <input id="product-price-input" type="number" min="0" step="0.01" value="${escapeHtml(draft.price)}" class="${input}" placeholder="Fiyat" />
      <input id="product-image-input" type="file" accept="image/*" class="${input}" />
      ${draft.imageData ? `<div class="aspect-[4/3] w-full overflow-hidden rounded-xl"><img src="${draft.imageData}" alt="Onizleme" class="h-full w-full object-cover" /></div>` : ""}
      <div class="flex gap-2">
        <button type="button" data-action="save-product" class="${btnPrimary}">${draft.id ? "Guncelle" : "Ekle"}</button>
        <button type="button" data-action="close-modal" class="${btnGhost}">Iptal</button>
      </div>
    </div>
  `;
}

const modalTitles: Record<FormModal, (state: UiState) => string> = {
  table: (s) => (s.tableDraft.id ? "Masayi Duzenle" : "Yeni Masa"),
  category: (s) => (s.categoryDraft.id ? "Kategoriyi Duzenle" : "Yeni Kategori"),
  product: (s) => (s.productDraft.id ? "Urunu Duzenle" : "Yeni Urun"),
};

function renderModal(state: UiState): string {
  if (!state.activeModal) return "";

  let body = "";
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
  }

  return `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div class="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xl">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-base font-bold text-slate-900">${modalTitles[state.activeModal](state)}</h2>
          <button type="button" data-action="close-modal" class="${btnGhost} text-xs">X</button>
        </div>
        ${body}
      </div>
    </div>
  `;
}

function renderView(state: UiState): string {
  switch (state.view) {
    case "tables":
      return renderTablePage(state);
    case "categories":
      return renderCategoryPage(state);
    case "products":
      return renderProductPage(state);
    case "history":
      return renderHistoryPage(state.closedOrders);
    case "pos":
    default:
      return renderPosView(state);
  }
}

export function renderApp(state: UiState): string {
  return `
    <div class="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100 text-slate-900">
      <div class="mx-auto max-w-[1800px] px-3 py-2">
        <header class="mb-2 flex items-center justify-between rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm backdrop-blur">
          <span class="text-sm font-bold text-slate-900">Samsa POS</span>
          <nav class="flex flex-wrap gap-1">
            ${navBtn("pos", state.view, "POS")}
            ${navBtn("tables", state.view, "Masa")}
            ${navBtn("categories", state.view, "Kategori")}
            ${navBtn("products", state.view, "Urun")}
            ${navBtn("history", state.view, "Gecmis")}
          </nav>
        </header>
        <main>${renderView(state)}</main>
      </div>
      ${renderModal(state)}
      ${
        state.loading
          ? `<div class="pointer-events-none fixed inset-0 grid place-items-center bg-white/50 backdrop-blur-sm"><div class="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900 shadow-sm">Yukleniyor...</div></div>`
          : ""
      }
      ${
        state.toast
          ? `<div class="fixed bottom-4 right-4 rounded-xl border px-3 py-2 text-sm font-bold shadow-sm ${state.toast.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}">${escapeHtml(state.toast.message)}</div>`
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
        <title>Fis - ${escapeHtml(order.tableName)}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
          h1, h2, p { margin: 0; }
          .header { margin-bottom: 16px; }
          .muted { color: #4b5563; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border-bottom: 1px solid #e5e7eb; padding: 8px 0; text-align: left; font-size: 13px; }
          .total { margin-top: 16px; font-size: 20px; font-weight: 700; text-align: right; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Samsa POS</h1>
          <p class="muted">Masa: ${escapeHtml(order.tableName)}</p>
          <p class="muted">Acilis: ${escapeHtml(formatDateTime(order.openedAt))}</p>
          <p class="muted">Kapanis: ${escapeHtml(formatDateTime(order.closedAt))}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Urun</th>
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
