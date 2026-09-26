import { api } from "./api";
import { buildDailyReportHtml, buildReceiptHtml, renderApp } from "./render";
import {
  cropImageToAspectRatio,
  formatDayLabel,
  formatRangeLabel,
  getMonthRange,
  getWeekRange,
  printHtml,
  readFullscreenState,
  setFullscreenState,
  shiftDate,
  shiftMonth,
  shiftWeek,
  todayLocalDate,
} from "./utils";
import type {
  AppView,
  Category,
  ConfirmDialog,
  DiningTable,
  PaymentMethod,
  Product,
  ProductPayload,
  ReportPeriodType,
  UiState,
} from "./types";

class PosApp {
  private root: HTMLElement;

  private toastTimer: number | null = null;
  private confirmResolver: ((value: boolean) => void) | null = null;

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
    productDraft: { id: null, name: "", categoryId: null, price: "", vatRate: 10, imageData: null },
    toast: null,
    vatRate: 10,
    reportPeriod: "daily",
    reportStartDate: todayLocalDate(),
    reportEndDate: todayLocalDate(),
    reportLabel: "Bugün",
    selectedYear: new Date().getFullYear(),
    selectedMonth: new Date().getMonth() + 1,
    selectedDate: todayLocalDate(),
    dailySummary: null,
    salesSummary: null,
    businessDates: [],
    pendingPaymentMethod: "cash",
    touchKeyboardEnabled: true,
  };

  private static readonly TOUCH_KEYBOARD_STORAGE_KEY = "samsa-touch-keyboard";

  constructor(root: HTMLElement) {
    this.root = root;
    this.root.addEventListener("click", (event) => this.handleClick(event));
    this.root.addEventListener("change", (event) => this.handleChange(event));
    this.root.addEventListener("input", (event) => this.handleInput(event));
    this.root.addEventListener("focusin", (event) => this.handleFocusIn(event));
    document.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  async init(): Promise<void> {
    this.state.isFullscreen = await readFullscreenState();
    this.bindFullscreenListeners();
    this.restoreCategorySelection();
    try {
      this.state.touchKeyboardEnabled =
        localStorage.getItem(PosApp.TOUCH_KEYBOARD_STORAGE_KEY) !== "0";
    } catch {
      this.state.touchKeyboardEnabled = true;
    }
    try {
      this.state.vatRate = await api.getVatRate();
    } catch {
      this.state.vatRate = 10;
    }
    await this.refreshAll();
  }

  private static readonly CATEGORY_STORAGE_KEY = "samsa-selected-category";

  private restoreCategorySelection(): void {
    try {
      const raw = localStorage.getItem(PosApp.CATEGORY_STORAGE_KEY);
      if (raw !== null && raw !== "") {
        this.state.selectedCategoryId = Number(raw);
      }
    } catch {
      // storage yoksa sessiz geç
    }
  }

  /** Her zaman bir menü seçili olsun: kayıtlı yoksa/geçersizse ilk aktif kategori. */
  private ensureCategorySelection(): void {
    const active = this.state.dashboard.categories.filter((c) => c.isActive);
    if (!active.some((c) => c.id === this.state.selectedCategoryId)) {
      this.state.selectedCategoryId = active[0]?.id ?? null;
    }
    try {
      if (this.state.selectedCategoryId !== null) {
        localStorage.setItem(PosApp.CATEGORY_STORAGE_KEY, String(this.state.selectedCategoryId));
      } else {
        localStorage.removeItem(PosApp.CATEGORY_STORAGE_KEY);
      }
    } catch {
      // storage yoksa sessiz geç
    }
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
      api.getClosedOrdersByRange(this.state.reportStartDate, this.state.reportEndDate),
    ]);

    this.state.dashboard = dashboard;
    this.state.closedOrders = closedOrders;
    this.ensureCategorySelection();

    try {
      const [summary, dates] = await Promise.all([
        api.getSalesPeriodSummary(
          this.state.reportStartDate,
          this.state.reportEndDate,
          this.state.reportPeriod,
          this.state.reportLabel,
        ),
        api.getBusinessDates().catch(() => [] as string[]),
      ]);
      this.state.salesSummary = summary;
      if (dates.length) {
        this.state.businessDates = dates;
      }
    } catch {
      // Rapor yüklenemezse sessiz geç
    }

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

  private async loadReport(): Promise<void> {
    const { reportStartDate, reportEndDate, reportPeriod, reportLabel } = this.state;
    const [summary, orders, dates] = await Promise.all([
      api.getSalesPeriodSummary(reportStartDate, reportEndDate, reportPeriod, reportLabel),
      api.getClosedOrdersByRange(reportStartDate, reportEndDate),
      api.getBusinessDates().catch(() => [] as string[]),
    ]);
    this.state.salesSummary = summary;
    this.state.closedOrders = orders;
    if (dates.length) {
      this.state.businessDates = dates;
    }
  }

  private async loadDaily(): Promise<void> {
    await this.loadReport();
  }

  private async setPeriod(period: ReportPeriodType): Promise<void> {
    this.state.reportPeriod = period;
    if (period === "daily") {
      this.state.reportStartDate = this.state.selectedDate;
      this.state.reportEndDate = this.state.selectedDate;
      this.state.reportLabel = formatDayLabel(this.state.selectedDate);
    } else if (period === "weekly") {
      const range = getWeekRange(this.state.selectedDate);
      this.state.reportStartDate = range.start;
      this.state.reportEndDate = range.end;
      this.state.reportLabel = range.label;
    } else if (period === "monthly") {
      const range = getMonthRange(this.state.selectedYear, this.state.selectedMonth);
      this.state.reportStartDate = range.start;
      this.state.reportEndDate = range.end;
      this.state.reportLabel = range.label;
    } else if (period === "custom") {
      this.state.reportLabel = formatRangeLabel(this.state.reportStartDate, this.state.reportEndDate);
    }

    this.state.salesSummary = null;
    this.state.closedOrders = [];
    this.render();
    await this.withLoading(async () => {
      await this.loadReport();
    });
  }

  /** Tarih değişiminin tek kapısı: önce tarihi + ekranı günceller, sonra veriyi çeker. */
  private async selectDate(date: string): Promise<void> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return;
    }
    if (date > todayLocalDate()) {
      this.showToast("Gelecek bir tarih seçilemez.", "error");
      return;
    }
    this.state.selectedDate = date;
    this.state.reportStartDate = date;
    this.state.reportEndDate = date;
    this.state.reportLabel = formatDayLabel(date);
    this.state.salesSummary = null;
    this.state.closedOrders = [];
    this.render();
    await this.withLoading(async () => {
      await this.loadReport();
    });
  }

  private async selectWeek(deltaWeeks: number): Promise<void> {
    const nextDate = shiftWeek(this.state.reportStartDate, deltaWeeks);
    const range = getWeekRange(nextDate);
    if (range.start > todayLocalDate()) {
      this.showToast("Gelecek bir hafta seçilemez.", "error");
      return;
    }
    this.state.selectedDate = range.start;
    this.state.reportStartDate = range.start;
    this.state.reportEndDate = range.end;
    this.state.reportLabel = range.label;
    this.state.salesSummary = null;
    this.state.closedOrders = [];
    this.render();
    await this.withLoading(async () => {
      await this.loadReport();
    });
  }

  private async selectCurrentWeek(): Promise<void> {
    const range = getWeekRange(todayLocalDate());
    this.state.selectedDate = todayLocalDate();
    this.state.reportStartDate = range.start;
    this.state.reportEndDate = range.end;
    this.state.reportLabel = range.label;
    this.state.salesSummary = null;
    this.state.closedOrders = [];
    this.render();
    await this.withLoading(async () => {
      await this.loadReport();
    });
  }

  private async selectMonth(year: number, month: number): Promise<void> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    if (year > currentYear || (year === currentYear && month > currentMonth)) {
      this.showToast("Gelecek bir ay seçilemez.", "error");
      return;
    }
    this.state.selectedYear = year;
    this.state.selectedMonth = month;
    const range = getMonthRange(year, month);
    this.state.reportStartDate = range.start;
    this.state.reportEndDate = range.end;
    this.state.reportLabel = range.label;
    this.state.salesSummary = null;
    this.state.closedOrders = [];
    this.render();
    await this.withLoading(async () => {
      await this.loadReport();
    });
  }

  private async shiftSelectedMonth(delta: number): Promise<void> {
    const next = shiftMonth(this.state.selectedYear, this.state.selectedMonth, delta);
    await this.selectMonth(next.year, next.month);
  }

  private async applyCustomRange(start: string, end: string): Promise<void> {
    if (!start || !end) {
      this.showToast("Başlangıç ve bitiş tarihlerini girin.", "error");
      return;
    }
    if (start > end) {
      this.showToast("Başlangıç tarihi bitiş tarihinden sonra olamaz.", "error");
      return;
    }
    if (end > todayLocalDate()) {
      this.showToast("Gelecek bir tarih seçilemez.", "error");
      return;
    }
    this.state.reportStartDate = start;
    this.state.reportEndDate = end;
    this.state.reportLabel = formatRangeLabel(start, end);
    this.state.salesSummary = null;
    this.state.closedOrders = [];
    this.render();
    await this.withLoading(async () => {
      await this.loadReport();
    });
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

  private openConfirmDialog(options: Omit<ConfirmDialog, "onConfirm"> & { onConfirm?: (paymentMethod?: PaymentMethod) => void }): Promise<boolean> {
    // Eski sızdıran listener kaldırıldı: tek resolver + merkezi handleClick.
    if (this.confirmResolver) {
      this.confirmResolver(false);
      this.confirmResolver = null;
    }
    this.state.pendingPaymentMethod = "cash";
    return new Promise((resolve) => {
      this.confirmResolver = resolve;
      const { onConfirmPrint, onConfirm, showPaymentSelect, ...rest } = options;
      this.state.confirmDialog = {
        ...rest,
        showPaymentSelect,
        onConfirm: (pm) => {
          if (onConfirm) {
            onConfirm(pm ?? this.state.pendingPaymentMethod);
          }
          resolve(true);
        },
        onConfirmPrint: onConfirmPrint
          ? (pm) => { onConfirmPrint(pm ?? this.state.pendingPaymentMethod); resolve(true); }
          : undefined,
      };
      this.render();
    });
  }

  private settleConfirm(ok: boolean, viaPrint = false): void {
    const dialog = this.state.confirmDialog;
    const resolver = this.confirmResolver;
    const payment = this.state.pendingPaymentMethod;
    this.state.confirmDialog = null;
    this.confirmResolver = null;
    this.render();
    if (!dialog) {
      if (resolver) resolver(false);
      return;
    }
    if (!ok) {
      if (resolver) resolver(false);
      return;
    }
    if (viaPrint) {
      if (dialog.onConfirmPrint) {
        dialog.onConfirmPrint(payment);
      } else if (resolver) {
        resolver(true);
      }
      return;
    }
    if (dialog.onConfirm) {
      dialog.onConfirm(payment);
    } else if (resolver) {
      resolver(true);
    }
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
      vatRate: 10,
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

    // State'teki kopya bayat olabilir; backend'den taze fişi çekip yazdır.
    await this.printReceipt(orderId);
  }

  private async printDailyReport(): Promise<void> {
    const summary = this.state.salesSummary || this.state.dailySummary;
    if (!summary) {
      this.showToast("Önce rapor verisi yüklensin.", "error");
      return;
    }
    try {
      await printHtml(buildDailyReportHtml(summary));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.showToast(message, "error");
    }
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
    const raw = document.querySelector<HTMLInputElement>("#package-customer-input")?.value.trim() || "";
    const created = await this.withLoadingResult(async () => {
      // İsim opsiyonel: boşsa backend o güne özel "Paket Sipariş N" üretir.
      const table = await api.createPackageOrder(raw || null);
      this.state.dashboard = await api.getDashboard();
      this.state.selectedTableId = table.id;
      this.state.activeOrder = await api.getOrderByTable(table.id);
      return table;
    });
    if (created) {
      this.closeModal();
      this.showToast(`"${created.name}" oluşturuldu.`, "success");
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
    const vatRaw = Number(document.querySelector<HTMLSelectElement>("#product-vat-input")?.value ?? 10);
    const vat = Number.isFinite(vatRaw) && vatRaw >= 0 && vatRaw <= 100 ? vatRaw : 10;

    if (!name || !categoryId || Number.isNaN(price) || price < 0) {
      this.showToast("Urun formunu eksiksiz doldurun.", "error");
      return;
    }

    const payload: ProductPayload = {
      categoryId,
      name,
      price,
      vatRate: vat,
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
      this.settleConfirm(false);
      return;
    }

    if (button.dataset.action === "confirm-yes") {
      this.settleConfirm(true, false);
      return;
    }

    if (button.dataset.action === "confirm-print") {
      this.settleConfirm(true, true);
      return;
    }

    if (button.dataset.action === "select-payment") {
      const method = (button.dataset.method as PaymentMethod) ?? "cash";
      this.state.pendingPaymentMethod = method;
      this.render();
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
            await this.loadDaily();
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
      case "set-vat-rate": {
        // KDV artık ürün bazında tanımlanıyor; bu aksiyon eski panelden kalma.
        // Yeni ürünler için varsayılan oranı günceller.
        const rate = Number(button.dataset.rate ?? "10");
        if (!Number.isFinite(rate)) return;
        const updated = await this.withLoadingResult(() => api.setVatRate(rate));
        if (updated !== null) {
          this.state.vatRate = updated;
          this.showToast(`Yeni ürünler için varsayılan KDV %${updated} oldu.`, "success");
        }
        return;
      }
      case "select-today": {
        await this.selectDate(todayLocalDate());
        return;
      }
      case "prev-date": {
        await this.selectDate(shiftDate(this.state.selectedDate, -1));
        return;
      }
      case "next-date": {
        const next = shiftDate(this.state.selectedDate, 1);
        if (next > todayLocalDate()) return;
        await this.selectDate(next);
        return;
      }
      case "set-period": {
        const period = (button.dataset.period as ReportPeriodType) || "daily";
        await this.setPeriod(period);
        return;
      }
      case "prev-week": {
        await this.selectWeek(-1);
        return;
      }
      case "next-week": {
        await this.selectWeek(1);
        return;
      }
      case "select-current-week": {
        await this.selectCurrentWeek();
        return;
      }
      case "prev-month": {
        await this.shiftSelectedMonth(-1);
        return;
      }
      case "next-month": {
        await this.shiftSelectedMonth(1);
        return;
      }
      case "select-current-month": {
        const now = new Date();
        await this.selectMonth(now.getFullYear(), now.getMonth() + 1);
        return;
      }
      case "apply-custom-range": {
        const start =
          document.querySelector<HTMLInputElement>("#report-start-date-input")?.value || "";
        const end =
          document.querySelector<HTMLInputElement>("#report-end-date-input")?.value || "";
        await this.applyCustomRange(start, end);
        return;
      }
      case "print-daily-report": {
        await this.printDailyReport();
        return;
      }
      case "toggle-touch-keyboard": {
        this.state.touchKeyboardEnabled = !this.state.touchKeyboardEnabled;
        try {
          localStorage.setItem(
            PosApp.TOUCH_KEYBOARD_STORAGE_KEY,
            this.state.touchKeyboardEnabled ? "1" : "0",
          );
        } catch {
          // storage yoksa sessiz geç
        }
        this.render();
        return;
      }
      case "new-category":
        this.openCategoryModal({ id: null, name: "" });
        return;
      case "new-product":
        this.openProductModal({
          id: null,
          name: "",
          categoryId: null,
          price: "",
          vatRate: this.state.vatRate,
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
        try {
          if (this.state.selectedCategoryId !== null) {
            localStorage.setItem(PosApp.CATEGORY_STORAGE_KEY, String(this.state.selectedCategoryId));
          } else {
            localStorage.removeItem(PosApp.CATEGORY_STORAGE_KEY);
          }
        } catch {
          // storage yoksa sessiz geç
        }
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
          subMessage: "Bu paket siparişi ve masası arşivlenecek. Geçmiş kayıtlar korunur.",
          confirmLabel: "Evet, Sil",
          danger: true,
        });
        if (!delOk) return;
        // Boş paket de silinebilsin: önce iptal et, sonra arşivle
        const ok = await this.withLoading(async () => {
          await api.clearTableOrder(pkgTableId).catch(() => null);
          await api.deleteTable(pkgTableId);
          this.state.dashboard = await api.getDashboard();
          await this.loadDaily().catch(() => undefined);
          if (this.state.selectedTableId === pkgTableId) {
            this.state.selectedTableId = null;
            this.state.activeOrder = null;
          }
        });
        if (!ok) return;
        this.showToast("Paket siparişi silindi.", "success");
        return;
      }
      case "clear-order": {
        const tableId = Number(button.dataset.tableId);
        const isPackage = this.state.activeOrder?.tableName?.startsWith("Paket") ?? false;
        const clearOk = await this.openConfirmDialog({
          message: isPackage ? "Paket siparişi silinsin mi?" : "Adisyon Temizlensin mi?",
          subMessage: isPackage ? "Paket siparişi ve masası arşivlenecek. Geçmiş korunur." : "Bu masadaki tüm siparişler silinecek. Bu işlem geri alınamaz.",
          confirmLabel: isPackage ? "Evet, Sil" : "Evet, Temizle",
          danger: true,
        });
        if (!clearOk) return;

        const ok = await this.withLoading(async () => {
          if (isPackage) {
            await api.clearTableOrder(tableId).catch(() => null);
            await api.deleteTable(tableId);
            this.state.selectedTableId = null;
            this.state.activeOrder = null;
          } else {
            this.state.activeOrder = await api.clearTableOrder(tableId);
          }
          this.state.dashboard = await api.getDashboard();
          await this.loadDaily().catch(() => undefined);
        });
        if (!ok) return;
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
        let chosenPayment: PaymentMethod = "cash";
        const closeOk = await this.openConfirmDialog({
          message: "Adisyon Kapatılsın mı?",
          subMessage: "Ödeme yöntemini seçin. Bu bilgi sadece geçmişe işlenir.",
          confirmLabel: "Evet",
          confirmPrintLabel: "Evet, Fişle Yazdır",
          danger: false,
          showPaymentSelect: true,
          onConfirm: (pm) => { chosenPayment = pm ?? "cash"; },
          onConfirmPrint: (pm) => { shouldPrint = true; chosenPayment = pm ?? "cash"; },
        });
        if (!closeOk) return;

        const closedOrder = await this.withLoadingResult(async () => {
          const order = await api.closeTableOrder(tableId, chosenPayment);
          if (isPackage) {
            await api.deleteTable(tableId).catch(() => undefined);
          }
          this.state.dashboard = await api.getDashboard();
          await this.loadDaily().catch(() => undefined);
          this.state.activeOrder = isPackage ? null : await api.getOrderByTable(tableId);
          if (isPackage) {
            this.state.selectedTableId = null;
          }
          return order;
        });

        if (!closedOrder) {
          return;
        }

        this.showToast("Adisyon kapatildi.", "success");

        if (shouldPrint) {
          try {
            const receipt = await api.getReceipt(closedOrder.orderId!);
            await printHtml(buildReceiptHtml(receipt));
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
          subMessage: "Masa arşivlenir, geçmiş siparişler korunur.",
          confirmLabel: "Evet, Sil",
          danger: true,
        });
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
          vatRate: product.vatRate ?? 10,
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
    const target = event.target as HTMLInputElement | HTMLSelectElement | null;
    if (!target) return;

    if (target.id === "business-date-input") {
      const value = (target as HTMLInputElement).value;
      if (value) {
        await this.selectDate(value);
      }
      return;
    }

    if (target.id === "business-date-select") {
      const value = (target as HTMLSelectElement).value;
      if (value) {
        await this.selectDate(value);
      }
      return;
    }

    if (target.id === "report-month-select") {
      const month = Number((target as HTMLSelectElement).value);
      if (month >= 1 && month <= 12) {
        await this.selectMonth(this.state.selectedYear, month);
      }
      return;
    }

    if (target.id === "report-year-select") {
      const year = Number((target as HTMLSelectElement).value);
      if (year > 2000) {
        await this.selectMonth(year, this.state.selectedMonth);
      }
      return;
    }

    if (target.id !== "product-image-input") {
      return;
    }

    const fileInput = target as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      return;
    }

    // Sync form inputs to draft state before re-render to preserve values
    this.state.productDraft.name = document.querySelector<HTMLInputElement>("#product-name-input")?.value ?? "";
    const catVal = document.querySelector<HTMLSelectElement>("#product-category-input")?.value;
    this.state.productDraft.categoryId = catVal ? Number(catVal) : null;
    this.state.productDraft.price = document.querySelector<HTMLInputElement>("#product-price-input")?.value ?? "";
    const vatVal = Number(document.querySelector<HTMLSelectElement>("#product-vat-input")?.value ?? 10);
    this.state.productDraft.vatRate = Number.isFinite(vatVal) ? vatVal : 10;

    try {
      const imageData = await cropImageToAspectRatio(file, 4 / 3);
      this.state.productDraft.imageData = imageData;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.showToast(message, "error");
      return;
    }
    this.render();
  }

  private handleFocusIn(event: FocusEvent): void {
    if (!this.state.touchKeyboardEnabled) {
      return;
    }
    const el = event.target as HTMLElement | null;
    if (!el) {
      return;
    }
    // Tarih seçici / dosya / kutucukların kendi arayüzü var; klavye gereksiz.
    if (el.tagName === "TEXTAREA") {
      api.showTouchKeyboard().catch(() => undefined);
      return;
    }
    if (el.tagName !== "INPUT") {
      return;
    }
    const type = (el as HTMLInputElement).type;
    if (
      type === "date" ||
      type === "file" ||
      type === "checkbox" ||
      type === "radio" ||
      type === "button" ||
      type === "submit" ||
      type === "hidden" ||
      type === "range" ||
      type === "color"
    ) {
      return;
    }
    api.showTouchKeyboard().catch(() => undefined);
  }

  private handleInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    if (!target || (target.id !== "global-search-input" && target.id !== "global-search-input-mobile")) {
      return;
    }

    const query = target.value.toLowerCase().trim();
    const otherId = target.id === "global-search-input" ? "global-search-input-mobile" : "global-search-input";
    const other = document.querySelector<HTMLInputElement>(`#${otherId}`);
    if (other && other.value !== target.value) {
      other.value = target.value;
    }

    // Ürün filtrele
    const productButtons = document.querySelectorAll("button[data-product-id]");
    productButtons.forEach((button) => {
      const text = button.textContent?.toLowerCase() ?? "";
      if (!query || text.includes(query)) {
        button.classList.remove("hidden");
      } else {
        button.classList.add("hidden");
      }
    });

    // Masa filtrele
    const tableCards = document.querySelectorAll("div[data-table-id]");
    tableCards.forEach((card) => {
      const text = card.textContent?.toLowerCase() ?? "";
      if (!query || text.includes(query)) {
        card.classList.remove("hidden");
      } else {
        card.classList.add("hidden");
      }
    });
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
