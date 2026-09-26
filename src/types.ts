export type AppView = "pos" | "tables" | "categories" | "products" | "history";
export type FormModal = "table" | "category" | "product" | "new-order" | "package-order" | "table-select" | "daily-report";

export type PaymentMethod = "cash" | "card" | "other";

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "Nakit",
  card: "Kart",
  other: "Diğer",
};

export const VAT_OPTIONS = [1, 10, 20] as const;

export interface ConfirmDialog {
  message: string;
  subMessage?: string;
  confirmLabel?: string;
  confirmPrintLabel?: string;
  danger?: boolean;
  /** Adisyon kapatma dialog'unda ödeme yöntemi seçimi gösterilsin mi */
  showPaymentSelect?: boolean;
  onConfirm: (paymentMethod?: PaymentMethod) => void;
  onConfirmPrint?: (paymentMethod?: PaymentMethod) => void;
}

export interface DiningTable {
  id: number;
  name: string;
  positionIndex: number;
  status: "available" | "occupied" | "reserved";
  currentTotal: number;
  itemCount: number;
}

export interface Category {
  id: number;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Product {
  id: number;
  categoryId: number;
  name: string;
  imageData?: string | null;
  price: number;
  /** KDV oranı (yüzde). Fiyat KDV dahildir. */
  vatRate: number;
  isActive: boolean;
}

export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  /** Satış anındaki ürün KDV oranı snapshot'ı */
  vatRate?: number | null;
}

export interface OrderDetail {
  orderId: number | null;
  tableId: number;
  tableName: string;
  status: "open" | "closed" | "cancelled";
  openedAt?: string | null;
  closedAt?: string | null;
  businessDate?: string | null;
  vatRateSnapshot?: number | null;
  paymentMethod?: string | null;
  items: OrderItem[];
  total: number;
}

export interface ClosedOrderSummary {
  orderId: number;
  tableId: number;
  tableName: string;
  closedAt: string;
  businessDate?: string | null;
  paymentMethod?: string | null;
  itemCount: number;
  total: number;
}

export interface DashboardPayload {
  tables: DiningTable[];
  categories: Category[];
  products: Product[];
}

export interface TableDraft {
  id: number | null;
  name: string;
}

export interface CategoryDraft {
  id: number | null;
  name: string;
}

export interface ProductDraft {
  id: number | null;
  name: string;
  categoryId: number | null;
  price: string;
  vatRate: number;
  imageData: string | null;
}

export interface DailyProductSale {
  productId: number;
  productName: string;
  categoryName: string;
  quantity: number;
  total: number;
}

export interface DailyCategorySale {
  categoryName: string;
  quantity: number;
  total: number;
}

export interface DailyPaymentBreakdown {
  method: string;
  count: number;
  total: number;
}

export interface DailySummary {
  date: string;
  total: number;
  orderCount: number;
  itemCount: number;
  averageBasket: number;
  productSales: DailyProductSale[];
  categorySales: DailyCategorySale[];
  payments: DailyPaymentBreakdown[];
  isClosed: boolean;
  closedAt?: string | null;
}

export type ReportPeriodType = "daily" | "weekly" | "monthly" | "custom";

export interface SalesPeriodSummary {
  periodType: ReportPeriodType;
  label: string;
  startDate: string;
  endDate: string;
  total: number;
  orderCount: number;
  itemCount: number;
  averageBasket: number;
  productSales: DailyProductSale[];
  categorySales: DailyCategorySale[];
  payments: DailyPaymentBreakdown[];
}

export interface UiState {
  view: AppView;
  isFullscreen: boolean;
  activeModal: FormModal | null;
  confirmDialog: ConfirmDialog | null;
  loading: boolean;
  selectedTableId: number | null;
  selectedCategoryId: number | null;
  dashboard: DashboardPayload;
  activeOrder: OrderDetail | null;
  closedOrders: ClosedOrderSummary[];
  tableDraft: TableDraft;
  categoryDraft: CategoryDraft;
  productDraft: ProductDraft;
  toast: {
    type: "success" | "error";
    message: string;
  } | null;
  /** KDV oranı (fiyatlara dahil). Varsayılan 10 */
  vatRate: number;
  /** Rapor dönemi türü */
  reportPeriod: ReportPeriodType;
  reportStartDate: string;
  reportEndDate: string;
  reportLabel: string;
  selectedYear: number;
  selectedMonth: number;
  /** Günlük satış görünümünde seçili gün (YYYY-MM-DD) */
  selectedDate: string;
  dailySummary: DailySummary | null;
  salesSummary: SalesPeriodSummary | null;
  businessDates: string[];
  /** Kapatma dialog'unda seçili ödeme yöntemi */
  pendingPaymentMethod: PaymentMethod;
  /** Yazı alanına dokununca Windows sanal klavyesi otomatik açılsın mı */
  touchKeyboardEnabled: boolean;
}

export interface ProductPayload {
  id?: number;
  categoryId: number;
  name: string;
  imageData?: string | null;
  price: number;
  vatRate: number;
}
