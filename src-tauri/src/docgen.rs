use serde_json::Value;

use crate::models::{new_id, ApiItem, ParamDoc};

// ---------------------------------------------------------------------------
// Param docs generation: walk a sample JSON and flatten every field into a
// ParamDoc row. Nested levels are expressed via dotted paths ("data.user.id",
// arrays as "items[].name") so the frontend can indent by depth.
// ---------------------------------------------------------------------------

pub fn generate_param_docs(json: &str, root_path: &str) -> Result<Vec<ParamDoc>, String> {
    let value: Value =
        serde_json::from_str(json).map_err(|e| format!("JSON 解析失败: {e}"))?;
    let mut out = vec![];
    walk(&value, root_path, &mut out);
    Ok(out)
}

fn type_name(v: &Value) -> &'static str {
    match v {
        Value::Null => "null",
        Value::Bool(_) => "boolean",
        Value::Number(n) => {
            if n.is_i64() || n.is_u64() {
                "integer"
            } else {
                "number"
            }
        }
        Value::String(_) => "string",
        Value::Array(_) => "array",
        Value::Object(_) => "object",
    }
}

fn sample_of(v: &Value) -> String {
    match v {
        Value::String(s) => {
            let mut s = s.clone();
            if s.chars().count() > 40 {
                s = s.chars().take(40).collect::<String>() + "…";
            }
            s
        }
        Value::Array(_) | Value::Object(_) => String::new(),
        other => other.to_string(),
    }
}

fn depth_of(path: &str) -> i32 {
    let parts = path.split('.').filter(|p| !p.is_empty()).count() as i32;
    (parts - 1).max(0)
}

fn walk(v: &Value, prefix: &str, out: &mut Vec<ParamDoc>) {
    match v {
        Value::Object(map) => {
            for (k, child) in map {
                let path = if prefix.is_empty() {
                    k.clone()
                } else {
                    format!("{prefix}.{k}")
                };
                out.push(ParamDoc {
                    id: new_id(),
                    path: path.clone(),
                    type_name: type_name(child).to_string(),
                    required: false,
                    description: String::new(),
                    sample: sample_of(child),
                    depth: depth_of(&path),
                });
                match child {
                    Value::Object(_) => walk(child, &path, out),
                    Value::Array(arr) => {
                        if let Some(first) = arr.first() {
                            if first.is_object() || first.is_array() {
                                walk(first, &format!("{path}[]"), out);
                            }
                        }
                    }
                    _ => {}
                }
            }
        }
        Value::Array(arr) => {
            if let Some(first) = arr.first() {
                walk(first, &format!("{prefix}[]"), out);
            }
        }
        _ => {}
    }
}

// ---------------------------------------------------------------------------
// API document HTML generation (rendered inside the tiptap editor and used
// as the base for HTML / Word / Markdown export).
// ---------------------------------------------------------------------------

fn esc(s: &str) -> String {
    s.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;")
}

fn method_color(m: &str) -> &'static str {
    match m.to_ascii_uppercase().as_str() {
        "GET" => "#16A34A",
        "POST" => "#E08600",
        "PUT" => "#2563EB",
        "DELETE" => "#E5484D",
        "PATCH" => "#7C3AED",
        _ => "#64748B",
    }
}

fn params_table(docs: &[ParamDoc]) -> String {
    if docs.is_empty() {
        return "<p><em>无</em></p>".into();
    }
    let mut rows = String::new();
    for d in docs {
        let indent = "　".repeat(d.depth.max(0) as usize);
        rows.push_str(&format!(
            "<tr><td>{}{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td></tr>",
            indent,
            esc(&d.path),
            esc(&d.type_name),
            if d.required { "是" } else { "否" },
            esc(&d.description),
            esc(&d.sample)
        ));
    }
    format!(
        "<table><thead><tr><th>参数</th><th>类型</th><th>必填</th><th>说明</th><th>示例</th></tr></thead><tbody>{rows}</tbody></table>"
    )
}

/// Build the initial HTML content of a generated document.
/// `apis` must already be in the desired (user-sorted) order.
pub fn build_doc_html(title: &str, apis: &[&ApiItem]) -> String {
    let mut html = String::new();
    html.push_str(&format!("<h1>{}</h1>", esc(title)));
    html.push_str(&format!(
        "<p>共 {} 个接口 · 生成时间：{}</p>",
        apis.len(),
        chrono::Local::now().format("%Y-%m-%d %H:%M")
    ));

    for (i, api) in apis.iter().enumerate() {
        html.push_str("<hr>");
        html.push_str(&format!(
            "<h2 id=\"api-{0}\">{1}. {2}</h2>",
            esc(&api.id),
            i + 1,
            esc(&api.name)
        ));

        let method = if api.protocol == "graphql" {
            "GRAPHQL".to_string()
        } else {
            api.method.to_ascii_uppercase()
        };
        html.push_str(&format!(
            "<p><strong style=\"color:{}\">{}</strong>　<code>{}</code></p>",
            method_color(&api.method),
            esc(&method),
            esc(&api.url)
        ));
        if !api.description.trim().is_empty() {
            html.push_str(&format!("<p>{}</p>", esc(api.description.trim())));
        }

        // Query params
        let query: Vec<&crate::models::KeyValue> =
            api.query.iter().filter(|q| !q.key.is_empty()).collect();
        if !query.is_empty() {
            html.push_str("<h3>Query 参数</h3><table><thead><tr><th>参数</th><th>值示例</th></tr></thead><tbody>");
            for q in query {
                html.push_str(&format!(
                    "<tr><td>{}</td><td>{}</td></tr>",
                    esc(&q.key),
                    esc(&q.value)
                ));
            }
            html.push_str("</tbody></table>");
        }

        // Request params
        html.push_str("<h3>请求参数说明</h3>");
        html.push_str(&params_table(&api.request_docs));

        if (api.body_type == "json" || api.body_type == "graphql")
            && !api.body_raw.trim().is_empty()
        {
            html.push_str("<h3>请求体示例</h3>");
            html.push_str(&format!(
                "<pre><code>{}</code></pre>",
                esc(api.body_raw.trim())
            ));
        }

        // Response params
        html.push_str("<h3>响应参数说明</h3>");
        html.push_str(&params_table(&api.response_docs));

        if let Some(resp) = &api.last_response {
            if !resp.body.trim().is_empty() {
                html.push_str(&format!(
                    "<h3>响应示例（{} · {} ms）</h3>",
                    resp.status, resp.time_ms
                ));
                let mut body = resp.body.trim().to_string();
                if body.chars().count() > 6000 {
                    body = body.chars().take(6000).collect::<String>() + "\n… (已截断)";
                }
                html.push_str(&format!("<pre><code>{}</code></pre>", esc(&body)));
            }
        }
    }
    html
}
