use serde::{Deserialize, Serialize};

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct KeyValue {
    pub id: String,
    pub key: String,
    pub value: String,
    #[serde(default = "default_true")]
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct AuthData {
    pub auth_type: String, // none | bearer | basic | apikey
    pub token: String,
    pub username: String,
    pub password: String,
    pub key: String,
    pub value: String,
    pub add_to: String, // header | query
}

impl Default for AuthData {
    fn default() -> Self {
        Self {
            auth_type: "none".into(),
            token: String::new(),
            username: String::new(),
            password: String::new(),
            key: String::new(),
            value: String::new(),
            add_to: "header".into(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct ParamDoc {
    pub id: String,
    pub path: String,
    pub type_name: String,
    pub required: bool,
    pub description: String,
    pub sample: String,
    pub depth: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct SavedResponse {
    pub status: u16,
    pub status_text: String,
    pub headers: Vec<KeyValue>,
    pub body: String,
    pub time_ms: u64,
    pub size_bytes: u64,
    pub content_type: String,
    pub saved_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct ApiItem {
    pub id: String,
    pub folder_id: String,
    pub name: String,
    pub protocol: String, // http | graphql
    pub method: String,
    pub url: String,
    pub headers: Vec<KeyValue>,
    pub query: Vec<KeyValue>,
    pub path_params: Vec<KeyValue>,
    pub body_type: String, // none | json | form_data | form_urlencoded | raw | graphql
    pub body_raw: String,
    pub body_content_type: String,
    pub auth: AuthData,
    pub pre_script: String,
    pub tests_script: String,
    pub order: i64,
    pub description: String,
    pub request_docs: Vec<ParamDoc>,
    pub response_docs: Vec<ParamDoc>,
    pub last_response: Option<SavedResponse>,
    pub updated_at: String,
    pub created_at: String,
}

impl Default for ApiItem {
    fn default() -> Self {
        Self {
            id: String::new(),
            folder_id: String::new(),
            name: String::new(),
            protocol: "http".into(),
            method: "GET".into(),
            url: String::new(),
            headers: vec![],
            query: vec![],
            path_params: vec![],
            body_type: "none".into(),
            body_raw: String::new(),
            body_content_type: "application/json".into(),
            auth: AuthData::default(),
            pre_script: String::new(),
            tests_script: String::new(),
            order: 0,
            description: String::new(),
            request_docs: vec![],
            response_docs: vec![],
            last_response: None,
            updated_at: String::new(),
            created_at: String::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct Folder {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub order: i64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct DocItem {
    pub id: String,
    pub folder_id: String,
    pub title: String,
    pub api_ids: Vec<String>,
    pub content: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct AppData {
    pub folders: Vec<Folder>,
    pub apis: Vec<ApiItem>,
    pub docs: Vec<DocItem>,
    pub version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct ResponseData {
    pub status: u16,
    pub status_text: String,
    pub headers: Vec<KeyValue>,
    pub body: String,
    pub time_ms: u64,
    pub size_bytes: u64,
    pub content_type: String,
    pub ok: bool,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct UpdateInfo {
    pub current: String,
    pub latest: String,
    pub has_update: bool,
    pub notes: String,
    pub download_url: Option<String>,
    pub prerelease: bool,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct ImportResult {
    pub folders: usize,
    pub apis: usize,
    pub docs: usize,
    pub format: String,
}

pub fn new_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

pub fn now_iso() -> String {
    chrono::Local::now().to_rfc3339()
}
