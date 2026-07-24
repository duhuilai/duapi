use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use crate::models::AppData;

/// Application state: all data lives in a single JSON file under the
/// app-data directory, fully offline.
pub struct AppState {
    pub data: Mutex<AppData>,
    pub path: PathBuf,
}

impl AppState {
    pub fn load(dir: PathBuf) -> Self {
        let path = dir.join("data.json");
        let data = match fs::read_to_string(&path) {
            Ok(s) => serde_json::from_str::<AppData>(&s).unwrap_or_default(),
            Err(_) => AppData::default(),
        };
        Self {
            data: Mutex::new(data),
            path,
        }
    }

    /// Persist current state to disk (atomic-ish: write temp then rename).
    pub fn save(&self) -> Result<(), String> {
        let data = self.data.lock().map_err(|e| e.to_string())?;
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let json = serde_json::to_string_pretty(&*data).map_err(|e| e.to_string())?;
        let tmp = self.path.with_extension("json.tmp");
        fs::write(&tmp, &json).map_err(|e| e.to_string())?;
        if fs::rename(&tmp, &self.path).is_err() {
            // On Windows rename can fail if the target is locked; fall back to
            // a direct write which is still safe for our small JSON payload.
            fs::write(&self.path, &json).map_err(|e| e.to_string())?;
            let _ = fs::remove_file(&tmp);
        }
        Ok(())
    }
}
