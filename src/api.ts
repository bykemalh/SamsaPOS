import { invoke } from "@tauri-apps/api/core";
import type {
  Category,
  ClosedOrderSummary,
  DailySummary,
  DashboardPayload,
  DiningTable,
  OrderDetail,
  ProductPayload,
  SalesPeriodSummary,
} from "./types";

export const api = {
  getDashboard() {
    return invoke<DashboardPayload>("get_dashboard");
  },
  getOrderByTable(tableId: number) {
    return invoke<OrderDetail>("get_order_by_table", { tableId });
  },
  getClosedOrders() {
    return invoke<ClosedOrderSummary[]>("get_closed_orders");
  },
  getClosedOrdersByDate(date: string) {
    return invoke<ClosedOrderSummary[]>("get_closed_orders_by_date", { date });
  },
  getReceipt(orderId: number) {
    return invoke<OrderDetail>("get_receipt", { orderId });
  },
  createTable(name: string) {
    return invoke<DiningTable>("create_table", { name });
  },
  createPackageOrder(customer: string | null) {
    return invoke<DiningTable>("create_package_order", { customer });
  },
  updateTable(id: number, name: string) {
    return invoke<DiningTable>("update_table", { id, name });
  },
  deleteTable(id: number) {
    return invoke<void>("delete_table", { id });
  },
  createCategory(name: string) {
    return invoke<Category>("create_category", { name });
  },
  updateCategory(id: number, name: string) {
    return invoke<Category>("update_category", { id, name });
  },
  deleteCategory(id: number) {
    return invoke<void>("delete_category", { id });
  },
  createProduct(payload: ProductPayload) {
    return invoke<void>("create_product", { payload });
  },
  updateProduct(payload: ProductPayload) {
    return invoke<void>("update_product", { payload });
  },
  deleteProduct(id: number) {
    return invoke<void>("delete_product", { id });
  },
  addItemToTable(tableId: number, productId: number) {
    return invoke<OrderDetail>("add_item_to_table", { tableId, productId });
  },
  setOrderItemQuantity(itemId: number, quantity: number) {
    return invoke<OrderDetail>("set_order_item_quantity", { itemId, quantity });
  },
  removeOrderItem(itemId: number) {
    return invoke<OrderDetail>("remove_order_item", { itemId });
  },
  clearTableOrder(tableId: number) {
    return invoke<OrderDetail>("clear_table_order", { tableId });
  },
  closeTableOrder(tableId: number, paymentMethod?: string) {
    return invoke<OrderDetail>("close_table_order", { tableId, paymentMethod });
  },
  getVatRate() {
    return invoke<number>("get_vat_rate");
  },
  setVatRate(rate: number) {
    return invoke<number>("set_vat_rate", { rate });
  },
  getBusinessDates() {
    return invoke<string[]>("get_business_dates");
  },
  getDailySummary(date: string) {
    return invoke<DailySummary>("get_daily_summary", { date });
  },
  getSalesPeriodSummary(startDate: string, endDate: string, periodType: string, label: string) {
    return invoke<SalesPeriodSummary>("get_sales_period_summary", {
      startDate,
      endDate,
      periodType,
      label,
    });
  },
  getClosedOrdersByRange(startDate: string, endDate: string) {
    return invoke<ClosedOrderSummary[]>("get_closed_orders_by_range", {
      startDate,
      endDate,
    });
  },
  closeBusinessDay(date: string) {
    return invoke<DailySummary>("close_business_day", { date });
  },
  showTouchKeyboard() {
    return invoke<void>("show_touch_keyboard");
  },
};
