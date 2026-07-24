use std::time::Instant;

use crate::models::{ApiItem, KeyValue, ResponseData};

/// Send an HTTP / GraphQL request described by an ApiItem.
/// Fully driven by user input; invalid certs are accepted on purpose because
/// this is a developer debugging tool often pointed at self-signed servers.
pub async fn send(api: &ApiItem) -> ResponseData {
    match send_inner(api).await {
        Ok(r) => r,
        Err(e) => ResponseData {
            status: 0,
            status_text: String::new(),
            headers: vec![],
            body: String::new(),
            time_ms: 0,
            size_bytes: 0,
            content_type: String::new(),
            ok: false,
            error: Some(e),
        },
    }
}

fn apply_path_params(url: &str, params: &[KeyValue]) -> String {
    let mut out = url.to_string();
    for p in params.iter().filter(|p| p.enabled && !p.key.is_empty()) {
        out = out.replace(&format!("{{{}}}", p.key), &p.value);
        out = out.replace(&format!(":{}", p.key), &p.value);
    }
    out
}

/// Parse "k=v" lines (or &-joined pairs) used by form bodies.
fn parse_pairs(raw: &str) -> Vec<(String, String)> {
    let mut out = vec![];
    for line in raw.split(['\n', '&']) {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        match line.split_once('=') {
            Some((k, v)) => out.push((k.trim().to_string(), v.trim().to_string())),
            None => out.push((line.to_string(), String::new())),
        }
    }
    out
}

async fn send_inner(api: &ApiItem) -> Result<ResponseData, String> {
    let client = reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        .timeout(std::time::Duration::from_secs(60))
        .connect_timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    let mut url = apply_path_params(api.url.trim(), &api.path_params);
    if url.is_empty() {
        return Err("请求地址为空".into());
    }
    if !url.starts_with("http://") && !url.starts_with("https://") {
        url = format!("http://{url}");
    }

    let is_graphql = api.protocol == "graphql" || api.body_type == "graphql";
    let method = if is_graphql {
        reqwest::Method::POST
    } else {
        reqwest::Method::from_bytes(api.method.as_bytes()).map_err(|e| e.to_string())?
    };

    let mut req = client.request(method, &url);

    // Query params
    let query: Vec<(String, String)> = api
        .query
        .iter()
        .filter(|q| q.enabled && !q.key.is_empty())
        .map(|q| (q.key.clone(), q.value.clone()))
        .collect();
    if !query.is_empty() {
        req = req.query(&query);
    }

    // Headers
    for h in api.headers.iter().filter(|h| h.enabled && !h.key.is_empty()) {
        req = req.header(&h.key, &h.value);
    }

    // Auth
    match api.auth.auth_type.as_str() {
        "bearer" => {
            if !api.auth.token.is_empty() {
                req = req.bearer_auth(&api.auth.token);
            }
        }
        "basic" => {
            req = req.basic_auth(&api.auth.username, Some(&api.auth.password));
        }
        "apikey" => {
            if !api.auth.key.is_empty() {
                if api.auth.add_to == "query" {
                    req = req.query(&[(&api.auth.key, &api.auth.value)]);
                } else {
                    req = req.header(&api.auth.key, &api.auth.value);
                }
            }
        }
        _ => {}
    }

    // Body
    if is_graphql {
        let payload = serde_json::json!({ "query": api.body_raw });
        req = req.json(&payload);
    } else {
        match api.body_type.as_str() {
            "json" => {
                req = req
                    .header("Content-Type", "application/json")
                    .body(api.body_raw.clone());
            }
            "form_urlencoded" => {
                let pairs = parse_pairs(&api.body_raw);
                req = req.form(&pairs);
            }
            "form_data" => {
                let mut form = reqwest::multipart::Form::new();
                for (k, v) in parse_pairs(&api.body_raw) {
                    form = form.text(k, v);
                }
                req = req.multipart(form);
            }
            "raw" => {
                let ct = if api.body_content_type.is_empty() {
                    "text/plain".to_string()
                } else {
                    api.body_content_type.clone()
                };
                req = req.header("Content-Type", ct).body(api.body_raw.clone());
            }
            _ => {} // none
        }
    }

    let started = Instant::now();
    let resp = req.send().await.map_err(|e| e.to_string())?;
    let status = resp.status();
    let headers: Vec<KeyValue> = resp
        .headers()
        .iter()
        .map(|(k, v)| KeyValue {
            id: crate::models::new_id(),
            key: k.to_string(),
            value: v.to_str().unwrap_or("<binary>").to_string(),
            enabled: true,
        })
        .collect();
    let content_type = resp
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();

    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
    let time_ms = started.elapsed().as_millis() as u64;
    let size_bytes = bytes.len() as u64;

    // Pretty-print JSON bodies for readability.
    let mut body = String::from_utf8_lossy(&bytes).to_string();
    if content_type.contains("json") {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&body) {
            if let Ok(pretty) = serde_json::to_string_pretty(&v) {
                body = pretty;
            }
        }
    }

    Ok(ResponseData {
        status: status.as_u16(),
        status_text: status.canonical_reason().unwrap_or("").to_string(),
        headers,
        body,
        time_ms,
        size_bytes,
        content_type,
        ok: status.is_success(),
        error: None,
    })
}
