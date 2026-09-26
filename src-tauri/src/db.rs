use std::{fs, path::PathBuf, sync::Mutex};

use rusqlite::Connection;
use tauri::{AppHandle, Manager};

pub struct AppState {
    pub connection: Mutex<Connection>,
}

pub fn init_database(app: &AppHandle) -> Result<AppState, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Uygulama veri dizini okunamadi: {error}"))?;

    fs::create_dir_all(&app_dir)
        .map_err(|error| format!("Veri dizini olusturulamadi: {error}"))?;

    let db_path = database_path(&app_dir);
    let connection =
        Connection::open(db_path).map_err(|error| format!("SQLite baglantisi acilamadi: {error}"))?;

    connection
        .pragma_update(None, "foreign_keys", "ON")
        .map_err(|error| format!("SQLite foreign key ayari yapilamadi: {error}"))?;

    run_migrations(&connection)?;
    seed_data(&connection)?;

    Ok(AppState {
        connection: Mutex::new(connection),
    })
}

fn database_path(app_dir: &PathBuf) -> PathBuf {
    app_dir.join("samsa-pos.sqlite")
}

fn column_exists(connection: &Connection, table: &str, column: &str) -> bool {
    let mut stmt = match connection.prepare(&format!("PRAGMA table_info({table})")) {
        Ok(s) => s,
        Err(_) => return false,
    };
    let rows = match stmt.query_map([], |row| row.get::<_, String>(1)) {
        Ok(r) => r,
        Err(_) => return false,
    };
    let names: Vec<String> = rows.flatten().collect();
    names.iter().any(|name| name == column)
}

fn ensure_column(connection: &Connection, table: &str, column: &str, ddl: &str) -> Result<(), String> {
    if column_exists(connection, table, column) {
        return Ok(());
    }
    connection
        .execute(&format!("ALTER TABLE {table} ADD COLUMN {column} {ddl}"), [])
        .map_err(|error| format!("Veritabani guncellenemedi ({table}.{column}): {error}"))?;
    Ok(())
}

fn run_migrations(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch(
            "
            CREATE TABLE IF NOT EXISTS tables (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                position_index INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'available',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                sort_order INTEGER NOT NULL DEFAULT 0,
                is_active INTEGER NOT NULL DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                image_data TEXT,
                price REAL NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE RESTRICT
            );

            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                table_id INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'open',
                opened_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                closed_at TEXT,
                note TEXT,
                FOREIGN KEY(table_id) REFERENCES tables(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                product_name_snapshot TEXT NOT NULL,
                unit_price_snapshot REAL NOT NULL,
                quantity INTEGER NOT NULL,
                line_total REAL NOT NULL,
                FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
                FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE RESTRICT
            );

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS business_days (
                date TEXT PRIMARY KEY,
                status TEXT NOT NULL DEFAULT 'open',
                closed_at TEXT,
                total REAL NOT NULL DEFAULT 0,
                order_count INTEGER NOT NULL DEFAULT 0,
                item_count INTEGER NOT NULL DEFAULT 0
            );
        ",
        )
        .map_err(|error| format!("Veritabani semasi olusturulamadi: {error}"))?;

    // Kademeli kolon eklemeleri (mevcut veritabanlari icin güvenli)
    ensure_column(connection, "tables", "is_deleted", "INTEGER NOT NULL DEFAULT 0")?;
    ensure_column(connection, "orders", "business_date", "TEXT")?;
    ensure_column(
        connection,
        "orders",
        "vat_rate_snapshot",
        "REAL NOT NULL DEFAULT 10",
    )?;
    ensure_column(connection, "orders", "payment_method", "TEXT")?;
    ensure_column(connection, "orders", "table_name_snapshot", "TEXT")?;
    ensure_column(connection, "products", "vat_rate", "REAL NOT NULL DEFAULT 10")?;
    ensure_column(
        connection,
        "order_items",
        "vat_rate_snapshot",
        "REAL NOT NULL DEFAULT 10",
    )?;

    // Mevcut siparişlerde business_date boşsa opened/closed tarihten türet
    connection
        .execute(
            "
            UPDATE orders
            SET business_date = DATE(COALESCE(closed_at, opened_at))
            WHERE business_date IS NULL
            ",
            [],
        )
        .ok();
    connection
        .execute(
            "
            UPDATE orders
            SET table_name_snapshot = (SELECT name FROM tables WHERE tables.id = orders.table_id)
            WHERE table_name_snapshot IS NULL
            ",
            [],
        )
        .ok();

    connection
        .execute(
            "CREATE INDEX IF NOT EXISTS idx_orders_business_date ON orders(business_date)",
            [],
        )
        .ok();
    connection
        .execute(
            "CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)",
            [],
        )
        .ok();

    Ok(())
}

fn seed_data(connection: &Connection) -> Result<(), String> {
    connection
        .execute(
            "INSERT OR IGNORE INTO settings (key, value) VALUES ('vat_rate', '10')",
            [],
        )
        .map_err(|error| format!("Varsayilan ayarlar yazilamadi: {error}"))?;
    Ok(())
}
