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
        ",
        )
        .map_err(|error| format!("Veritabani semasi olusturulamadi: {error}"))?;

    Ok(())
}

fn seed_data(_connection: &Connection) -> Result<(), String> {
    Ok(())
}
