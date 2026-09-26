use rusqlite::{params, Connection, OptionalExtension};
use tauri::State;

use crate::{
    db::AppState,
    models::{
        Category, ClosedOrderSummary, DailyCategorySale, DailyPaymentBreakdown, DailyProductSale,
        DailySummary, DashboardPayload, DiningTable, OrderDetail, OrderItem, Product, ProductPayload,
        SalesPeriodSummary,
    },
};

#[tauri::command]
pub fn get_dashboard(state: State<'_, AppState>) -> Result<DashboardPayload, String> {
    let connection = lock_connection(&state)?;

    Ok(DashboardPayload {
        tables: list_tables(&connection)?,
        categories: list_categories(&connection)?,
        products: list_products(&connection)?,
    })
}

#[tauri::command]
pub fn get_order_by_table(table_id: i64, state: State<'_, AppState>) -> Result<OrderDetail, String> {
    let connection = lock_connection(&state)?;
    get_order_detail_for_table(&connection, table_id)
}

#[tauri::command]
pub fn get_closed_orders(state: State<'_, AppState>) -> Result<Vec<ClosedOrderSummary>, String> {
    let connection = lock_connection(&state)?;
    list_closed_orders(&connection)
}

#[tauri::command]
pub fn get_closed_orders_by_date(
    date: String,
    state: State<'_, AppState>,
) -> Result<Vec<ClosedOrderSummary>, String> {
    let connection = lock_connection(&state)?;
    list_closed_orders_by_date(&connection, date.trim())
}

#[tauri::command]
pub fn get_receipt(order_id: i64, state: State<'_, AppState>) -> Result<OrderDetail, String> {
    let connection = lock_connection(&state)?;
    get_order_detail_by_order_id(&connection, order_id)
}

#[tauri::command]
pub fn get_vat_rate(state: State<'_, AppState>) -> Result<f64, String> {
    let connection = lock_connection(&state)?;
    read_vat_rate(&connection)
}

#[tauri::command]
pub fn set_vat_rate(rate: f64, state: State<'_, AppState>) -> Result<f64, String> {
    if !rate.is_finite() || rate < 0.0 || rate > 100.0 {
        return Err("KDV orani 0 ile 100 arasinda olmalidir.".into());
    }
    let connection = lock_connection(&state)?;
    connection
        .execute(
            "INSERT INTO settings (key, value) VALUES ('vat_rate', ?1)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![rate.to_string()],
        )
        .map_err(|error| format!("KDV orani kaydedilemedi: {error}"))?;
    // Açık adisyonlar güncel oranı kullansın; kapanmış fişler snapshot ile korunur.
    connection
        .execute(
            "UPDATE orders SET vat_rate_snapshot = ?1 WHERE status = 'open'",
            params![rate],
        )
        .ok();
    Ok(rate)
}

#[tauri::command]
pub fn get_business_dates(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    let connection = lock_connection(&state)?;
    let mut stmt = connection
        .prepare(
            "
            SELECT business_date FROM orders
            WHERE business_date IS NOT NULL AND business_date != ''
            GROUP BY business_date
            UNION
            SELECT date FROM business_days
            ORDER BY 1 DESC
            LIMIT 90
            ",
        )
        .map_err(|error| format!("Is gunleri hazirlanamadi: {error}"))?;
    let rows = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|error| format!("Is gunleri okunamadi: {error}"))?;
    let mut dates: Vec<String> = rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Is gunleri islenemedi: {error}"))?;
    if dates.is_empty() {
        let today: String = connection
            .query_row("SELECT DATE('now','localtime')", [], |row| row.get(0))
            .unwrap_or_else(|_| "1970-01-01".to_string());
        dates.push(today);
    }
    Ok(dates)
}

#[tauri::command]
pub fn get_daily_summary(date: String, state: State<'_, AppState>) -> Result<DailySummary, String> {
    let connection = lock_connection(&state)?;
    build_daily_summary(&connection, date.trim())
}

#[tauri::command]
pub fn get_sales_period_summary(
    start_date: String,
    end_date: String,
    period_type: String,
    label: String,
    state: State<'_, AppState>,
) -> Result<SalesPeriodSummary, String> {
    let connection = lock_connection(&state)?;
    build_period_summary(
        &connection,
        start_date.trim(),
        end_date.trim(),
        period_type.trim(),
        label.trim(),
    )
}

#[tauri::command]
pub fn get_closed_orders_by_range(
    start_date: String,
    end_date: String,
    state: State<'_, AppState>,
) -> Result<Vec<ClosedOrderSummary>, String> {
    let connection = lock_connection(&state)?;
    list_closed_orders_by_range(&connection, start_date.trim(), end_date.trim())
}

#[tauri::command]
pub fn close_business_day(date: String, state: State<'_, AppState>) -> Result<DailySummary, String> {
    let connection = lock_connection(&state)?;
    let day = date.trim().to_string();
    if day.is_empty() {
        return Err("Gun tarihi bos olamaz.".into());
    }

    let open_count: i64 = connection
        .query_row(
            "SELECT COUNT(*) FROM orders WHERE business_date = ?1 AND status = 'open'",
            params![day],
            |row| row.get(0),
        )
        .map_err(|error| format!("Acik adisyonlar okunamadi: {error}"))?;
    if open_count > 0 {
        return Err(format!(
            "Bu gunde {open_count} acik adisyon var. Once tum adisyonlari kapatin veya temizleyin."
        ));
    }

    let summary = build_daily_summary(&connection, &day)?;
    connection
        .execute(
            "INSERT INTO business_days (date, status, closed_at, total, order_count, item_count)
             VALUES (?1, 'closed', CURRENT_TIMESTAMP, ?2, ?3, ?4)
             ON CONFLICT(date) DO UPDATE SET status='closed', closed_at=CURRENT_TIMESTAMP,
               total=excluded.total, order_count=excluded.order_count, item_count=excluded.item_count",
            params![day, summary.total, summary.order_count, summary.item_count],
        )
        .map_err(|error| format!("Gun kapatilamadi: {error}"))?;

    build_daily_summary(&connection, &day)
}

#[tauri::command]
pub fn show_touch_keyboard() -> Result<(), String> {
    // Fiziksel klavye takılıyken Windows dokununca sanal klavyeyi otomatik açmaz.
    // Dokunmatik POS ekranı için uygulamadan biz açıyoruz. Diğer OS'lerde no-op.
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new(
            r"C:\Program Files\Common Files\Microsoft Shared\ink\TabTip.exe",
        )
        .spawn()
        .map_err(|error| format!("Dokunmatik klavye açılamadı: {error}"))?;
    }
    Ok(())
}

#[tauri::command]
pub fn create_package_order(
    customer: Option<String>,
    state: State<'_, AppState>,
) -> Result<DiningTable, String> {
    let connection = lock_connection(&state)?;

    let name = match customer.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
        // İsim verildiyse: "Paket - Ahmet", çakışırsa "Paket - Ahmet 2"...
        Some(c) => unique_table_name(&connection, &format!("Paket - {c}"))?,
        // İsim yoksa o güne özel sıra: "Paket Sipariş 1", "Paket Sipariş 2"...
        None => {
            let today_count: i64 = connection
                .query_row(
                    "SELECT COUNT(*) FROM tables WHERE DATE(created_at) = DATE('now') AND name LIKE 'Paket%'",
                    [],
                    |row| row.get(0),
                )
                .unwrap_or(0);
            let mut n = today_count + 1;
            loop {
                let candidate = format!("Paket Sipariş {n}");
                if !table_name_exists(&connection, &candidate)? {
                    break candidate;
                }
                n += 1;
            }
        }
    };

    let position_index: i64 = connection
        .query_row(
            "SELECT COALESCE(MAX(position_index), 0) + 1 FROM tables",
            [],
            |row| row.get(0),
        )
        .map_err(|error| format!("Masa pozisyonu hesaplanamadi: {error}"))?;

    connection
        .execute(
            "INSERT INTO tables (name, position_index, status, is_deleted) VALUES (?1, ?2, 'available', 0)",
            params![name, position_index],
        )
        .map_err(|error| format!("Paket siparis olusturulamadi: {error}"))?;

    let id = connection.last_insert_rowid();
    get_table(&connection, id)
}

fn table_name_exists(connection: &Connection, name: &str) -> Result<bool, String> {
    let count: i64 = connection
        .query_row(
            "SELECT COUNT(*) FROM tables WHERE name = ?1",
            params![name],
            |row| row.get(0),
        )
        .map_err(|error| format!("Masa adi kontrol edilemedi: {error}"))?;
    Ok(count > 0)
}

fn unique_table_name(connection: &Connection, base: &str) -> Result<String, String> {
    if !table_name_exists(connection, base)? {
        return Ok(base.to_string());
    }
    let mut n = 2;
    loop {
        let candidate = format!("{base} {n}");
        if !table_name_exists(connection, &candidate)? {
            return Ok(candidate);
        }
        n += 1;
    }
}

#[tauri::command]
pub fn create_table(name: String, state: State<'_, AppState>) -> Result<DiningTable, String> {
    let trimmed = name.trim().to_string();
    if trimmed.is_empty() {
        return Err("Masa adi bos olamaz.".into());
    }
    let connection = lock_connection(&state)?;
    let position_index: i64 = connection
        .query_row(
            "SELECT COALESCE(MAX(position_index), 0) + 1 FROM tables",
            [],
            |row| row.get(0),
        )
        .map_err(|error| format!("Masa pozisyonu hesaplanamadi: {error}"))?;

    connection
        .execute(
            "INSERT INTO tables (name, position_index, status, is_deleted) VALUES (?1, ?2, 'available', 0)",
            params![trimmed, position_index],
        )
        .map_err(|error| format!("Masa eklenemedi: {error}"))?;

    let id = connection.last_insert_rowid();
    get_table(&connection, id)
}

#[tauri::command]
pub fn update_table(id: i64, name: String, state: State<'_, AppState>) -> Result<DiningTable, String> {
    let trimmed = name.trim().to_string();
    if trimmed.is_empty() {
        return Err("Masa adi bos olamaz.".into());
    }
    let connection = lock_connection(&state)?;
    let affected = connection
        .execute(
            "UPDATE tables SET name = ?1 WHERE id = ?2 AND COALESCE(is_deleted, 0) = 0",
            params![trimmed, id],
        )
        .map_err(|error| format!("Masa guncellenemedi: {error}"))?;
    if affected == 0 {
        return Err("Masa bulunamadi.".into());
    }

    get_table(&connection, id)
}

#[tauri::command]
pub fn delete_table(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let connection = lock_connection(&state)?;
    let active_order_count: i64 = connection
        .query_row(
            "SELECT COUNT(*) FROM orders WHERE table_id = ?1 AND status = 'open'",
            [id],
            |row| row.get(0),
        )
        .map_err(|error| format!("Masa siparis durumu okunamadi: {error}"))?;

    if active_order_count > 0 {
        return Err("Acik siparisi olan masa silinemez.".into());
    }

    // Gecmis kaybolmasin diye fiziksel silme yerine arsivle (soft delete).
    let affected = connection
        .execute(
            "UPDATE tables SET is_deleted = 1, status = 'available' WHERE id = ?1",
            [id],
        )
        .map_err(|error| format!("Masa silinemedi: {error}"))?;
    if affected == 0 {
        return Err("Masa bulunamadi.".into());
    }

    Ok(())
}

#[tauri::command]
pub fn create_category(name: String, state: State<'_, AppState>) -> Result<Category, String> {
    let connection = lock_connection(&state)?;
    let sort_order: i64 = connection
        .query_row(
            "SELECT COALESCE(MAX(sort_order), 0) + 1 FROM categories",
            [],
            |row| row.get(0),
        )
        .map_err(|error| format!("Kategori sirasi hesaplanamadi: {error}"))?;

    connection
        .execute(
            "INSERT INTO categories (name, sort_order, is_active) VALUES (?1, ?2, 1)",
            params![name.trim(), sort_order],
        )
        .map_err(|error| format!("Kategori eklenemedi: {error}"))?;

    let id = connection.last_insert_rowid();
    get_category(&connection, id)
}

#[tauri::command]
pub fn update_category(id: i64, name: String, state: State<'_, AppState>) -> Result<Category, String> {
    let connection = lock_connection(&state)?;
    connection
        .execute(
            "UPDATE categories SET name = ?1 WHERE id = ?2",
            params![name.trim(), id],
        )
        .map_err(|error| format!("Kategori guncellenemedi: {error}"))?;

    get_category(&connection, id)
}

#[tauri::command]
pub fn delete_category(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let connection = lock_connection(&state)?;
    let product_count: i64 = connection
        .query_row(
            "SELECT COUNT(*) FROM products WHERE category_id = ?1",
            [id],
            |row| row.get(0),
        )
        .map_err(|error| format!("Kategori urunleri okunamadi: {error}"))?;

    if product_count > 0 {
        return Err("Bu kategoriye bagli urunler oldugu icin silinemez.".into());
    }

    connection
        .execute("DELETE FROM categories WHERE id = ?1", [id])
        .map_err(|error| format!("Kategori silinemedi: {error}"))?;

    Ok(())
}

#[tauri::command]
pub fn create_product(payload: ProductPayload, state: State<'_, AppState>) -> Result<(), String> {
    let vat = normalize_vat_rate(payload.vat_rate);
    let connection = lock_connection(&state)?;
    connection
        .execute(
            "INSERT INTO products (category_id, name, image_data, price, vat_rate, is_active) VALUES (?1, ?2, ?3, ?4, ?5, 1)",
            params![
                payload.category_id,
                payload.name.trim(),
                payload.image_data,
                payload.price,
                vat
            ],
        )
        .map_err(|error| format!("Urun eklenemedi: {error}"))?;

    Ok(())
}

#[tauri::command]
pub fn update_product(payload: ProductPayload, state: State<'_, AppState>) -> Result<(), String> {
    let Some(id) = payload.id else {
        return Err("Guncellenecek urun kimligi eksik.".into());
    };

    let vat = normalize_vat_rate(payload.vat_rate);
    let connection = lock_connection(&state)?;
    connection
        .execute(
            "UPDATE products SET category_id = ?1, name = ?2, image_data = ?3, price = ?4, vat_rate = ?5 WHERE id = ?6",
            params![
                payload.category_id,
                payload.name.trim(),
                payload.image_data,
                payload.price,
                vat,
                id
            ],
        )
        .map_err(|error| format!("Urun guncellenemedi: {error}"))?;

    Ok(())
}

#[tauri::command]
pub fn delete_product(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let connection = lock_connection(&state)?;
    let open_usage: i64 = connection
        .query_row(
            "
            SELECT COUNT(*)
            FROM order_items oi
            INNER JOIN orders o ON o.id = oi.order_id
            WHERE oi.product_id = ?1 AND o.status = 'open'
            ",
            [id],
            |row| row.get(0),
        )
        .map_err(|error| format!("Urun siparis kullanimi okunamadi: {error}"))?;

    if open_usage > 0 {
        return Err("Acik sipariste bulunan urun silinemez.".into());
    }

    connection
        .execute("DELETE FROM products WHERE id = ?1", [id])
        .map_err(|error| format!("Urun silinemedi: {error}"))?;

    Ok(())
}

#[tauri::command]
pub fn add_item_to_table(
    table_id: i64,
    product_id: i64,
    state: State<'_, AppState>,
) -> Result<OrderDetail, String> {
    let mut connection = lock_connection(&state)?;
    let order_id = ensure_open_order(&mut connection, table_id)?;

    let existing_item: Option<(i64, i64)> = connection
        .query_row(
            "SELECT id, quantity FROM order_items WHERE order_id = ?1 AND product_id = ?2",
            params![order_id, product_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()
        .map_err(|error| format!("Siparis kalemi okunamadi: {error}"))?;

    if let Some((item_id, quantity)) = existing_item {
        let next_quantity = quantity + 1;
        connection
            .execute(
                "UPDATE order_items SET quantity = ?1, line_total = unit_price_snapshot * ?1 WHERE id = ?2",
                params![next_quantity, item_id],
            )
            .map_err(|error| format!("Siparis kalemi guncellenemedi: {error}"))?;
    } else {
        let (name, price, vat): (String, f64, f64) = connection
            .query_row(
                "SELECT name, price, COALESCE(vat_rate, 10) FROM products WHERE id = ?1",
                [product_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .map_err(|error| format!("Urun bulunamadi: {error}"))?;

        connection
            .execute(
                "
                INSERT INTO order_items (order_id, product_id, product_name_snapshot, unit_price_snapshot, quantity, line_total, vat_rate_snapshot)
                VALUES (?1, ?2, ?3, ?4, 1, ?4, ?5)
                ",
                params![order_id, product_id, name, price, vat],
            )
            .map_err(|error| format!("Siparis kalemi eklenemedi: {error}"))?;
    }

    get_order_detail_for_table(&connection, table_id)
}

#[tauri::command]
pub fn set_order_item_quantity(
    item_id: i64,
    quantity: i64,
    state: State<'_, AppState>,
) -> Result<OrderDetail, String> {
    let connection = lock_connection(&state)?;
    let (table_id, order_id): (i64, i64) = connection
        .query_row(
            "
            SELECT o.table_id, o.id
            FROM order_items oi
            INNER JOIN orders o ON o.id = oi.order_id
            WHERE oi.id = ?1
            ",
            [item_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|error| format!("Siparis kalemi bulunamadi: {error}"))?;

    if quantity <= 0 {
        connection
            .execute("DELETE FROM order_items WHERE id = ?1", [item_id])
            .map_err(|error| format!("Siparis kalemi silinemedi: {error}"))?;
    } else {
        connection
            .execute(
                "UPDATE order_items SET quantity = ?1, line_total = unit_price_snapshot * ?1 WHERE id = ?2",
                params![quantity, item_id],
            )
            .map_err(|error| format!("Siparis kalemi guncellenemedi: {error}"))?;
    }

    close_order_if_empty(&connection, order_id, table_id)?;
    get_order_detail_for_table(&connection, table_id)
}

#[tauri::command]
pub fn remove_order_item(item_id: i64, state: State<'_, AppState>) -> Result<OrderDetail, String> {
    let connection = lock_connection(&state)?;
    let (table_id, order_id): (i64, i64) = connection
        .query_row(
            "
            SELECT o.table_id, o.id
            FROM order_items oi
            INNER JOIN orders o ON o.id = oi.order_id
            WHERE oi.id = ?1
            ",
            [item_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|error| format!("Siparis kalemi bulunamadi: {error}"))?;

    connection
        .execute("DELETE FROM order_items WHERE id = ?1", [item_id])
        .map_err(|error| format!("Siparis kalemi silinemedi: {error}"))?;

    close_order_if_empty(&connection, order_id, table_id)?;
    get_order_detail_for_table(&connection, table_id)
}

#[tauri::command]
pub fn clear_table_order(table_id: i64, state: State<'_, AppState>) -> Result<OrderDetail, String> {
    let connection = lock_connection(&state)?;
    if let Some(order_id) = find_open_order_id(&connection, table_id)? {
        connection
            .execute("DELETE FROM order_items WHERE order_id = ?1", [order_id])
            .map_err(|error| format!("Siparis satirlari silinemedi: {error}"))?;

        connection
            .execute(
                "UPDATE orders SET status = 'cancelled', closed_at = CURRENT_TIMESTAMP WHERE id = ?1",
                [order_id],
            )
            .map_err(|error| format!("Siparis kapatilamadi: {error}"))?;
    }

    set_table_status(&connection, table_id, "available")?;
    get_order_detail_for_table(&connection, table_id)
}

#[tauri::command]
pub fn close_table_order(
    table_id: i64,
    payment_method: Option<String>,
    state: State<'_, AppState>,
) -> Result<OrderDetail, String> {
    let connection = lock_connection(&state)?;
    let Some(order_id) = find_open_order_id(&connection, table_id)? else {
        return Err("Kapatilacak acik adisyon bulunamadi.".into());
    };

    let item_count: i64 = connection
        .query_row(
            "SELECT COUNT(*) FROM order_items WHERE order_id = ?1",
            [order_id],
            |row| row.get(0),
        )
        .map_err(|error| format!("Siparis kalemleri okunamadi: {error}"))?;

    if item_count == 0 {
        return Err("Bos adisyon kapatilamaz.".into());
    }

    let method = normalize_payment(payment_method);
    let vat = read_vat_rate(&connection).unwrap_or(10.0);
    let table_name: String = connection
        .query_row("SELECT name FROM tables WHERE id = ?1", [table_id], |row| {
            row.get(0)
        })
        .unwrap_or_else(|_| format!("Masa {table_id}"));

    connection
        .execute(
            "UPDATE orders SET status = 'closed', closed_at = CURRENT_TIMESTAMP,
             business_date = COALESCE(business_date, DATE('now','localtime')),
             vat_rate_snapshot = ?1, payment_method = ?2, table_name_snapshot = ?3
             WHERE id = ?4",
            params![vat, method, table_name, order_id],
        )
        .map_err(|error| format!("Adisyon kapatilamadi: {error}"))?;

    set_table_status(&connection, table_id, "available")?;
    get_order_detail_by_order_id(&connection, order_id)
}

fn lock_connection<'a>(
    state: &'a State<'a, AppState>,
) -> Result<std::sync::MutexGuard<'a, Connection>, String> {
    state
        .connection
        .lock()
        .map_err(|_| "Veritabani baglantisi kilidi alinamadi.".into())
}

fn normalize_payment(input: Option<String>) -> String {
    match input.as_deref().unwrap_or("cash").trim().to_lowercase().as_str() {
        "card" | "kart" | "kredi" => "card".to_string(),
        "other" | "diger" | "diğer" | "havale" | "eft" => "other".to_string(),
        _ => "cash".to_string(),
    }
}

fn normalize_vat_rate(rate: f64) -> f64 {
    if !rate.is_finite() || rate < 0.0 || rate > 100.0 {
        return 10.0;
    }
    // Temiz oranlar tam sayı dursun (1, 10, 20)
    (rate * 100.0).round() / 100.0
}

fn read_vat_rate(connection: &Connection) -> Result<f64, String> {
    let raw: Option<String> = connection
        .query_row(
            "SELECT value FROM settings WHERE key = 'vat_rate'",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| format!("KDV orani okunamadi: {error}"))?;
    let parsed = raw
        .as_deref()
        .unwrap_or("10")
        .trim()
        .replace(',', ".")
        .parse::<f64>()
        .unwrap_or(10.0);
    if !parsed.is_finite() || parsed < 0.0 || parsed > 100.0 {
        return Ok(10.0);
    }
    Ok(parsed)
}

fn list_tables(connection: &Connection) -> Result<Vec<DiningTable>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT
                t.id,
                t.name,
                t.position_index,
                t.status,
                COALESCE((
                    SELECT SUM(oi.line_total)
                    FROM orders o
                    LEFT JOIN order_items oi ON oi.order_id = o.id
                    WHERE o.table_id = t.id AND o.status = 'open'
                ), 0),
                COALESCE((
                    SELECT SUM(oi.quantity)
                    FROM orders o
                    LEFT JOIN order_items oi ON oi.order_id = o.id
                    WHERE o.table_id = t.id AND o.status = 'open'
                ), 0)
            FROM tables t
            WHERE COALESCE(t.is_deleted, 0) = 0
            ORDER BY t.position_index ASC
            ",
        )
        .map_err(|error| format!("Masalar hazirlanamadi: {error}"))?;

    let rows = statement
        .query_map([], |row| {
            Ok(DiningTable {
                id: row.get(0)?,
                name: row.get(1)?,
                position_index: row.get(2)?,
                status: row.get(3)?,
                current_total: row.get(4)?,
                item_count: row.get(5)?,
            })
        })
        .map_err(|error| format!("Masalar okunamadi: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Masalar islenemedi: {error}"))
}

fn list_categories(connection: &Connection) -> Result<Vec<Category>, String> {
    let mut statement = connection
        .prepare(
            "SELECT id, name, sort_order, is_active FROM categories ORDER BY sort_order ASC, name ASC",
        )
        .map_err(|error| format!("Kategoriler hazirlanamadi: {error}"))?;

    let rows = statement
        .query_map([], |row| {
            Ok(Category {
                id: row.get(0)?,
                name: row.get(1)?,
                sort_order: row.get(2)?,
                is_active: row.get::<_, i64>(3)? == 1,
            })
        })
        .map_err(|error| format!("Kategoriler okunamadi: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Kategoriler islenemedi: {error}"))
}

fn list_products(connection: &Connection) -> Result<Vec<Product>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT id, category_id, name, image_data, price, COALESCE(vat_rate, 10), is_active
            FROM products
            ORDER BY category_id ASC, name ASC
            ",
        )
        .map_err(|error| format!("Urunler hazirlanamadi: {error}"))?;

    let rows = statement
        .query_map([], |row| {
            Ok(Product {
                id: row.get(0)?,
                category_id: row.get(1)?,
                name: row.get(2)?,
                image_data: row.get(3)?,
                price: row.get(4)?,
                vat_rate: row.get(5)?,
                is_active: row.get::<_, i64>(6)? == 1,
            })
        })
        .map_err(|error| format!("Urunler okunamadi: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Urunler islenemedi: {error}"))
}

fn get_table(connection: &Connection, id: i64) -> Result<DiningTable, String> {
    let (name, position_index, status): (String, i64, String) = connection
        .query_row(
            "SELECT name, position_index, status FROM tables WHERE id = ?1 AND COALESCE(is_deleted, 0) = 0",
            [id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .map_err(|_| "Masa bulunamadi.".to_string())?;

    let (current_total, item_count): (f64, i64) = connection
        .query_row(
            "
            SELECT COALESCE(SUM(oi.line_total), 0), COALESCE(SUM(oi.quantity), 0)
            FROM orders o
            LEFT JOIN order_items oi ON oi.order_id = o.id
            WHERE o.table_id = ?1 AND o.status = 'open'
            ",
            [id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .unwrap_or((0.0, 0));

    Ok(DiningTable {
        id,
        name,
        position_index,
        status,
        current_total,
        item_count,
    })
}

fn get_category(connection: &Connection, id: i64) -> Result<Category, String> {
    let categories = list_categories(connection)?;
    categories
        .into_iter()
        .find(|category| category.id == id)
        .ok_or_else(|| "Kategori bulunamadi.".into())
}

fn ensure_open_order(connection: &mut Connection, table_id: i64) -> Result<i64, String> {
    let is_deleted: i64 = connection
        .query_row(
            "SELECT COALESCE(is_deleted, 0) FROM tables WHERE id = ?1",
            [table_id],
            |row| row.get(0),
        )
        .map_err(|_| "Masa bulunamadi.".to_string())?;
    if is_deleted == 1 {
        return Err("Silinmis masaya siparis eklenemez.".into());
    }

    if let Some(order_id) = find_open_order_id(connection, table_id)? {
        return Ok(order_id);
    }

    let vat = read_vat_rate(connection).unwrap_or(10.0);
    let table_name: String = connection
        .query_row("SELECT name FROM tables WHERE id = ?1", [table_id], |row| {
            row.get(0)
        })
        .unwrap_or_else(|_| format!("Masa {table_id}"));

    connection
        .execute(
            "INSERT INTO orders (table_id, status, business_date, vat_rate_snapshot, table_name_snapshot)
             VALUES (?1, 'open', DATE('now','localtime'), ?2, ?3)",
            params![table_id, vat, table_name],
        )
        .map_err(|error| format!("Yeni adisyon acilamadi: {error}"))?;

    set_table_status(connection, table_id, "occupied")?;
    Ok(connection.last_insert_rowid())
}

fn find_open_order_id(connection: &Connection, table_id: i64) -> Result<Option<i64>, String> {
    connection
        .query_row(
            "SELECT id FROM orders WHERE table_id = ?1 AND status = 'open' ORDER BY id DESC LIMIT 1",
            [table_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| format!("Acik adisyon sorgulanamadi: {error}"))
}

fn set_table_status(connection: &Connection, table_id: i64, status: &str) -> Result<(), String> {
    connection
        .execute(
            "UPDATE tables SET status = ?1 WHERE id = ?2",
            params![status, table_id],
        )
        .map_err(|error| format!("Masa durumu guncellenemedi: {error}"))?;

    Ok(())
}

fn close_order_if_empty(connection: &Connection, order_id: i64, table_id: i64) -> Result<(), String> {
    let count: i64 = connection
        .query_row(
            "SELECT COUNT(*) FROM order_items WHERE order_id = ?1",
            [order_id],
            |row| row.get(0),
        )
        .map_err(|error| format!("Siparis satir sayisi okunamadi: {error}"))?;

    if count == 0 {
        connection
            .execute(
                "UPDATE orders SET status = 'cancelled', closed_at = CURRENT_TIMESTAMP WHERE id = ?1",
                [order_id],
            )
            .map_err(|error| format!("Bos siparis kapatilamadi: {error}"))?;
        set_table_status(connection, table_id, "available")?;
    }

    Ok(())
}

fn get_order_detail_for_table(connection: &Connection, table_id: i64) -> Result<OrderDetail, String> {
    let table_name: String = connection
        .query_row("SELECT name FROM tables WHERE id = ?1", [table_id], |row| row.get(0))
        .map_err(|_| "Masa okunamadi.".to_string())?;

    let order_meta: Option<(i64, String, String, Option<String>, Option<String>, Option<f64>, Option<String>)> =
        connection
            .query_row(
                "SELECT id, status, opened_at, closed_at, business_date, vat_rate_snapshot, payment_method
                 FROM orders WHERE table_id = ?1 AND status = 'open' ORDER BY id DESC LIMIT 1",
                [table_id],
                |row| {
                    Ok((
                        row.get(0)?,
                        row.get(1)?,
                        row.get(2)?,
                        row.get(3)?,
                        row.get(4)?,
                        row.get(5)?,
                        row.get(6)?,
                    ))
                },
            )
            .optional()
            .map_err(|error| format!("Aktif adisyon okunamadi: {error}"))?;

    let Some((order_id, status, opened_at, closed_at, business_date, vat_rate_snapshot, payment_method)) =
        order_meta
    else {
        return Ok(OrderDetail {
            order_id: None,
            table_id,
            table_name,
            status: "open".into(),
            opened_at: None,
            closed_at: None,
            business_date: None,
            vat_rate_snapshot: None,
            payment_method: None,
            items: Vec::new(),
            total: 0.0,
        });
    };

    let items = list_order_items(connection, order_id)?;
    let total = items.iter().map(|item| item.line_total).sum();

    Ok(OrderDetail {
        order_id: Some(order_id),
        table_id,
        table_name,
        status,
        opened_at: Some(opened_at),
        closed_at,
        business_date,
        vat_rate_snapshot,
        payment_method,
        items,
        total,
    })
}

fn get_order_detail_by_order_id(connection: &Connection, order_id: i64) -> Result<OrderDetail, String> {
    let (table_id, table_name, status, opened_at, closed_at, business_date, vat_rate_snapshot, payment_method, snapshot_name): (
        i64,
        Option<String>,
        String,
        String,
        Option<String>,
        Option<String>,
        Option<f64>,
        Option<String>,
        Option<String>,
    ) = connection
        .query_row(
            "
            SELECT o.table_id, t.name, o.status, o.opened_at, o.closed_at,
                   o.business_date, o.vat_rate_snapshot, o.payment_method, o.table_name_snapshot
            FROM orders o
            LEFT JOIN tables t ON t.id = o.table_id
            WHERE o.id = ?1
            ",
            [order_id],
            |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                    row.get(6)?,
                    row.get(7)?,
                    row.get(8)?,
                ))
            },
        )
        .map_err(|_| "Adisyon bulunamadi.".to_string())?;

    let resolved_name = table_name
        .or(snapshot_name)
        .unwrap_or_else(|| format!("Masa {table_id}"));

    let items = list_order_items(connection, order_id)?;
    let total = items.iter().map(|item| item.line_total).sum();

    Ok(OrderDetail {
        order_id: Some(order_id),
        table_id,
        table_name: resolved_name,
        status,
        opened_at: Some(opened_at),
        closed_at,
        business_date,
        vat_rate_snapshot,
        payment_method,
        items,
        total,
    })
}

fn list_order_items(connection: &Connection, order_id: i64) -> Result<Vec<OrderItem>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT id, product_id, product_name_snapshot, unit_price_snapshot, quantity, line_total,
                   vat_rate_snapshot
            FROM order_items
            WHERE order_id = ?1
            ORDER BY id ASC
            ",
        )
        .map_err(|error| format!("Siparis kalemleri hazirlanamadi: {error}"))?;

    let rows = statement
        .query_map([order_id], |row| {
            Ok(OrderItem {
                id: row.get(0)?,
                product_id: row.get(1)?,
                product_name: row.get(2)?,
                unit_price: row.get(3)?,
                quantity: row.get(4)?,
                line_total: row.get(5)?,
                vat_rate: row.get(6)?,
            })
        })
        .map_err(|error| format!("Siparis kalemleri okunamadi: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Siparis kalemleri islenemedi: {error}"))
}

fn closed_order_row(row: &rusqlite::Row) -> rusqlite::Result<ClosedOrderSummary> {
    let table_name: Option<String> = row.get(2)?;
    let snapshot: Option<String> = row.get(7)?;
    Ok(ClosedOrderSummary {
        order_id: row.get(0)?,
        table_id: row.get(1)?,
        table_name: table_name
            .or(snapshot)
            .unwrap_or_else(|| "Silinmis Masa".to_string()),
        closed_at: row.get(3)?,
        business_date: row.get(4)?,
        payment_method: row.get(5)?,
        item_count: row.get(6)?,
        total: row.get(8)?,
    })
}

fn list_closed_orders(connection: &Connection) -> Result<Vec<ClosedOrderSummary>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT
                o.id,
                o.table_id,
                t.name,
                COALESCE(o.closed_at, o.opened_at),
                o.business_date,
                o.payment_method,
                COALESCE(SUM(oi.quantity), 0),
                o.table_name_snapshot,
                COALESCE(SUM(oi.line_total), 0)
            FROM orders o
            LEFT JOIN tables t ON t.id = o.table_id
            LEFT JOIN order_items oi ON oi.order_id = o.id
            WHERE o.status = 'closed'
            GROUP BY o.id, o.table_id, t.name, o.closed_at, o.opened_at,
                     o.business_date, o.payment_method, o.table_name_snapshot
            ORDER BY o.closed_at DESC, o.id DESC
            LIMIT 50
            ",
        )
        .map_err(|error| format!("Kapanan adisyonlar hazirlanamadi: {error}"))?;

    let rows = statement
        .query_map([], closed_order_row)
        .map_err(|error| format!("Kapanan adisyonlar okunamadi: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Kapanan adisyonlar islenemedi: {error}"))
}

fn list_closed_orders_by_date(
    connection: &Connection,
    date: &str,
) -> Result<Vec<ClosedOrderSummary>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT
                o.id,
                o.table_id,
                t.name,
                COALESCE(o.closed_at, o.opened_at),
                o.business_date,
                o.payment_method,
                COALESCE(SUM(oi.quantity), 0),
                o.table_name_snapshot,
                COALESCE(SUM(oi.line_total), 0)
            FROM orders o
            LEFT JOIN tables t ON t.id = o.table_id
            LEFT JOIN order_items oi ON oi.order_id = o.id
            WHERE o.status = 'closed'
              AND (o.business_date = ?1 OR (o.business_date IS NULL AND DATE(COALESCE(o.closed_at, o.opened_at)) = ?1))
            GROUP BY o.id, o.table_id, t.name, o.closed_at, o.opened_at,
                     o.business_date, o.payment_method, o.table_name_snapshot
            ORDER BY o.closed_at DESC, o.id DESC
            LIMIT 200
            ",
        )
        .map_err(|error| format!("Gunluk adisyonlar hazirlanamadi: {error}"))?;

    let rows = statement
        .query_map(params![date], closed_order_row)
        .map_err(|error| format!("Gunluk adisyonlar okunamadi: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Gunluk adisyonlar islenemedi: {error}"))
}

fn list_closed_orders_by_range(
    connection: &Connection,
    start_date: &str,
    end_date: &str,
) -> Result<Vec<ClosedOrderSummary>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT
                o.id,
                o.table_id,
                t.name,
                COALESCE(o.closed_at, o.opened_at),
                o.business_date,
                o.payment_method,
                COALESCE(SUM(oi.quantity), 0),
                o.table_name_snapshot,
                COALESCE(SUM(oi.line_total), 0)
            FROM orders o
            LEFT JOIN tables t ON t.id = o.table_id
            LEFT JOIN order_items oi ON oi.order_id = o.id
            WHERE o.status = 'closed'
              AND (
                (o.business_date BETWEEN ?1 AND ?2)
                OR (o.business_date IS NULL AND DATE(COALESCE(o.closed_at, o.opened_at)) BETWEEN ?1 AND ?2)
              )
            GROUP BY o.id, o.table_id, t.name, o.closed_at, o.opened_at,
                     o.business_date, o.payment_method, o.table_name_snapshot
            ORDER BY o.closed_at DESC, o.id DESC
            LIMIT 500
            ",
        )
        .map_err(|error| format!("Donem adisyonlari hazirlanamadi: {error}"))?;

    let rows = statement
        .query_map(params![start_date, end_date], closed_order_row)
        .map_err(|error| format!("Donem adisyonlari okunamadi: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Donem adisyonlari islenemedi: {error}"))
}


fn build_daily_summary(connection: &Connection, date: &str) -> Result<DailySummary, String> {
    let (total, order_count, item_count): (f64, i64, i64) = connection
        .query_row(
            "
            SELECT COALESCE(SUM(sub.total), 0), COUNT(sub.id),
                   COALESCE(SUM(sub.items), 0)
            FROM (
                SELECT o.id AS id, COALESCE(SUM(oi.line_total), 0) AS total,
                       COALESCE(SUM(oi.quantity), 0) AS items
                FROM orders o
                LEFT JOIN order_items oi ON oi.order_id = o.id
                WHERE o.status = 'closed'
                  AND (o.business_date = ?1 OR (o.business_date IS NULL AND DATE(COALESCE(o.closed_at, o.opened_at)) = ?1))
                GROUP BY o.id
            ) sub
            ",
            params![date],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .map_err(|error| format!("Gunluk ozet okunamadi: {error}"))?;

    let average_basket = if order_count > 0 {
        total / order_count as f64
    } else {
        0.0
    };

    // Urun bazinda satis
    let mut stmt = connection
        .prepare(
            "
            SELECT oi.product_id, oi.product_name_snapshot,
                   COALESCE(c.name, 'Kategorisiz'),
                   SUM(oi.quantity), SUM(oi.line_total)
            FROM order_items oi
            INNER JOIN orders o ON o.id = oi.order_id
            LEFT JOIN products p ON p.id = oi.product_id
            LEFT JOIN categories c ON c.id = p.category_id
            WHERE o.status = 'closed'
              AND (o.business_date = ?1 OR (o.business_date IS NULL AND DATE(COALESCE(o.closed_at, o.opened_at)) = ?1))
            GROUP BY oi.product_id, oi.product_name_snapshot, c.name
            ORDER BY SUM(oi.line_total) DESC
            ",
        )
        .map_err(|error| format!("Urun satis raporu hazirlanamadi: {error}"))?;
    let product_rows = stmt
        .query_map(params![date], |row| {
            Ok(DailyProductSale {
                product_id: row.get(0)?,
                product_name: row.get(1)?,
                category_name: row.get(2)?,
                quantity: row.get(3)?,
                total: row.get(4)?,
            })
        })
        .map_err(|error| format!("Urun satis raporu okunamadi: {error}"))?;
    let product_sales: Vec<DailyProductSale> = product_rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Urun satis raporu islenemedi: {error}"))?;

    // Kategori bazinda satis
    let mut stmt = connection
        .prepare(
            "
            SELECT COALESCE(c.name, 'Kategorisiz'),
                   SUM(oi.quantity), SUM(oi.line_total)
            FROM order_items oi
            INNER JOIN orders o ON o.id = oi.order_id
            LEFT JOIN products p ON p.id = oi.product_id
            LEFT JOIN categories c ON c.id = p.category_id
            WHERE o.status = 'closed'
              AND (o.business_date = ?1 OR (o.business_date IS NULL AND DATE(COALESCE(o.closed_at, o.opened_at)) = ?1))
            GROUP BY c.name
            ORDER BY SUM(oi.line_total) DESC
            ",
        )
        .map_err(|error| format!("Kategori raporu hazirlanamadi: {error}"))?;
    let category_rows = stmt
        .query_map(params![date], |row| {
            Ok(DailyCategorySale {
                category_name: row.get(0)?,
                quantity: row.get(1)?,
                total: row.get(2)?,
            })
        })
        .map_err(|error| format!("Kategori raporu okunamadi: {error}"))?;
    let category_sales: Vec<DailyCategorySale> = category_rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Kategori raporu islenemedi: {error}"))?;

    // Odeme yontemi kirilimi
    let mut stmt = connection
        .prepare(
            "
            SELECT COALESCE(NULLIF(TRIM(o.payment_method), ''), 'cash'),
                   COUNT(*), COALESCE(SUM(sub.total), 0)
            FROM orders o
            LEFT JOIN (
                SELECT order_id, SUM(line_total) AS total
                FROM order_items GROUP BY order_id
            ) sub ON sub.order_id = o.id
            WHERE o.status = 'closed'
              AND (o.business_date = ?1 OR (o.business_date IS NULL AND DATE(COALESCE(o.closed_at, o.opened_at)) = ?1))
            GROUP BY 1
            ",
        )
        .map_err(|error| format!("Odeme raporu hazirlanamadi: {error}"))?;
    let payment_rows = stmt
        .query_map(params![date], |row| {
            Ok(DailyPaymentBreakdown {
                method: row.get(0)?,
                count: row.get(1)?,
                total: row.get(2)?,
            })
        })
        .map_err(|error| format!("Odeme raporu okunamadi: {error}"))?;
    let payments: Vec<DailyPaymentBreakdown> = payment_rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Odeme raporu islenemedi: {error}"))?;

    let day_meta: Option<(String, Option<String>)> = connection
        .query_row(
            "SELECT status, closed_at FROM business_days WHERE date = ?1",
            params![date],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()
        .map_err(|error| format!("Gun durumu okunamadi: {error}"))?;
    let (is_closed, closed_at) = match day_meta {
        Some((status, at)) => (status == "closed", at),
        None => (false, None),
    };

    Ok(DailySummary {
        date: date.to_string(),
        total,
        order_count,
        item_count,
        average_basket,
        product_sales,
        category_sales,
        payments,
        is_closed,
        closed_at,
    })
}

fn build_period_summary(
    connection: &Connection,
    start_date: &str,
    end_date: &str,
    period_type: &str,
    label: &str,
) -> Result<SalesPeriodSummary, String> {
    let (total, order_count, item_count): (f64, i64, i64) = connection
        .query_row(
            "
            SELECT COALESCE(SUM(sub.total), 0), COUNT(sub.id),
                   COALESCE(SUM(sub.items), 0)
            FROM (
                SELECT o.id AS id, COALESCE(SUM(oi.line_total), 0) AS total,
                       COALESCE(SUM(oi.quantity), 0) AS items
                FROM orders o
                LEFT JOIN order_items oi ON oi.order_id = o.id
                WHERE o.status = 'closed'
                  AND (
                    (o.business_date BETWEEN ?1 AND ?2)
                    OR (o.business_date IS NULL AND DATE(COALESCE(o.closed_at, o.opened_at)) BETWEEN ?1 AND ?2)
                  )
                GROUP BY o.id
            ) sub
            ",
            params![start_date, end_date],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .map_err(|error| format!("Donem satisi okunamadi: {error}"))?;

    let average_basket = if order_count > 0 {
        total / order_count as f64
    } else {
        0.0
    };

    // Urun bazinda satis
    let mut stmt = connection
        .prepare(
            "
            SELECT oi.product_id, oi.product_name_snapshot,
                   COALESCE(c.name, 'Kategorisiz'),
                   SUM(oi.quantity), SUM(oi.line_total)
            FROM order_items oi
            INNER JOIN orders o ON o.id = oi.order_id
            LEFT JOIN products p ON p.id = oi.product_id
            LEFT JOIN categories c ON c.id = p.category_id
            WHERE o.status = 'closed'
              AND (
                (o.business_date BETWEEN ?1 AND ?2)
                OR (o.business_date IS NULL AND DATE(COALESCE(o.closed_at, o.opened_at)) BETWEEN ?1 AND ?2)
              )
            GROUP BY oi.product_id, oi.product_name_snapshot, c.name
            ORDER BY SUM(oi.line_total) DESC
            ",
        )
        .map_err(|error| format!("Donem urun satis raporu hazirlanamadi: {error}"))?;
    let product_rows = stmt
        .query_map(params![start_date, end_date], |row| {
            Ok(DailyProductSale {
                product_id: row.get(0)?,
                product_name: row.get(1)?,
                category_name: row.get(2)?,
                quantity: row.get(3)?,
                total: row.get(4)?,
            })
        })
        .map_err(|error| format!("Donem urun satis raporu okunamadi: {error}"))?;
    let product_sales: Vec<DailyProductSale> = product_rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Donem urun satis raporu islenemedi: {error}"))?;

    // Kategori bazinda satis
    let mut stmt = connection
        .prepare(
            "
            SELECT COALESCE(c.name, 'Kategorisiz'),
                   SUM(oi.quantity), SUM(oi.line_total)
            FROM order_items oi
            INNER JOIN orders o ON o.id = oi.order_id
            LEFT JOIN products p ON p.id = oi.product_id
            LEFT JOIN categories c ON c.id = p.category_id
            WHERE o.status = 'closed'
              AND (
                (o.business_date BETWEEN ?1 AND ?2)
                OR (o.business_date IS NULL AND DATE(COALESCE(o.closed_at, o.opened_at)) BETWEEN ?1 AND ?2)
              )
            GROUP BY c.name
            ORDER BY SUM(oi.line_total) DESC
            ",
        )
        .map_err(|error| format!("Donem kategori raporu hazirlanamadi: {error}"))?;
    let category_rows = stmt
        .query_map(params![start_date, end_date], |row| {
            Ok(DailyCategorySale {
                category_name: row.get(0)?,
                quantity: row.get(1)?,
                total: row.get(2)?,
            })
        })
        .map_err(|error| format!("Donem kategori raporu okunamadi: {error}"))?;
    let category_sales: Vec<DailyCategorySale> = category_rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Donem kategori raporu islenemedi: {error}"))?;

    // Odeme yontemi kirilimi
    let mut stmt = connection
        .prepare(
            "
            SELECT COALESCE(NULLIF(TRIM(o.payment_method), ''), 'cash'),
                   COUNT(*), COALESCE(SUM(sub.total), 0)
            FROM orders o
            LEFT JOIN (
                SELECT order_id, SUM(line_total) AS total
                FROM order_items GROUP BY order_id
            ) sub ON sub.order_id = o.id
            WHERE o.status = 'closed'
              AND (
                (o.business_date BETWEEN ?1 AND ?2)
                OR (o.business_date IS NULL AND DATE(COALESCE(o.closed_at, o.opened_at)) BETWEEN ?1 AND ?2)
              )
            GROUP BY 1
            ",
        )
        .map_err(|error| format!("Donem odeme raporu hazirlanamadi: {error}"))?;
    let payment_rows = stmt
        .query_map(params![start_date, end_date], |row| {
            Ok(DailyPaymentBreakdown {
                method: row.get(0)?,
                count: row.get(1)?,
                total: row.get(2)?,
            })
        })
        .map_err(|error| format!("Donem odeme raporu okunamadi: {error}"))?;
    let payments: Vec<DailyPaymentBreakdown> = payment_rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Donem odeme raporu islenemedi: {error}"))?;

    Ok(SalesPeriodSummary {
        period_type: period_type.to_string(),
        label: label.to_string(),
        start_date: start_date.to_string(),
        end_date: end_date.to_string(),
        total,
        order_count,
        item_count,
        average_basket,
        product_sales,
        category_sales,
        payments,
    })
}

