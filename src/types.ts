export type AppView = "pos" | "tables" | "categories" | "products" | "history";
export type FormModal = "table" | "category" | "product";
export type PosPanel = "tables" | "products" | "order";

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
  isActive: boolean;
}

export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderDetail {
  orderId: number | null;
  tableId: number;
  tableName: string;
  status: "open" | "closed" | "cancelled";
  openedAt?: string | null;
  closedAt?: string | null;
  items: OrderItem[];
  total: number;
}

export interface ClosedOrderSummary {
  orderId: number;
  tableId: number;
  tableName: string;
  closedAt: string;
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
  imageData: string | null;
}

export interface UiState {
  view: AppView;
  posPanel: PosPanel;
  activeModal: FormModal | null;
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
}

export interface ProductPayload {
  id?: number;
  categoryId: number;
  name: string;
  imageData?: string | null;
  price: number;
}
