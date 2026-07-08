import { api } from "./api";
import { buildReceiptHtml, renderApp } from "./render";
import { cropImageToAspectRatio, printHtml, readFullscreenState, setFullscreenState } from "./utils";
import type {
  AppView,
  Category,
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

  private async withLoading(task: () => Promise<void>): Promise<void> {
    await this.withLoadingResult(async () => {
      await task();
      return undefined;
    });
  }

  private async withLoadingResult<T>(task: () => Promise<T>): Promise<T | null> {
    this.state.loading = true;
    this.render();

    try {
      return await task();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.showToast(message, "error");
      return null;
    } finally {
      this.state.loading = false;
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

    await this.withLoading(async () => {
      if (draftId) {
        await api.updateTable(draftId, name);
      } else {
        await api.createTable(name);
      }
      await this.loadData();
    });

    this.resetTableForm();
    this.closeModal();
    this.showToast(draftId ? "Masa guncellendi." : "Masa eklendi.", "success");
  }

  private async saveCategory(): Promise<void> {
    const nameInput = document.querySelector<HTMLInputElement>("#category-name-input");
    const name = nameInput?.value.trim() ?? "";

    if (!name) {
      this.showToast("Kategori adi zorunludur.", "error");
      return;
    }

    const draftId = this.state.categoryDraft.id;

    await this.withLoading(async () => {
      if (draftId) {
        await api.updateCategory(draftId, name);
      } else {
        await api.createCategory(name);
      }
      await this.loadData();
    });

    this.resetCategoryForm();
    this.closeModal();
    this.showToast(draftId ? "Kategori guncellendi." : "Kategori eklendi.", "success");
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

    await this.withLoading(async () => {
      if (payload.id) {
        await api.updateProduct(payload);
      } else {
        await api.createProduct(payload);
      }
      await this.loadData();
    });

    this.resetProductForm();
    this.closeModal();
    this.showToast(draftId ? "Urun guncellendi." : "Urun eklendi.", "success");
  }

  private async handleClick(event: Event): Promise<void> {
    const target = event.target as HTMLElement | null;
    const button = target?.closest<HTMLElement>("[data-action]");
    if (!button) {
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
      case "new-table":
        this.openTableModal({ id: null, name: "" });
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
      case "clear-order": {
        const tableId = Number(button.dataset.tableId);
        if (!window.confirm("Bu masadaki tum siparisler silinsin mi?")) {
          return;
        }

        await this.withLoading(async () => {
          this.state.activeOrder = await api.clearTableOrder(tableId);
          this.state.dashboard = await api.getDashboard();
        });
        this.showToast("Adisyon temizlendi.", "success");
        return;
      }
      case "close-order": {
        const tableId = Number(button.dataset.tableId);
        if (!window.confirm("Adisyon kapatilsin mi?")) {
          return;
        }

        const closedOrder = await this.withLoadingResult(async () => {
          const order = await api.closeTableOrder(tableId);
          this.state.dashboard = await api.getDashboard();
          this.state.closedOrders = await api.getClosedOrders();
          this.state.activeOrder = await api.getOrderByTable(tableId);
          return order;
        });

        if (!closedOrder) {
          return;
        }

        this.showToast("Adisyon kapatildi.", "success");

        try {
          await printHtml(buildReceiptHtml(closedOrder));
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.showToast(message, "error");
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
        if (!window.confirm("Masa silinsin mi?")) {
          return;
        }

        await this.withLoading(async () => {
          await api.deleteTable(tableId);
          await this.loadData();
        });
        this.resetTableForm();
        this.showToast("Masa silindi.", "success");
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
        if (!window.confirm("Kategori silinsin mi?")) {
          return;
        }

        await this.withLoading(async () => {
          await api.deleteCategory(categoryId);
          await this.loadData();
        });
        this.resetCategoryForm();
        this.showToast("Kategori silindi.", "success");
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
        if (!window.confirm("Urun silinsin mi?")) {
          return;
        }

        await this.withLoading(async () => {
          await api.deleteProduct(productId);
          await this.loadData();
        });
        this.resetProductForm();
        this.showToast("Urun silindi.", "success");
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

    const imageData = await cropImageToAspectRatio(file, 4 / 3);
    this.state.productDraft.imageData = imageData;
    this.render();
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
