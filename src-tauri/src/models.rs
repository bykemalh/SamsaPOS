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
}
