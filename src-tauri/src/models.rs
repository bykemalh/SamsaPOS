use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DiningTable {
    pub id: i64,
    pub name: String,
    pub position_index: i64,
    pub status: String,
    pub current_total: f64,
    pub item_count: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Category {
    pub id: i64,
    pub name: String,
    pub sort_order: i64,
    pub is_active: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Product {
    pub id: i64,
    pub category_id: i64,
    pub name: String,
    pub image_data: Option<String>,
    pub price: f64,
    pub vat_rate: f64,
    pub is_active: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct OrderItem {
    pub id: i64,
    pub product_id: i64,
    pub product_name: String,
    pub unit_price: f64,
    pub quantity: i64,
    pub line_total: f64,
    pub vat_rate: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct OrderDetail {
    pub order_id: Option<i64>,
    pub table_id: i64,
    pub table_name: String,
    pub status: String,
    pub opened_at: Option<String>,
    pub closed_at: Option<String>,
    pub business_date: Option<String>,
    pub vat_rate_snapshot: Option<f64>,
    pub payment_method: Option<String>,
    pub items: Vec<OrderItem>,
    pub total: f64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardPayload {
    pub tables: Vec<DiningTable>,
    pub categories: Vec<Category>,
    pub products: Vec<Product>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClosedOrderSummary {
    pub order_id: i64,
    pub table_id: i64,
    pub table_name: String,
    pub closed_at: String,
    pub business_date: Option<String>,
    pub payment_method: Option<String>,
    pub item_count: i64,
    pub total: f64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductPayload {
    pub id: Option<i64>,
    pub category_id: i64,
    pub name: String,
    pub image_data: Option<String>,
    pub price: f64,
    pub vat_rate: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DailyProductSale {
    pub product_id: i64,
    pub product_name: String,
    pub category_name: String,
    pub quantity: i64,
    pub total: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DailyCategorySale {
    pub category_name: String,
    pub quantity: i64,
    pub total: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DailyPaymentBreakdown {
    pub method: String,
    pub count: i64,
    pub total: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DailySummary {
    pub date: String,
    pub total: f64,
    pub order_count: i64,
    pub item_count: i64,
    pub average_basket: f64,
    pub product_sales: Vec<DailyProductSale>,
    pub category_sales: Vec<DailyCategorySale>,
    pub payments: Vec<DailyPaymentBreakdown>,
    pub is_closed: bool,
    pub closed_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SalesPeriodSummary {
    pub period_type: String,
    pub label: String,
    pub start_date: String,
    pub end_date: String,
    pub total: f64,
    pub order_count: i64,
    pub item_count: i64,
    pub average_basket: f64,
    pub product_sales: Vec<DailyProductSale>,
    pub category_sales: Vec<DailyCategorySale>,
    pub payments: Vec<DailyPaymentBreakdown>,
}

