mod docgen;
mod http;
mod importer;
mod models;
mod store;
mod update;

use models::*;
use store::AppState;
use tauri::{Manager, State};

type Result<T> = std::result::Result<T, String>;

// ---------------------------------------------------------------------------
// Data queries
// ---------------------------------------------------------------------------

#[tauri::command]
fn get_app_data(state: State<AppState>, app: tauri::AppHandle) -> Result<AppData> {
    let mut data = state.data.lock().map_err(|e| e.to_string())?.clone();
    data.version = app.package_info().version.to_string();
    Ok(data)
}

#[tauri::command]
fn get_version(app: tauri::AppHandle) -> String {
    app.package_info().version.to_string()
}

// ---------------------------------------------------------------------------
// Folders
// ---------------------------------------------------------------------------

#[tauri::command]
fn create_folder(state: State<AppState>, name: String, parent_id: Option<String>) -> Result<Folder> {
    let folder = {
        let mut data = state.data.lock().map_err(|e| e.to_string())?;
        let order = data
            .folders
            .iter()
            .filter(|f| f.parent_id == parent_id)
            .map(|f| f.order)
            .max()
            .unwrap_or(-1)
            + 1;
        let folder = Folder {
            id: new_id(),
            name,
            parent_id,
            order,
            created_at: now_iso(),
        };
        data.folders.push(folder.clone());
        folder
    };
    state.save()?;
    Ok(folder)
}

#[tauri::command]
fn rename_folder(state: State<AppState>, id: String, name: String) -> Result<()> {
    {
        let mut data = state.data.lock().map_err(|e| e.to_string())?;
        if let Some(f) = data.folders.iter_mut().find(|f| f.id == id) {
            f.name = name;
        }
    }
    state.save()
}

fn descendant_folder_ids(data: &AppData, root: &str) -> Vec<String> {
    let mut ids = vec![root.to_string()];
    let mut changed = true;
    while changed {
        changed = false;
        for f in &data.folders {
            if let Some(pid) = &f.parent_id {
                if ids.contains(pid) && !ids.contains(&f.id) {
                    ids.push(f.id.clone());
                    changed = true;
                }
            }
        }
    }
    ids
}

#[tauri::command]
fn delete_folder(state: State<AppState>, id: String) -> Result<()> {
    {
        let mut data = state.data.lock().map_err(|e| e.to_string())?;
        let ids = descendant_folder_ids(&data, &id);
        data.folders.retain(|f| !ids.contains(&f.id));
        data.apis.retain(|a| !ids.contains(&a.folder_id));
        data.docs.retain(|d| !ids.contains(&d.folder_id));
    }
    state.save()
}

#[tauri::command]
fn reorder_folders(state: State<AppState>, ordered_ids: Vec<String>) -> Result<()> {
    {
        let mut data = state.data.lock().map_err(|e| e.to_string())?;
        for (i, id) in ordered_ids.iter().enumerate() {
            if let Some(f) = data.folders.iter_mut().find(|f| &f.id == id) {
                f.order = i as i64;
            }
        }
    }
    state.save()
}

// ---------------------------------------------------------------------------
// APIs
// ---------------------------------------------------------------------------

#[tauri::command]
fn create_api(state: State<AppState>, folder_id: String, name: String) -> Result<ApiItem> {
    let api = {
        let mut data = state.data.lock().map_err(|e| e.to_string())?;
        let order = data
            .apis
            .iter()
            .filter(|a| a.folder_id == folder_id)
            .map(|a| a.order)
            .max()
            .unwrap_or(-1)
            + 1;
        let api = ApiItem {
            id: new_id(),
            folder_id,
            name,
            order,
            created_at: now_iso(),
            updated_at: now_iso(),
            ..Default::default()
        };
        data.apis.push(api.clone());
        api
    };
    state.save()?;
    Ok(api)
}

#[tauri::command]
fn update_api(state: State<AppState>, api: ApiItem) -> Result<()> {
    {
        let mut data = state.data.lock().map_err(|e| e.to_string())?;
        if let Some(existing) = data.apis.iter_mut().find(|a| a.id == api.id) {
            let created = existing.created_at.clone();
            *existing = api;
            existing.created_at = created;
            existing.updated_at = now_iso();
        }
    }
    state.save()
}

#[tauri::command]
fn delete_api(state: State<AppState>, id: String) -> Result<()> {
    {
        let mut data = state.data.lock().map_err(|e| e.to_string())?;
        data.apis.retain(|a| a.id != id);
        for doc in data.docs.iter_mut() {
            doc.api_ids.retain(|aid| aid != &id);
        }
    }
    state.save()
}

#[tauri::command]
fn reorder_apis(state: State<AppState>, folder_id: String, ordered_ids: Vec<String>) -> Result<()> {
    {
        let mut data = state.data.lock().map_err(|e| e.to_string())?;
        for (i, id) in ordered_ids.iter().enumerate() {
            if let Some(a) = data
                .apis
                .iter_mut()
                .find(|a| &a.id == id && a.folder_id == folder_id)
            {
                a.order = i as i64;
            }
        }
    }
    state.save()
}

#[tauri::command]
fn duplicate_api(state: State<AppState>, id: String) -> Result<Option<ApiItem>> {
    let copy = {
        let mut data = state.data.lock().map_err(|e| e.to_string())?;
        let Some(src) = data.apis.iter().find(|a| a.id == id).cloned() else {
            return Ok(None);
        };
        let order = data
            .apis
            .iter()
            .filter(|a| a.folder_id == src.folder_id)
            .map(|a| a.order)
            .max()
            .unwrap_or(-1)
            + 1;
        let mut copy = src;
        copy.id = new_id();
        copy.name = format!("{} (副本)", copy.name);
        copy.order = order;
        copy.created_at = now_iso();
        copy.updated_at = now_iso();
        data.apis.push(copy.clone());
        copy
    };
    state.save()?;
    Ok(Some(copy))
}

// ---------------------------------------------------------------------------
// Docs
// ---------------------------------------------------------------------------

/// Collect apis for a document in sidebar order: DFS over the folder tree,
/// apis inside each folder sorted by their user-defined order.
fn collect_ordered<'a>(data: &'a AppData, api_ids: &[String]) -> Vec<&'a ApiItem> {
    let mut out: Vec<&ApiItem> = vec![];
    fn dfs<'a>(data: &'a AppData, parent: Option<&str>, api_ids: &[String], out: &mut Vec<&'a ApiItem>) {
        let mut folders: Vec<&Folder> = data
            .folders
            .iter()
            .filter(|f| f.parent_id.as_deref() == parent)
            .collect();
        folders.sort_by_key(|f| f.order);
        for f in folders {
            let mut apis: Vec<&ApiItem> = data
                .apis
                .iter()
                .filter(|a| a.folder_id == f.id && api_ids.contains(&a.id))
                .collect();
            apis.sort_by_key(|a| a.order);
            out.extend(apis);
            dfs(data, Some(&f.id), api_ids, out);
        }
    }
    dfs(data, None, api_ids, &mut out);
    // Any apis not reachable through the folder tree (defensive) are appended.
    for id in api_ids {
        if !out.iter().any(|a| &a.id == id) {
            if let Some(a) = data.apis.iter().find(|a| &a.id == id) {
                out.push(a);
            }
        }
    }
    out
}

#[tauri::command]
fn create_doc(
    state: State<AppState>,
    folder_id: String,
    title: String,
    api_ids: Vec<String>,
) -> Result<DocItem> {
    let doc = {
        let mut data = state.data.lock().map_err(|e| e.to_string())?;
        let apis = collect_ordered(&data, &api_ids);
        let ordered_ids: Vec<String> = apis.iter().map(|a| a.id.clone()).collect();
        let content = docgen::build_doc_html(&title, &apis);
        let doc = DocItem {
            id: new_id(),
            folder_id,
            title,
            api_ids: ordered_ids,
            content,
            created_at: now_iso(),
            updated_at: now_iso(),
        };
        data.docs.push(doc.clone());
        doc
    };
    state.save()?;
    Ok(doc)
}

#[tauri::command]
fn update_doc(state: State<AppState>, id: String, title: String, content: String) -> Result<()> {
    {
        let mut data = state.data.lock().map_err(|e| e.to_string())?;
        if let Some(d) = data.docs.iter_mut().find(|d| d.id == id) {
            d.title = title;
            d.content = content;
            d.updated_at = now_iso();
        }
    }
    state.save()
}

#[tauri::command]
fn rename_doc(state: State<AppState>, id: String, title: String) -> Result<()> {
    {
        let mut data = state.data.lock().map_err(|e| e.to_string())?;
        if let Some(d) = data.docs.iter_mut().find(|d| d.id == id) {
            d.title = title;
            d.updated_at = now_iso();
        }
    }
    state.save()
}

#[tauri::command]
fn delete_doc(state: State<AppState>, id: String) -> Result<()> {
    {
        let mut data = state.data.lock().map_err(|e| e.to_string())?;
        data.docs.retain(|d| d.id != id);
    }
    state.save()
}

// ---------------------------------------------------------------------------
// Param docs / request sending
// ---------------------------------------------------------------------------

#[tauri::command]
fn generate_param_docs(json: String, root_path: String) -> Result<Vec<ParamDoc>> {
    docgen::generate_param_docs(&json, &root_path)
}

#[tauri::command]
async fn send_request(api: ApiItem) -> Result<ResponseData> {
    Ok(http::send(&api).await)
}

// ---------------------------------------------------------------------------
// Import / export
// ---------------------------------------------------------------------------

#[tauri::command]
fn export_all(state: State<AppState>, app: tauri::AppHandle) -> Result<String> {
    let mut data = state.data.lock().map_err(|e| e.to_string())?.clone();
    data.version = app.package_info().version.to_string();
    serde_json::to_string_pretty(&data).map_err(|e| e.to_string())
}

#[tauri::command]
fn export_selection(
    state: State<AppState>,
    api_ids: Vec<String>,
    doc_ids: Vec<String>,
) -> Result<String> {
    let data = state.data.lock().map_err(|e| e.to_string())?;
    let apis: Vec<ApiItem> = data
        .apis
        .iter()
        .filter(|a| api_ids.contains(&a.id))
        .cloned()
        .collect();
    let docs: Vec<DocItem> = data
        .docs
        .iter()
        .filter(|d| doc_ids.contains(&d.id))
        .cloned()
        .collect();
    // Include every ancestor folder so the tree can be rebuilt on import.
    let mut folder_ids: Vec<String> = apis.iter().map(|a| a.folder_id.clone()).collect();
    folder_ids.extend(docs.iter().map(|d| d.folder_id.clone()));
    let mut needed: Vec<String> = vec![];
    for fid in folder_ids {
        let mut cur = Some(fid);
        while let Some(id) = cur {
            if needed.contains(&id) {
                break;
            }
            needed.push(id.clone());
            cur = data
                .folders
                .iter()
                .find(|f| f.id == id)
                .and_then(|f| f.parent_id.clone());
        }
    }
    let folders: Vec<Folder> = data
        .folders
        .iter()
        .filter(|f| needed.contains(&f.id))
        .cloned()
        .collect();
    let out = AppData {
        folders,
        apis,
        docs,
        version: String::new(),
    };
    serde_json::to_string_pretty(&out).map_err(|e| e.to_string())
}

#[tauri::command]
fn import_all(state: State<AppState>, json: String) -> Result<ImportResult> {
    let incoming: AppData =
        serde_json::from_str(&json).map_err(|e| format!("备份文件解析失败: {e}"))?;
    let result = ImportResult {
        folders: incoming.folders.len(),
        apis: incoming.apis.len(),
        docs: incoming.docs.len(),
        format: "duapi".into(),
    };
    {
        let mut data = state.data.lock().map_err(|e| e.to_string())?;
        data.folders = incoming.folders;
        data.apis = incoming.apis;
        data.docs = incoming.docs;
    }
    state.save()?;
    Ok(result)
}

#[tauri::command]
fn import_selection(state: State<AppState>, json: String) -> Result<ImportResult> {
    let incoming: AppData =
        serde_json::from_str(&json).map_err(|e| format!("备份文件解析失败: {e}"))?;
    let mut result = ImportResult {
        format: "duapi".into(),
        ..Default::default()
    };
    {
        let mut data = state.data.lock().map_err(|e| e.to_string())?;
        for f in incoming.folders {
            if !data.folders.iter().any(|x| x.id == f.id) {
                data.folders.push(f);
                result.folders += 1;
            }
        }
        for a in incoming.apis {
            if !data.apis.iter().any(|x| x.id == a.id) {
                data.apis.push(a);
                result.apis += 1;
            }
        }
        for d in incoming.docs {
            if !data.docs.iter().any(|x| x.id == d.id) {
                data.docs.push(d);
                result.docs += 1;
            }
        }
    }
    state.save()?;
    Ok(result)
}

#[tauri::command]
fn import_from_format(state: State<AppState>, content: String, format: String) -> Result<ImportResult> {
    let result = {
        let mut data = state.data.lock().map_err(|e| e.to_string())?;
        importer::import_from_format(&mut data, &content, &format)?
    };
    state.save()?;
    Ok(result)
}

// ---------------------------------------------------------------------------
// File helpers (paths always come from the native save/open dialogs)
// ---------------------------------------------------------------------------

#[tauri::command]
fn write_text_file(path: String, content: String) -> Result<()> {
    std::fs::write(&path, content).map_err(|e| format!("写入文件失败: {e}"))
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String> {
    std::fs::read_to_string(&path).map_err(|e| format!("读取文件失败: {e}"))
}

// ---------------------------------------------------------------------------
// Update flow
// ---------------------------------------------------------------------------

#[tauri::command]
async fn check_update_cmd(app: tauri::AppHandle, repo: String) -> Result<UpdateInfo> {
    let current = app.package_info().version.to_string();
    Ok(update::check(&repo, &current).await)
}

#[tauri::command]
async fn download_update_cmd(app: tauri::AppHandle, url: String, target: String) -> Result<()> {
    update::download(&app, &url, &target).await
}

#[tauri::command]
fn install_update_cmd(app: tauri::AppHandle, path: String) -> Result<()> {
    update::install(&app, &path)
}

// ---------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");
            std::fs::create_dir_all(&dir).ok();
            app.manage(AppState::load(dir));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_data,
            get_version,
            create_folder,
            rename_folder,
            delete_folder,
            reorder_folders,
            create_api,
            update_api,
            delete_api,
            reorder_apis,
            duplicate_api,
            create_doc,
            update_doc,
            rename_doc,
            delete_doc,
            generate_param_docs,
            send_request,
            export_all,
            export_selection,
            import_all,
            import_selection,
            import_from_format,
            write_text_file,
            read_text_file,
            check_update_cmd,
            download_update_cmd,
            install_update_cmd
        ])
        .run(tauri::generate_context!())
        .expect("error while running duapi");
}
