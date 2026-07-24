use serde_json::Value;

use crate::models::{new_id, now_iso, ApiItem, AppData, Folder, ImportResult, KeyValue};

// ---------------------------------------------------------------------------
// Multi-protocol import: Postman collection v2.x, OpenAPI 3 / Swagger 2
// (JSON or YAML), and single curl commands. Imported items are appended
// (merged) into existing data.
// ---------------------------------------------------------------------------

pub fn import_from_format(
    data: &mut AppData,
    content: &str,
    format: &str,
) -> Result<ImportResult, String> {
    match format {
        "postman" => import_postman(data, content),
        "openapi" => import_openapi(data, content),
        "curl" => import_curl(data, content),
        other => Err(format!("不支持的导入格式: {other}")),
    }
}

fn next_folder_order(data: &AppData, parent: Option<&str>) -> i64 {
    data.folders
        .iter()
        .filter(|f| f.parent_id.as_deref() == parent)
        .map(|f| f.order)
        .max()
        .unwrap_or(-1)
        + 1
}

fn next_api_order(data: &AppData, folder_id: &str) -> i64 {
    data.apis
        .iter()
        .filter(|a| a.folder_id == folder_id)
        .map(|a| a.order)
        .max()
        .unwrap_or(-1)
        + 1
}

fn add_folder(data: &mut AppData, name: &str, parent: Option<String>) -> String {
    let id = new_id();
    let order = next_folder_order(data, parent.as_deref());
    data.folders.push(Folder {
        id: id.clone(),
        name: name.to_string(),
        parent_id: parent,
        order,
        created_at: now_iso(),
    });
    id
}

fn kv(key: &str, value: &str) -> KeyValue {
    KeyValue {
        id: new_id(),
        key: key.to_string(),
        value: value.to_string(),
        enabled: true,
    }
}

// ------------------------------- Postman -----------------------------------

fn import_postman(data: &mut AppData, content: &str) -> Result<ImportResult, String> {
    let root: Value =
        serde_json::from_str(content).map_err(|e| format!("Postman 集合解析失败: {e}"))?;
    let name = root
        .pointer("/info/name")
        .and_then(Value::as_str)
        .unwrap_or("Postman 导入");
    let items = root
        .get("item")
        .and_then(Value::as_array)
        .ok_or("不是有效的 Postman 集合（缺少 item）")?;

    let mut result = ImportResult {
        format: "postman".into(),
        ..Default::default()
    };
    let root_id = add_folder(data, name, None);
    result.folders += 1;
    walk_postman_items(data, items, &root_id, &mut result);
    Ok(result)
}

fn walk_postman_items(data: &mut AppData, items: &[Value], folder_id: &str, result: &mut ImportResult) {
    for item in items {
        let item_name = item.get("name").and_then(Value::as_str).unwrap_or("未命名");
        if let Some(children) = item.get("item").and_then(Value::as_array) {
            let sub = add_folder(data, item_name, Some(folder_id.to_string()));
            result.folders += 1;
            walk_postman_items(data, children, &sub, result);
        } else if let Some(request) = item.get("request") {
            let api = postman_request_to_api(request, item_name, folder_id, data);
            data.apis.push(api);
            result.apis += 1;
        }
    }
}

fn postman_request_to_api(req: &Value, name: &str, folder_id: &str, data: &AppData) -> ApiItem {
    let method = req
        .get("method")
        .and_then(Value::as_str)
        .unwrap_or("GET")
        .to_string();
    let url = match req.get("url") {
        Some(Value::String(s)) => s.clone(),
        Some(obj) => obj
            .get("raw")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_string(),
        None => String::new(),
    };

    let mut headers = vec![];
    if let Some(arr) = req.get("header").and_then(Value::as_array) {
        for h in arr {
            let k = h.get("key").and_then(Value::as_str).unwrap_or("");
            let v = h.get("value").and_then(Value::as_str).unwrap_or("");
            if !k.is_empty() {
                headers.push(kv(k, v));
            }
        }
    }

    let mut body_type = "none".to_string();
    let mut body_raw = String::new();
    if let Some(body) = req.get("body") {
        match body.get("mode").and_then(Value::as_str) {
            Some("raw") => {
                body_raw = body
                    .get("raw")
                    .and_then(Value::as_str)
                    .unwrap_or("")
                    .to_string();
                body_type = if serde_json::from_str::<Value>(&body_raw).is_ok() {
                    "json".into()
                } else {
                    "raw".into()
                };
            }
            Some("urlencoded") => {
                body_type = "form_urlencoded".into();
                if let Some(arr) = body.get("urlencoded").and_then(Value::as_array) {
                    body_raw = arr
                        .iter()
                        .map(|p| {
                            format!(
                                "{}={}",
                                p.get("key").and_then(Value::as_str).unwrap_or(""),
                                p.get("value").and_then(Value::as_str).unwrap_or("")
                            )
                        })
                        .collect::<Vec<_>>()
                        .join("\n");
                }
            }
            Some("formdata") => {
                body_type = "form_data".into();
                if let Some(arr) = body.get("formdata").and_then(Value::as_array) {
                    body_raw = arr
                        .iter()
                        .map(|p| {
                            format!(
                                "{}={}",
                                p.get("key").and_then(Value::as_str).unwrap_or(""),
                                p.get("value").and_then(Value::as_str).unwrap_or("")
                            )
                        })
                        .collect::<Vec<_>>()
                        .join("\n");
                }
            }
            _ => {}
        }
    }

    let mut api = ApiItem {
        id: new_id(),
        folder_id: folder_id.to_string(),
        name: name.to_string(),
        method,
        url,
        headers,
        body_type,
        body_raw,
        order: next_api_order(data, folder_id),
        created_at: now_iso(),
        updated_at: now_iso(),
        ..Default::default()
    };

    // Basic / bearer auth
    if let Some(auth) = req.get("auth") {
        match auth.get("type").and_then(Value::as_str) {
            Some("bearer") => {
                api.auth.auth_type = "bearer".into();
                if let Some(arr) = auth.get("bearer").and_then(Value::as_array) {
                    for p in arr {
                        if p.get("key").and_then(Value::as_str) == Some("token") {
                            api.auth.token = p
                                .get("value")
                                .and_then(Value::as_str)
                                .unwrap_or("")
                                .to_string();
                        }
                    }
                }
            }
            Some("basic") => {
                api.auth.auth_type = "basic".into();
                if let Some(arr) = auth.get("basic").and_then(Value::as_array) {
                    for p in arr {
                        let k = p.get("key").and_then(Value::as_str).unwrap_or("");
                        let v = p.get("value").and_then(Value::as_str).unwrap_or("");
                        if k == "username" {
                            api.auth.username = v.to_string();
                        } else if k == "password" {
                            api.auth.password = v.to_string();
                        }
                    }
                }
            }
            _ => {}
        }
    }
    api
}

// ------------------------------- OpenAPI -----------------------------------

fn import_openapi(data: &mut AppData, content: &str) -> Result<ImportResult, String> {
    let root: Value = serde_json::from_str(content)
        .or_else(|_| serde_yaml::from_str::<Value>(content).map_err(|e| format!("{e}")))
        .map_err(|e: String| format!("OpenAPI 文档解析失败: {e}"))?;

    let title = root
        .pointer("/info/title")
        .and_then(Value::as_str)
        .unwrap_or("OpenAPI 导入");
    let base = root
        .pointer("/servers/0/url")
        .and_then(Value::as_str)
        .unwrap_or("")
        .trim_end_matches('/')
        .to_string();
    let paths = root
        .get("paths")
        .and_then(Value::as_object)
        .ok_or("不是有效的 OpenAPI 文档（缺少 paths）")?
        .clone();

    let mut result = ImportResult {
        format: "openapi".into(),
        ..Default::default()
    };
    let root_id = add_folder(data, title, None);
    result.folders += 1;

    // tag -> sub-folder id, created lazily
    let mut tag_folders: std::collections::HashMap<String, String> = Default::default();
    const METHODS: [&str; 7] = ["get", "post", "put", "delete", "patch", "head", "options"];

    for (path, ops) in paths {
        let Some(ops) = ops.as_object() else { continue };
        for (m, op) in ops {
            if !METHODS.contains(&m.as_str()) {
                continue;
            }
            let summary = op
                .get("summary")
                .and_then(Value::as_str)
                .filter(|s| !s.is_empty())
                .map(String::from)
                .unwrap_or_else(|| format!("{} {}", m.to_uppercase(), path));
            let tag = op
                .pointer("/tags/0")
                .and_then(Value::as_str)
                .unwrap_or("")
                .to_string();
            let parent = if tag.is_empty() {
                root_id.clone()
            } else {
                match tag_folders.get(&tag) {
                    Some(id) => id.clone(),
                    None => {
                        let id = add_folder(data, &tag, Some(root_id.clone()));
                        result.folders += 1;
                        tag_folders.insert(tag.clone(), id.clone());
                        id
                    }
                }
            };

            // path/query params
            let mut query = vec![];
            let mut path_params = vec![];
            if let Some(arr) = op.get("parameters").and_then(Value::as_array) {
                for p in arr {
                    let name = p.get("name").and_then(Value::as_str).unwrap_or("");
                    match p.get("in").and_then(Value::as_str) {
                        Some("query") => query.push(kv(name, "")),
                        Some("path") => path_params.push(kv(name, "")),
                        _ => {}
                    }
                }
            }

            let description = op
                .get("description")
                .and_then(Value::as_str)
                .unwrap_or("")
                .to_string();

            let api = ApiItem {
                id: new_id(),
                folder_id: parent.clone(),
                name: summary,
                method: m.to_uppercase(),
                url: format!("{base}{path}"),
                query,
                path_params,
                description,
                order: next_api_order(data, &parent),
                created_at: now_iso(),
                updated_at: now_iso(),
                ..Default::default()
            };
            data.apis.push(api);
            result.apis += 1;
        }
    }
    Ok(result)
}

// -------------------------------- curl -------------------------------------

fn tokenize_curl(cmd: &str) -> Vec<String> {
    let mut tokens = vec![];
    let mut cur = String::new();
    let mut quote: Option<char> = None;
    let chars: Vec<char> = cmd.chars().collect();
    let mut i = 0;
    while i < chars.len() {
        let c = chars[i];
        match quote {
            Some(q) => {
                if c == q {
                    quote = None;
                } else if c == '\\' && q == '"' && i + 1 < chars.len() {
                    i += 1;
                    cur.push(chars[i]);
                } else {
                    cur.push(c);
                }
            }
            None => match c {
                '\'' | '"' => quote = Some(c),
                '\\' | '^' if i + 1 < chars.len() && chars[i + 1] == '\n' => i += 1,
                c if c.is_whitespace() => {
                    if !cur.is_empty() {
                        tokens.push(std::mem::take(&mut cur));
                    }
                }
                _ => cur.push(c),
            },
        }
        i += 1;
    }
    if !cur.is_empty() {
        tokens.push(cur);
    }
    tokens
}

fn import_curl(data: &mut AppData, content: &str) -> Result<ImportResult, String> {
    let tokens = tokenize_curl(content);
    if tokens.first().map(String::as_str) != Some("curl") {
        return Err("不是有效的 curl 命令".into());
    }

    let mut method = String::new();
    let mut url = String::new();
    let mut headers = vec![];
    let mut body_raw = String::new();
    let mut auth_user = String::new();

    let mut i = 1;
    while i < tokens.len() {
        let t = tokens[i].as_str();
        match t {
            "-X" | "--request" => {
                i += 1;
                method = tokens.get(i).cloned().unwrap_or_default().to_uppercase();
            }
            "-H" | "--header" => {
                i += 1;
                if let Some(h) = tokens.get(i) {
                    if let Some((k, v)) = h.split_once(':') {
                        headers.push(kv(k.trim(), v.trim()));
                    }
                }
            }
            "-d" | "--data" | "--data-raw" | "--data-binary" | "--data-ascii" => {
                i += 1;
                body_raw = tokens.get(i).cloned().unwrap_or_default();
            }
            "-u" | "--user" => {
                i += 1;
                auth_user = tokens.get(i).cloned().unwrap_or_default();
            }
            "-F" | "--form" => {
                i += 1;
                if let Some(f) = tokens.get(i) {
                    if !body_raw.is_empty() {
                        body_raw.push('\n');
                    }
                    body_raw.push_str(f);
                }
            }
            _ => {
                if !t.starts_with('-') && (t.starts_with("http") || url.is_empty() && t.contains('.')) {
                    url = t.to_string();
                }
            }
        }
        i += 1;
    }

    if method.is_empty() {
        method = if body_raw.is_empty() { "GET".into() } else { "POST".into() };
    }
    let body_type = if body_raw.is_empty() {
        "none"
    } else if serde_json::from_str::<Value>(&body_raw).is_ok() {
        "json"
    } else {
        "form_urlencoded"
    };

    let folder_id = add_folder(data, "curl 导入", None);
    let mut api = ApiItem {
        id: new_id(),
        folder_id: folder_id.clone(),
        name: format!("{method} {url}"),
        method,
        url,
        headers,
        body_type: body_type.into(),
        body_raw,
        order: next_api_order(data, &folder_id),
        created_at: now_iso(),
        updated_at: now_iso(),
        ..Default::default()
    };
    if !auth_user.is_empty() {
        api.auth.auth_type = "basic".into();
        if let Some((u, p)) = auth_user.split_once(':') {
            api.auth.username = u.to_string();
            api.auth.password = p.to_string();
        } else {
            api.auth.username = auth_user;
        }
    }
    data.apis.push(api);

    Ok(ImportResult {
        folders: 1,
        apis: 1,
        docs: 0,
        format: "curl".into(),
    })
}
