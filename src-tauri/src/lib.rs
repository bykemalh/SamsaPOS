use tauri::Manager;

mod commands;
mod db;
mod models;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let state =
                db::init_database(app.handle()).map_err(std::io::Error::other)?;
            app.manage(state);
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_dashboard,
            commands::get_order_by_table,
            commands::get_closed_orders,
            commands::get_closed_orders_by_date,
            commands::get_receipt,
            commands::create_table,
            commands::create_package_order,
            commands::update_table,
            commands::delete_table,
            commands::create_category,
            commands::update_category,
            commands::delete_category,
            commands::create_product,
            commands::update_product,
            commands::delete_product,
            commands::add_item_to_table,
            commands::set_order_item_quantity,
            commands::remove_order_item,
            commands::clear_table_order,
            commands::close_table_order,
            commands::get_vat_rate,
            commands::set_vat_rate,
            commands::get_business_dates,
            commands::get_daily_summary,
            commands::get_sales_period_summary,
            commands::get_closed_orders_by_range,
            commands::close_business_day,
            commands::show_touch_keyboard
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
