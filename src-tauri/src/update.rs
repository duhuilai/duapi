use futures_util::StreamExt;
use serde::Serialize;
use tauri::Emitter;

use crate::models::UpdateInfo;

// ---------------------------------------------------------------------------
// GitHub release based update flow:
//   check  -> query releases/latest, compare semver with current version
//   download -> stream asset to a temp file, emitting progress events
//   install -> launch the installer and exit the app
// ---------------------------------------------------------------------------

fn parse_ver(v: &str) -> (u64, u64, u64) {
    let v = v.trim().trim_start_matches(['v', 'V']);
    let core = v.split(['-', '+']).next().unwrap_or("");
    let mut it = core.split('.').map(|p| p.parse::<u64>().unwrap_or(0));
    (
        it.next().unwrap_or(0),
        it.next().unwrap_or(0),
        it.next().unwrap_or(0),
    )
}

fn client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .user_agent("duapi-updater")
        .timeout(std::time::Duration::from_secs(600))
        .connect_timeout(std::time::Duration::from_secs(20))
        .build()
        .map_err(|e| e.to_string())
}

pub async fn check(repo: &str, current: &str) -> UpdateInfo {
    let mut info = UpdateInfo {
        current: current.to_string(),
        ..Default::default()
    };
    let url = format!("https://api.github.com/repos/{repo}/releases/latest");
    let resp = match client() {
        Ok(c) => c
            .get(&url)
            .header("Accept", "application/vnd.github+json")
            .send()
            .await,
        Err(e) => {
            info.error = Some(e);
            return info;
        }
    };
    let resp = match resp {
        Ok(r) => r,
        Err(e) => {
            info.error = Some(format!("网络请求失败：{e}"));
            return info;
        }
    };
    if !resp.status().is_success() {
        info.error = Some(format!("GitHub 返回 {}", resp.status()));
        return info;
    }
    let v: serde_json::Value = match resp.json().await {
        Ok(v) => v,
        Err(e) => {
            info.error = Some(format!("响应解析失败：{e}"));
            return info;
        }
    };

    let tag = v
        .get("tag_name")
        .and_then(serde_json::Value::as_str)
        .unwrap_or("");
    info.latest = tag.trim_start_matches(['v', 'V']).to_string();
    info.notes = v
        .get("body")
        .and_then(serde_json::Value::as_str)
        .unwrap_or("")
        .to_string();
    info.prerelease = v
        .get("prerelease")
        .and_then(serde_json::Value::as_bool)
        .unwrap_or(false);
    info.has_update = parse_ver(&info.latest) > parse_ver(current);

    // Prefer NSIS setup exe, fall back to msi, then any exe.
    if let Some(assets) = v.get("assets").and_then(serde_json::Value::as_array) {
        let pick = |pred: &dyn Fn(&str) -> bool| -> Option<String> {
            assets.iter().find_map(|a| {
                let name = a.get("name").and_then(serde_json::Value::as_str)?;
                if pred(&name.to_lowercase()) {
                    a.get("browser_download_url")
                        .and_then(serde_json::Value::as_str)
                        .map(String::from)
                } else {
                    None
                }
            })
        };
        info.download_url = pick(&|n| n.ends_with(".exe") && n.contains("setup"))
            .or_else(|| pick(&|n| n.ends_with(".exe")))
            .or_else(|| pick(&|n| n.ends_with(".msi")));
    }
    info
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct Progress {
    received: u64,
    total: u64,
    percent: u64,
}

pub async fn download(app: &tauri::AppHandle, url: &str, target: &str) -> Result<(), String> {
    let resp = client()?
        .get(url)
        .send()
        .await
        .map_err(|e| format!("下载失败：{e}"))?;
    if !resp.status().is_success() {
        return Err(format!("下载失败：HTTP {}", resp.status()));
    }
    let total = resp.content_length().unwrap_or(0);
    let mut file = std::fs::File::create(target).map_err(|e| e.to_string())?;
    let mut stream = resp.bytes_stream();
    let mut received: u64 = 0;
    let mut last_pct: u64 = u64::MAX;
    use std::io::Write;
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        file.write_all(&chunk).map_err(|e| e.to_string())?;
        received += chunk.len() as u64;
        let percent = if total > 0 { received * 100 / total } else { 0 };
        if percent != last_pct {
            last_pct = percent;
            let _ = app.emit(
                "download-progress",
                Progress {
                    received,
                    total,
                    percent,
                },
            );
        }
    }
    file.flush().map_err(|e| e.to_string())?;
    Ok(())
}

pub fn install(app: &tauri::AppHandle, path: &str) -> Result<(), String> {
    if !std::path::Path::new(path).exists() {
        return Err("安装包不存在，请重新下载".into());
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", path])
            .spawn()
            .map_err(|e| format!("启动安装程序失败：{e}"))?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::process::Command::new("open")
            .arg(path)
            .spawn()
            .map_err(|e| format!("启动安装程序失败：{e}"))?;
    }
    // Give the installer a moment to start, then quit so files are not locked.
    let handle = app.clone();
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(800));
        handle.exit(0);
    });
    Ok(())
}
