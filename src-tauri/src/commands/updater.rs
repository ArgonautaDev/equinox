use tauri::AppHandle;
use tauri_plugin_updater::UpdaterExt;

#[tauri::command]
pub async fn check_for_updates(app: AppHandle) -> Result<Option<String>, String> {
    println!("🔍 Checking for updates...");

    match app.updater_builder().build() {
        Ok(updater) => match updater.check().await {
            Ok(Some(update)) => {
                println!("🎉 Nueva versión disponible: {}", update.version);
                Ok(Some(update.version.to_string()))
            }
            Ok(None) => {
                println!("✅ App está actualizada");
                Ok(None)
            }
            Err(e) => {
                eprintln!("⚠️ Error checking updates: {}", e);
                Err(e.to_string())
            }
        },
        Err(e) => {
            eprintln!("⚠️ Error building updater: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub async fn install_update(app: AppHandle) -> Result<(), String> {
    println!("📥 Installing update...");

    match app.updater_builder().build() {
        Ok(updater) => {
            match updater.check().await {
                Ok(Some(update)) => {
                    println!("📦 Downloading update version {}...", update.version);

                    // Download and install
                    update
                        .download_and_install(
                            |chunk_length, content_length| {
                                if let Some(total) = content_length {
                                    let progress = (chunk_length as f64 / total as f64) * 100.0;
                                    println!("📥 Download progress: {:.1}%", progress);
                                }
                            },
                            || {
                                println!("✅ Download complete, installing...");
                            },
                        )
                        .await
                        .map_err(|e| e.to_string())?;

                    println!("🔄 Update installed successfully, restarting app...");
                    app.restart();
                    // Ok(()) is unreachable because restart() terminates/restarts the process
                    #[allow(unreachable_code)]
                    Ok(())
                }
                Ok(None) => Err("No hay actualización disponible".to_string()),
                Err(e) => Err(format!("Error checking for update: {}", e)),
            }
        }
        Err(e) => Err(format!("Error building updater: {}", e)),
    }
}
