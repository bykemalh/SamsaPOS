import { api } from "./api";
import { buildReceiptHtml, renderApp } from "./render";
import { cropImageToAspectRatio, printHtml, readFullscreenState, setFullscreenState } from "./utils";
import type {
  AppView,
  Category,
  ConfirmDialog,
  DiningTable,
  Product,
  ProductPayload,
  UiState,
} from "./types";

class PosApp {
  private root: HTMLElement;

  private toastTimer: number | null = null;

  private state: UiState = {
    view: "pos",
    isFullscreen: false,
    activeModal: null,
    confirmDialog: null,
    loading: false,
    selectedTableId: null,
    selectedCategoryId: null,
    dashboard: {
      tables: [],
      categories: [],
      products: [],
    },
    activeOrder: null,
    closedOrders: [],
    tableDraft: { id: null, name: "" },
    categoryDraft: { id: null, name: "" },
    productDraft: { id: null, name: "", categoryId: null, price: "", imageData: null },
    toast: null,
  };

  constructor(root: HTMLElement) {
    this.root = root;
    this.root.addEventListener("click", (event) => this.handleClick(event));
    this.root.addEventListener("change", (event) => this.handleChange(event));
    this.root.addEventListener("input", (event) => this.handleInput(event));
    document.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  async init(): Promise<void> {
    this.state.isFullscreen = await readFullscreenState();
    this.bindFullscreenListeners();
    await this.refreshAll();
  }

  private async updateFullscreenState(): Promise<void> {
    const next = await readFullscreenState();
    if (next === this.state.isFullscreen) {
      return;
    }

    this.state.isFullscreen = next;
    this.render();
  }

  private bindFullscreenListeners(): void {
    document.addEventListener("fullscreenchange", () => {
      void this.updateFullscreenState();
    });
  }

  private async toggleFullscreen(): Promise<void> {
    this.state.isFullscreen = await setFullscreenState(!this.state.isFullscreen);
    this.render();
  }

  private async refreshAll(): Promise<void> {
    await this.withLoading(() => this.loadData());
  }

  private async loadData(): Promise<void> {
    const [dashboard, closedOrders] = await Promise.all([
      api.getDashboard(),
      api.getClosedOrders(),
    ]);

    this.state.dashboard = dashboard;
    this.state.closedOrders = closedOrders;

    if (!this.state.selectedTableId && dashboard.tables.length) {
      this.state.selectedTableId = dashboard.tables[0].id;
    }

    if (
      this.state.selectedTableId &&
      !dashboard.tables.some((table) => table.id === this.state.selectedTableId)
    ) {
      this.state.selectedTableId = dashboard.tables[0]?.id ?? null;
    }

    if (this.state.selectedTableId) {
      this.state.activeOrder = await api.getOrderByTable(this.state.selectedTableId);
    } else {
      this.state.activeOrder = null;
    }
  }

  private render(): void {
    this.root.innerHTML = renderApp(this.state);
  }

  private async withLoading(task: () => Promise<void>): Promise<boolean> {
    const result = await this.withLoadingResult(async () => {
      await task();
      return true;
    });
    return result === true;
  }

  private async withLoadingResult<T>(task: () => Promise<T>): Promise<T | null> {
    let showSpinner = false;
    const timer = window.setTimeout(() => {
      showSpinner = true;
      this.state.loading = true;
      this.render();
    }, 200);

    try {
      return await task();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.showToast(message, "error");
      return null;
    } finally {
      window.clearTimeout(timer);
      if (showSpinner) {
        this.state.loading = false;
      }
      this.render();
    }
  }

  private async printReceiptHtml(orderId: number): Promise<void> {
    const order = await this.withLoadingResult(() => api.getReceipt(orderId));
    if (!order) {
      return;
    }

    try {
      await printHtml(buildReceiptHtml(order));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.showToast(message, "error");
    }
  }

  private showToast(message: string, type: "success" | "error"): void {
    this.state.toast = { message, type };
    this.render();

    if (this.toastTimer) {
      window.clearTimeout(this.toastTimer);
    }

    this.toastTimer = window.setTimeout(() => {
      this.state.toast = null;
      this.render();
    }, 2500);
  }

  private openConfirmDialog(options: Omit<ConfirmDialog, "onConfirm">): Promise<boolean> {
    return new Promise((resolve) => {
      const { onConfirmPrint, ...rest } = options;
      this.state.confirmDialog = {
        ...rest,
        onConfirm: () => resolve(true),
        onConfirmPrint: onConfirmPrint
          ? () => { onConfirmPrint(); resolve(true); }
          : undefined,
      };
      this.render();
      const handler = (ev: Event) => {
        const target = ev.target as HTMLElement;
        const btn = target.closest<HTMLButtonElement>("[data-action]");
        if (!btn) return;
        const action = btn.dataset.action;
        if (action === "confirm-no") {
          this.root.removeEventListener("click", handler);
          resolve(false);
        }
      };
      this.root.addEventListener("click", handler);
    });
  }

  private async selectTable(tableId: number): Promise<void> {
    this.state.selectedTableId = tableId;
    await this.withLoading(async () => {
      this.state.activeOrder = await api.getOrderByTable(tableId);
    });
  }

  private closeModal(): void {
    this.state.activeModal = null;
    this.render();
  }

  private openTableModal(draft: { id: number | null; name: string }): void {
    this.state.tableDraft = draft;
    this.state.activeModal = "table";
    this.render();
  }

  private openCategoryModal(draft: { id: number | null; name: string }): void {
    this.state.categoryDraft = draft;
    this.state.activeModal = "category";
    this.render();
  }

  private openProductModal(draft: UiState["productDraft"]): void {
    this.state.productDraft = draft;
    this.state.activeModal = "product";
    this.render();
  }

  private resetTableForm(): void {
    this.state.tableDraft = { id: null, name: "" };
  }

  private resetCategoryForm(): void {
    this.state.categoryDraft = { id: null, name: "" };
  }

  private resetProductForm(): void {
    this.state.productDraft = {
      id: null,
      name: "",
      categoryId: null,
      price: "",
      imageData: null,
    };
  }

  private findTable(tableId: number): DiningTable | undefined {
    return this.state.dashboard.tables.find((table) => table.id === tableId);
  }

  private findCategory(categoryId: number): Category | undefined {
    return this.state.dashboard.categories.find((category) => category.id === categoryId);
  }

  private findProduct(productId: number): Product | undefined {
    return this.state.dashboard.products.find((product) => product.id === productId);
  }

  private async printReceipt(orderId: number): Promise<void> {
    await this.printReceiptHtml(orderId);
  }

  private async printActiveOrder(): Promise<void> {
    if (!this.state.activeOrder) {
      return;
    }

    const orderId = this.state.activeOrder.orderId;
    if (!orderId) {
      this.showToast("Yazdirilacak aktif adisyon bulunamadi.", "error");
      return;
    }

    await this.printReceipt(orderId);
  }

  private async saveTable(): Promise<void> {
    const nameInput = document.querySelector<HTMLInputElement>("#table-name-input");
    const name = nameInput?.value.trim() ?? "";

    if (!name) {
      this.showToast("Masa adi zorunludur.", "error");
      return;
    }

    const draftId = this.state.tableDraft.id;

    const success = await this.withLoading(async () => {
      if (draftId) {
        await api.updateTable(draftId, name);
      } else {
        await api.createTable(name);
      }
      await this.loadData();
    });

    if (success) {
      this.resetTableForm();
      this.closeModal();
      this.showToast(draftId ? "Masa guncellendi." : "Masa eklendi.", "success");
    }
  }

  private async savePackageOrder(): Promise<void> {
    const customer = document.querySelector<HTMLInputElement>("#package-customer-input")?.value.trim() || "";
    const name = customer ? `Paket - ${customer}` : `Paket Siparişi`;
    const success = await this.withLoading(async () => {
      const table = await api.createTable(name);
      this.state.dashboard = await api.getDashboard();
      this.state.selectedTableId = table.id;
      this.state.activeOrder = await api.getOrderByTable(table.id);
    });
    if (success) {
      this.closeModal();
      this.showToast("Paket sipariş oluşturuldu.", "success");
    }
  }

  private async saveCategory(): Promise<void> {
    const nameInput = document.querySelector<HTMLInputElement>("#category-name-input");
    const name = nameInput?.value.trim() ?? "";

    if (!name) {
      this.showToast("Kategori adi zorunludur.", "error");
      return;
    }

    const draftId = this.state.categoryDraft.id;

    const success = await this.withLoading(async () => {
      if (draftId) {
        await api.updateCategory(draftId, name);
      } else {
        await api.createCategory(name);
      }
      await this.loadData();
    });

    if (success) {
      this.resetCategoryForm();
      this.closeModal();
      this.showToast(draftId ? "Kategori guncellendi." : "Kategori eklendi.", "success");
    }
  }

  private async saveProduct(): Promise<void> {
    const name = document.querySelector<HTMLInputElement>("#product-name-input")?.value.trim() ?? "";
    const categoryId = Number(
      document.querySelector<HTMLSelectElement>("#product-category-input")?.value ?? 0,
    );
    const price = Number(document.querySelector<HTMLInputElement>("#product-price-input")?.value ?? 0);

    if (!name || !categoryId || Number.isNaN(price)) {
      this.showToast("Urun formunu eksiksiz doldurun.", "error");
      return;
    }

    const payload: ProductPayload = {
      categoryId,
      name,
      price,
      imageData: this.state.productDraft.imageData,
    };

    const draftId = this.state.productDraft.id;
    if (draftId) {
      payload.id = draftId;
    }

    const success = await this.withLoading(async () => {
      if (payload.id) {
        await api.updateProduct(payload);
      } else {
        await api.createProduct(payload);
      }
      await this.loadData();
    });

    if (success) {
      this.resetProductForm();
      this.closeModal();
      this.showToast(draftId ? "Urun guncellendi." : "Urun eklendi.", "success");
    }
  }

  private async handleClick(event: Event): Promise<void> {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-action]");
    if (!button) {
      return;
    }

    if (button.dataset.action === "confirm-no") {
      this.state.confirmDialog = null;
      this.render();
      return;
    }

    if (button.dataset.action === "confirm-yes") {
      const cb = this.state.confirmDialog?.onConfirm;
      this.state.confirmDialog = null;
      this.render();
      if (cb) cb();
      return;
    }

    if (button.dataset.action === "confirm-print") {
      const cb = this.state.confirmDialog?.onConfirmPrint;
      this.state.confirmDialog = null;
      this.render();
      if (cb) cb();
      return;
    }

    const { action } = button.dataset;

    switch (action) {
      case "switch-view": {
        const view = (button.dataset.view as AppView) ?? "pos";
        this.state.view = view;
        this.state.activeModal = null;

        if (view === "history") {
          await this.withLoading(async () => {
            this.state.closedOrders = await api.getClosedOrders();
          });
          return;
        }

        this.render();
        return;
      }
      case "toggle-fullscreen":
        await this.toggleFullscreen();
        return;
      case "close-modal":
        this.closeModal();
        return;
      case "new-order":
        this.state.activeModal = "new-order";
        this.render();
        return;
      case "new-table-order":
        this.state.activeModal = "table-select";
        this.render();
        return;
      case "select-table-and-close": {
        const tableId = Number(button.dataset.tableId);
        if (tableId) {
          this.state.activeModal = null;
          this.render();
          await this.selectTable(tableId);
        }
        return;
      }
      case "new-package-order":
        this.state.activeModal = "package-order";
        this.render();
        return;
      case "save-package-order":
        await this.savePackageOrder();
        return;
      case "new-category":
        this.openCategoryModal({ id: null, name: "" });
        return;
      case "new-product":
        this.openProductModal({
          id: null,
          name: "",
          categoryId: null,
          price: "",
          imageData: null,
        });
        return;
      case "save-table":
        await this.saveTable();
        return;
      case "save-category":
        await this.saveCategory();
        return;
      case "save-product":
        await this.saveProduct();
        return;
      case "select-table": {
        const tableId = Number(button.dataset.tableId);
        if (tableId) {
          await this.selectTable(tableId);
        }
        return;
      }
      case "filter-category": {
        const categoryId = button.dataset.categoryId;
        this.state.selectedCategoryId = categoryId ? Number(categoryId) : null;
        this.render();
        return;
      }
      case "add-to-order": {
        if (!this.state.selectedTableId) {
          this.showToast("Once bir masa secin.", "error");
          return;
        }

        const productId = Number(button.dataset.productId);
        await this.withLoading(async () => {
          this.state.activeOrder = await api.addItemToTable(this.state.selectedTableId!, productId);
          this.state.dashboard = await api.getDashboard();
        });
        return;
      }
      case "increase-item":
      case "decrease-item": {
        const itemId = Number(button.dataset.itemId);
        const quantity = Number(button.dataset.quantity);
        const nextQuantity = action === "increase-item" ? quantity + 1 : quantity - 1;

        await this.withLoading(async () => {
          this.state.activeOrder = await api.setOrderItemQuantity(itemId, nextQuantity);
          this.state.dashboard = await api.getDashboard();
        });
        return;
      }
      case "remove-item": {
        const itemId = Number(button.dataset.itemId);
        await this.withLoading(async () => {
          this.state.activeOrder = await api.removeOrderItem(itemId);
          this.state.dashboard = await api.getDashboard();
        });
        return;
      }
      case "delete-package": {
        const pkgTableId = Number(button.dataset.tableId);
        const delOk = await this.openConfirmDialog({
          message: "Paket siparişi silinsin mi?",
          subMessage: "Bu paket siparişi ve masası tamamen silinecek.",
          confirmLabel: "Evet, Sil",
          danger: true,
        });
        this.state.confirmDialog = null;
        this.render();
        if (!delOk) return;
        await this.withLoading(async () => {
          await api.closeTableOrder(pkgTableId);
          await api.deleteTable(pkgTableId);
          this.state.dashboard = await api.getDashboard();
          this.state.closedOrders = await api.getClosedOrders();
          if (this.state.selectedTableId === pkgTableId) {
            this.state.selectedTableId = null;
            this.state.activeOrder = null;
          }
        });
        this.showToast("Paket siparişi silindi.", "success");
        return;
      }
      case "clear-order": {
        const tableId = Number(button.dataset.tableId);
        const isPackage = this.state.activeOrder?.tableName?.startsWith("Paket") ?? false;
        const clearOk = await this.openConfirmDialog({
          message: isPackage ? "Paket siparişi silinsin mi?" : "Adisyon Temizlensin mi?",
          subMessage: isPackage ? "Paket siparişi ve masası tamamen silinecek." : "Bu masadaki tüm siparişler silinecek. Bu işlem geri alınamaz.",
          confirmLabel: isPackage ? "Evet, Sil" : "Evet, Temizle",
          danger: true,
        });
        this.state.confirmDialog = null;
        this.render();
        if (!clearOk) return;

        await this.withLoading(async () => {
          if (isPackage) {
            await api.closeTableOrder(tableId);
            await api.deleteTable(tableId);
            this.state.closedOrders = await api.getClosedOrders();
            this.state.selectedTableId = null;
            this.state.activeOrder = null;
          } else {
            this.state.activeOrder = await api.clearTableOrder(tableId);
          }
          this.state.dashboard = await api.getDashboard();
        });
        this.showToast(isPackage ? "Paket siparişi silindi." : "Adisyon temizlendi.", "success");
        return;
      }
      case "close-order": {
        const tableId = Number(button.dataset.tableId);
        const items = this.state.activeOrder?.items;
        if (!items || items.length === 0) {
          this.showToast("Siparişte ürün yok, kapatılamaz.", "error");
          return;
        }
        const isPackage = this.state.activeOrder?.tableName?.startsWith("Paket") ?? false;
        let shouldPrint = false;
        const closeOk = await this.openConfirmDialog({
          message: "Adisyon Kapatılsın mı?",
          subMessage: "Hesap onaylanacak.",
          confirmLabel: "Evet",
          confirmPrintLabel: "Evet, Fişle Yazdır",
          danger: false,
          onConfirmPrint: () => { shouldPrint = true; },
        });
        this.state.confirmDialog = null;
        this.render();
        if (!closeOk) return;

        const closedOrder = await this.withLoadingResult(async () => {
          const order = await api.closeTableOrder(tableId);
          if (isPackage) {
            await api.deleteTable(tableId);
          }
          this.state.dashboard = await api.getDashboard();
          this.state.closedOrders = await api.getClosedOrders();
          this.state.activeOrder = isPackage ? null : await api.getOrderByTable(tableId);
          return order;
        });

        if (!closedOrder) {
          return;
        }

        this.showToast("Adisyon kapatildi.", "success");

        if (shouldPrint) {
          try {
            await printHtml(buildReceiptHtml(closedOrder));
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.showToast(message, "error");
          }
        }
        return;
      }
      case "print-order": {
        await this.printActiveOrder();
        return;
      }
      case "print-receipt": {
        const orderId = Number(button.dataset.orderId);
        await this.printReceipt(orderId);
        return;
      }
      case "edit-table": {
        const tableId = Number(button.dataset.tableId);
        const table = this.findTable(tableId);
        if (!table) {
          return;
        }

        this.openTableModal({ id: table.id, name: table.name });
        return;
      }
      case "delete-table": {
        const tableId = Number(button.dataset.tableId);
        const tbl = this.findTable(tableId);
        const delTableOk = await this.openConfirmDialog({
          message: `"${tbl?.name ?? "Masa"}" Silinsin mi?`,
          subMessage: "Bu işlem geri alınamaz.",
          confirmLabel: "Evet, Sil",
          danger: true,
        });
        this.state.confirmDialog = null;
        this.render();
        if (!delTableOk) return;

        const success = await this.withLoading(async () => {
          await api.deleteTable(tableId);
          await this.loadData();
        });

        if (success) {
          this.resetTableForm();
          this.showToast("Masa silindi.", "success");
        }
        return;
      }
      case "reset-table-form":
        this.resetTableForm();
        this.render();
        return;
      case "edit-category": {
        const categoryId = Number(button.dataset.categoryId);
        const category = this.findCategory(categoryId);
        if (!category) {
          return;
        }

        this.openCategoryModal({ id: category.id, name: category.name });
        return;
      }
      case "delete-category": {
        const categoryId = Number(button.dataset.categoryId);
        const cat = this.findCategory(categoryId);
        const delCatOk = await this.openConfirmDialog({
          message: `"${cat?.name ?? "Kategori"}" Silinsin mi?`,
          subMessage: "Bu kategoriye ait ürünler varsa silinemez.",
          confirmLabel: "Evet, Sil",
          danger: true,
        });
        this.state.confirmDialog = null;
        this.render();
        if (!delCatOk) return;

        const success = await this.withLoading(async () => {
          await api.deleteCategory(categoryId);
          await this.loadData();
        });

        if (success) {
          this.resetCategoryForm();
          this.showToast("Kategori silindi.", "success");
        }
        return;
      }
      case "reset-category-form":
        this.resetCategoryForm();
        this.render();
        return;
      case "edit-product": {
        const productId = Number(button.dataset.productId);
        const product = this.findProduct(productId);
        if (!product) {
          return;
        }

        this.openProductModal({
          id: product.id,
          name: product.name,
          categoryId: product.categoryId,
          price: String(product.price),
          imageData: product.imageData ?? null,
        });
        return;
      }
      case "delete-product": {
        const productId = Number(button.dataset.productId);
        const prod = this.findProduct(productId);
        const delProdOk = await this.openConfirmDialog({
          message: `"${prod?.name ?? "Ürün"}" Silinsin mi?`,
          subMessage: "Bu işlem geri alınamaz.",
          confirmLabel: "Evet, Sil",
          danger: true,
        });
        this.state.confirmDialog = null;
        this.render();
        if (!delProdOk) return;

        const success = await this.withLoading(async () => {
          await api.deleteProduct(productId);
          await this.loadData();
        });

        if (success) {
          this.resetProductForm();
          this.showToast("Urun silindi.", "success");
        }
        return;
      }
      case "reset-product-form":
        this.resetProductForm();
        this.render();
        return;
      default:
        return;
    }
  }

  private async handleChange(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement | null;

    if (!target || target.id !== "product-image-input") {
      return;
    }

    const file = target.files?.[0];
    if (!file) {
      return;
    }

    // Sync form inputs to draft state before re-render to preserve values
    this.state.productDraft.name = document.querySelector<HTMLInputElement>("#product-name-input")?.value ?? "";
    const catVal = document.querySelector<HTMLSelectElement>("#product-category-input")?.value;
    this.state.productDraft.categoryId = catVal ? Number(catVal) : null;
    this.state.productDraft.price = document.querySelector<HTMLInputElement>("#product-price-input")?.value ?? "";

    const imageData = await cropImageToAspectRatio(file, 4 / 3);
    this.state.productDraft.imageData = imageData;
    this.render();
  }

  private handleInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    if (!target || target.id !== "global-search-input") {
      return;
    }

    const query = target.value.toLowerCase().trim();

    // Filter products
    const productGrid = document.querySelector("#product-grid");
    if (productGrid) {
      const productButtons = productGrid.querySelectorAll("button[data-product-id]");
      productButtons.forEach((button) => {
        const text = button.textContent?.toLowerCase() ?? "";
        if (text.includes(query)) {
          button.classList.remove("hidden");
        } else {
          button.classList.add("hidden");
        }
      });
    }

    // Filter tables
    const tableSidebar = document.querySelector("section.w-1\\/5");
    if (tableSidebar) {
      const tableCards = tableSidebar.querySelectorAll("div[data-table-id]");
      tableCards.forEach((card) => {
        const text = card.textContent?.toLowerCase() ?? "";
        if (text.includes(query)) {
          card.classList.remove("hidden");
        } else {
          card.classList.add("hidden");
        }
      });
    }
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  const root = document.querySelector<HTMLElement>("#app");
  if (!root) {
    throw new Error("Uygulama kapsayicisi bulunamadi.");
  }

  const app = new PosApp(root);
  await app.init();
});
