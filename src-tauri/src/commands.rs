use rusqlite::{params, Connection, OptionalExtension};
use tauri::State;

use crate::{
    db::AppState,
    models::{
        Category, ClosedOrderSummary, DashboardPayload, DiningTable, OrderDetail, OrderItem, Product,
        ProductPayload,
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
pub fn get_receipt(order_id: i64, state: State<'_, AppState>) -> Result<OrderDetail, String> {
    let connection = lock_connection(&state)?;
    get_order_detail_by_order_id(&connection, order_id)
}

#[tauri::command]
pub fn create_table(name: String, state: State<'_, AppState>) -> Result<DiningTable, String> {
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
            "INSERT INTO tables (name, position_index, status) VALUES (?1, ?2, 'available')",
            params![name.trim(), position_index],
        )
        .map_err(|error| format!("Masa eklenemedi: {error}"))?;

    let id = connection.last_insert_rowid();
    get_table(&connection, id)
}

#[tauri::command]
pub fn update_table(id: i64, name: String, state: State<'_, AppState>) -> Result<DiningTable, String> {
    let connection = lock_connection(&state)?;
    connection
        .execute(
            "UPDATE tables SET name = ?1 WHERE id = ?2",
            params![name.trim(), id],
        )
        .map_err(|error| format!("Masa guncellenemedi: {error}"))?;

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

    connection
        .execute("DELETE FROM tables WHERE id = ?1", [id])
        .map_err(|error| format!("Masa silinemedi: {error}"))?;

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
    let connection = lock_connection(&state)?;
    connection
        .execute(
            "INSERT INTO products (category_id, name, image_data, price, is_active) VALUES (?1, ?2, ?3, ?4, 1)",
            params![
                payload.category_id,
                payload.name.trim(),
                payload.image_data,
                payload.price
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

    let connection = lock_connection(&state)?;
    connection
        .execute(
            "UPDATE products SET category_id = ?1, name = ?2, image_data = ?3, price = ?4 WHERE id = ?5",
            params![
                payload.category_id,
                payload.name.trim(),
                payload.image_data,
                payload.price,
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
        let (name, price): (String, f64) = connection
            .query_row(
                "SELECT name, price FROM products WHERE id = ?1",
                [product_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .map_err(|error| format!("Urun bulunamadi: {error}"))?;

        connection
            .execute(
                "
                INSERT INTO order_items (order_id, product_id, product_name_snapshot, unit_price_snapshot, quantity, line_total)
                VALUES (?1, ?2, ?3, ?4, 1, ?4)
                ",
                params![order_id, product_id, name, price],
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
pub fn close_table_order(table_id: i64, state: State<'_, AppState>) -> Result<OrderDetail, String> {
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

    connection
        .execute(
            "UPDATE orders SET status = 'closed', closed_at = CURRENT_TIMESTAMP WHERE id = ?1",
            [order_id],
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
            SELECT id, category_id, name, image_data, price, is_active
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
                is_active: row.get::<_, i64>(5)? == 1,
            })
        })
        .map_err(|error| format!("Urunler okunamadi: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Urunler islenemedi: {error}"))
}

fn get_table(connection: &Connection, id: i64) -> Result<DiningTable, String> {
    let tables = list_tables(connection)?;
    tables
        .into_iter()
        .find(|table| table.id == id)
        .ok_or_else(|| "Masa bulunamadi.".into())
}

fn get_category(connection: &Connection, id: i64) -> Result<Category, String> {
    let categories = list_categories(connection)?;
    categories
        .into_iter()
        .find(|category| category.id == id)
        .ok_or_else(|| "Kategori bulunamadi.".into())
}

fn ensure_open_order(connection: &mut Connection, table_id: i64) -> Result<i64, String> {
    if let Some(order_id) = find_open_order_id(connection, table_id)? {
        return Ok(order_id);
    }

    connection
        .execute(
            "INSERT INTO orders (table_id, status) VALUES (?1, 'open')",
            [table_id],
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
        .map_err(|error| format!("Masa okunamadi: {error}"))?;

    let order_meta: Option<(i64, String, String, Option<String>)> = connection
        .query_row(
            "SELECT id, status, opened_at, closed_at FROM orders WHERE table_id = ?1 AND status = 'open' ORDER BY id DESC LIMIT 1",
            [table_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .optional()
        .map_err(|error| format!("Aktif adisyon okunamadi: {error}"))?;

    let Some((order_id, status, opened_at, closed_at)) = order_meta else {
        return Ok(OrderDetail {
            order_id: None,
            table_id,
            table_name,
            status: "open".into(),
            opened_at: None,
            closed_at: None,
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
        items,
        total,
    })
}

fn get_order_detail_by_order_id(connection: &Connection, order_id: i64) -> Result<OrderDetail, String> {
    let (table_id, table_name, status, opened_at, closed_at): (i64, String, String, String, Option<String>) =
        connection
            .query_row(
                "
                SELECT o.table_id, t.name, o.status, o.opened_at, o.closed_at
                FROM orders o
                INNER JOIN tables t ON t.id = o.table_id
                WHERE o.id = ?1
                ",
                [order_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?)),
            )
            .map_err(|error| format!("Adisyon bulunamadi: {error}"))?;

    let items = list_order_items(connection, order_id)?;
    let total = items.iter().map(|item| item.line_total).sum();

    Ok(OrderDetail {
        order_id: Some(order_id),
        table_id,
        table_name,
        status,
        opened_at: Some(opened_at),
        closed_at,
        items,
        total,
    })
}

fn list_order_items(connection: &Connection, order_id: i64) -> Result<Vec<OrderItem>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT id, product_id, product_name_snapshot, unit_price_snapshot, quantity, line_total
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
            })
        })
        .map_err(|error| format!("Siparis kalemleri okunamadi: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Siparis kalemleri islenemedi: {error}"))
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
                COALESCE(SUM(oi.quantity), 0),
                COALESCE(SUM(oi.line_total), 0)
            FROM orders o
            INNER JOIN tables t ON t.id = o.table_id
            LEFT JOIN order_items oi ON oi.order_id = o.id
            WHERE o.status = 'closed'
            GROUP BY o.id, o.table_id, t.name, o.closed_at, o.opened_at
            ORDER BY o.closed_at DESC, o.id DESC
            LIMIT 50
            ",
        )
        .map_err(|error| format!("Kapanan adisyonlar hazirlanamadi: {error}"))?;

    let rows = statement
        .query_map([], |row| {
            Ok(ClosedOrderSummary {
                order_id: row.get(0)?,
                table_id: row.get(1)?,
                table_name: row.get(2)?,
                closed_at: row.get(3)?,
                item_count: row.get(4)?,
                total: row.get(5)?,
            })
        })
        .map_err(|error| format!("Kapanan adisyonlar okunamadi: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Kapanan adisyonlar islenemedi: {error}"))
}
