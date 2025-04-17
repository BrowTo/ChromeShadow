use crate::{find_available_port, list_chrome_instances, wait_for_chrome_start};
use actix_web::{get, post, Responder};
use actix_web::{middleware, web, App, HttpServer};
use serde::{Deserialize, Serialize};
use sqlx::Executor;
use sqlx::Row;
use std::cmp::Ordering;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_sql::{DbInstances, DbPool};

struct TauriAppState {
    app: Mutex<AppHandle>,
}

#[actix_web::main]
pub async fn init(app: AppHandle) -> std::io::Result<()> {
    let tauri_app = web::Data::new(TauriAppState {
        app: Mutex::new(app),
    });

    HttpServer::new(move || {
        App::new()
            .app_data(tauri_app.clone())
            .wrap(middleware::Logger::default())
            .service(status)
            .service(group_list)
            .service(browser_list)
            .service(browser_open)
            .service(browser_close)
            .service(browser_active)
    })
    .bind(("127.0.0.1", 51888))?
    .run()
    .await
}

#[derive(Serialize)]
struct AppStatus {
    alive: bool,
}

#[get("/api/status")]
pub async fn status() -> impl Responder {
    web::Json(AppStatus { alive: true })
}

#[derive(Deserialize)]
struct PageInfo {
    page: u16,
    page_size: u16,
}

#[derive(Serialize)]
struct PageResult<T> {
    list: Vec<T>,
    page: u16,
    page_size: u16,
    total: u16,
}

#[derive(Serialize)]
struct ServerListResponse<T> {
    success: bool,
    data: Option<PageResult<T>>,
    msg: Option<String>,
}

#[derive(Serialize)]
struct ServerResponse<T> {
    success: bool,
    data: Option<T>,
    msg: Option<String>,
}

#[derive(Serialize)]
struct CommonInfo {
    id: u16,
    name: String,
    remark: String,
}

#[post("/api/group/list")]
pub async fn group_list(
    info: web::Json<PageInfo>,
    data: web::Data<TauriAppState>,
) -> impl Responder {
    let app = data.app.lock().unwrap();
    let instances_state = app.state::<DbInstances>();
    let instances = instances_state.0.read().await;
    let db_pool = instances.get("sqlite:shadow.db").unwrap();
    let response = match db_pool {
        DbPool::Sqlite(pool) => {
            let sql = format!(
                "SELECT *, COUNT(*) OVER () AS total FROM group_table LIMIT {} OFFSET {}",
                info.page_size,
                (info.page - 1) * info.page_size
            );
            println!("{}", sql);
            let query = sqlx::query(&sql);
            let rows = pool.fetch_all(query).await.unwrap();
            if !rows.is_empty() {
                let mut values = Vec::new();
                let total = rows[0].get("total");
                for row in rows {
                    let id: u16 = row.get("id");
                    let name: String = row.get("name");
                    let remark: String = row.get("remark");
                    values.push(CommonInfo { id, name, remark });
                }
                let page_data = PageResult {
                    page: info.page,
                    page_size: info.page_size,
                    list: values,
                    total,
                };
                web::Json(ServerListResponse {
                    success: true,
                    data: Some(page_data),
                    msg: None,
                })
            } else {
                let page_data = PageResult {
                    page: info.page,
                    page_size: info.page_size,
                    list: Vec::new(),
                    total: 0,
                };
                web::Json(ServerListResponse {
                    success: true,
                    data: Some(page_data),
                    msg: None,
                })
            }
        }
    };
    response
}

#[derive(Deserialize, Debug)]
struct GroupInfo {
    page: u16,
    page_size: u16,
    group_id: i16, //-1:ungruped;0:all
}

#[derive(Serialize, Clone)]
struct ProfileInfo {
    id: u16,
    name: String,
    remark: String,
    group_name: String,
    proxy_name: String,
}

#[derive(Serialize, Clone)]
struct LaunchProfileInfo {
    id: u16,
    name: String,
    proxy_name: String,
    port: u16,
}

#[derive(Serialize, Clone)]
struct CloseProfileInfo {
    name: String,
    pid: u32,
}

#[post("/api/browser/list")]
pub async fn browser_list(
    info: web::Json<GroupInfo>,
    data: web::Data<TauriAppState>,
) -> impl Responder {
    println!("Request browser list with: {:?}", info);
    let app = data.app.lock().unwrap();
    let instances_state = app.state::<DbInstances>();
    let instances = instances_state.0.read().await;
    let db_pool = instances.get("sqlite:shadow.db").unwrap();
    let response = match db_pool {
        DbPool::Sqlite(pool) => {
            let mut sql = "SELECT p.id, p.name, p.remark, COUNT(*) OVER () AS total, COALESCE(g.name, 'ungrouped') AS group_name, COALESCE(pr.name, 'unproxied') AS proxy_name FROM profile_table p LEFT JOIN group_table g ON p.group_id = g.id LEFT JOIN proxy_table pr ON p.proxy_id = pr.id".to_owned();
            match info.group_id.cmp(&0) {
                Ordering::Less => {
                    sql += format!(
                        " WHERE p.group_id IS NULL LIMIT {} OFFSET {}",
                        info.page_size,
                        (info.page - 1) * info.page_size
                    )
                    .as_str();
                }
                Ordering::Greater => {
                    sql += format!(
                        " WHERE p.group_id = {} LIMIT {} OFFSET {}",
                        info.group_id,
                        info.page_size,
                        (info.page - 1) * info.page_size
                    )
                    .as_str();
                }
                Ordering::Equal => {
                    sql += format!(
                        " LIMIT {} OFFSET {}",
                        info.page_size,
                        (info.page - 1) * info.page_size
                    )
                    .as_str();
                }
            };
            println!("{}", sql);
            let query = sqlx::query(&sql);
            let rows = pool.fetch_all(query).await.unwrap();
            if !rows.is_empty() {
                let total = rows[0].get("total");
                let mut values = Vec::new();
                for row in rows {
                    let id: u16 = row.get("id");
                    let name: String = row.get("name");
                    let remark: String = row.get("remark");
                    let group_name = row.get("group_name");
                    let proxy_name = row.get("proxy_name");
                    values.push(ProfileInfo {
                        id,
                        name,
                        remark,
                        group_name,
                        proxy_name,
                    });
                }
                let page_data = PageResult {
                    page: info.page,
                    page_size: info.page_size,
                    list: values,
                    total,
                };
                web::Json(ServerListResponse {
                    success: true,
                    data: Some(page_data),
                    msg: None,
                })
            } else {
                let page_data = PageResult {
                    list: [].to_vec(),
                    page: info.page,
                    page_size: info.page_size,
                    total: 0,
                };
                web::Json(ServerListResponse {
                    success: true,
                    data: Some(page_data),
                    msg: None,
                })
            }
        }
    };
    response
}

#[derive(Deserialize)]
struct IdInfo {
    id: u16,
}

#[derive(Serialize)]
struct ChromeWsInfo {
    ws: String,
}

#[post("/api/browser/open")]
pub async fn browser_open(
    info: web::Json<IdInfo>,
    data: web::Data<TauriAppState>,
) -> impl Responder {
    let app = data.app.lock().unwrap();
    let main_webview = app.get_webview_window("main").unwrap();
    let instances_state = app.state::<DbInstances>();
    let instances = instances_state.0.read().await;
    let db_pool = instances.get("sqlite:shadow.db").unwrap();
    let response = match db_pool {
        DbPool::Sqlite(pool) => {
            let sql = format!("SELECT p.id, p.name, COALESCE(pr.name, 'unproxied') AS proxy_name FROM profile_table p LEFT JOIN proxy_table pr ON p.proxy_id = pr.id WHERE p.id = {}", info.id);
            println!("{}", sql);
            let query = sqlx::query(&sql);
            let row_result = pool.fetch_one(query).await;
            if let Ok(row) = row_result {
                let id: u16 = row.get("id");
                let name: String = row.get("name");
                let proxy_name: String = row.get("proxy_name");
                let running_chrome = list_chrome_instances().await;
                let cur_chrome = running_chrome.iter().find(|chrome| chrome.id == id);
                if cur_chrome.is_some() {
                    let ws = wait_for_chrome_start(cur_chrome.unwrap().port)
                        .await
                        .unwrap();
                    web::Json(ServerResponse {
                        success: true,
                        data: Some(ChromeWsInfo { ws }),
                        msg: None,
                    })
                } else {
                    let port = find_available_port(9223).ok_or("No port useable").unwrap();
                    let _ = main_webview.emit(
                        "chrome-api-launch",
                        LaunchProfileInfo {
                            id,
                            name,
                            proxy_name,
                            port,
                        },
                    );
                    let ws = wait_for_chrome_start(port).await.unwrap();
                    web::Json(ServerResponse {
                        success: true,
                        data: Some(ChromeWsInfo { ws }),
                        msg: None,
                    })
                }
            } else {
                web::Json(ServerResponse {
                    success: false,
                    data: None,
                    msg: Some("id not found".to_string()),
                })
            }
        }
    };
    response
}

#[post("/api/browser/close")]
pub async fn browser_close(
    info: web::Json<IdInfo>,
    data: web::Data<TauriAppState>,
) -> impl Responder {
    let app = data.app.lock().unwrap();
    let main_webview = app.get_webview_window("main").unwrap();
    let instances_state = app.state::<DbInstances>();
    let instances = instances_state.0.read().await;
    let db_pool = instances.get("sqlite:shadow.db").unwrap();
    let response = match db_pool {
        DbPool::Sqlite(pool) => {
            let sql = format!("SELECT id, name FROM profile_table WHERE id = {}", info.id);
            println!("{}", sql);
            let query = sqlx::query(&sql);
            let row_result = pool.fetch_one(query).await;
            if let Ok(row) = row_result {
                let id: u16 = row.get("id");
                let name: String = row.get("name");
                let running_chrome = list_chrome_instances().await;
                let cur_chrome = running_chrome.iter().find(|chrome| chrome.id == id);
                if let Some(chrome) = cur_chrome {
                    let _ = main_webview.emit(
                        "chrome-api-close",
                        CloseProfileInfo {
                            name: name.clone(),
                            pid: chrome.pid,
                        },
                    );
                    web::Json(ServerResponse {
                        success: true,
                        data: Some(CloseProfileInfo {
                            name,
                            pid: chrome.pid,
                        }),
                        msg: None,
                    })
                } else {
                    web::Json(ServerResponse {
                        success: false,
                        data: None,
                        msg: Some("chrome with id not running".to_string()),
                    })
                }
            } else {
                web::Json(ServerResponse {
                    success: false,
                    data: None,
                    msg: Some("id not found".to_string()),
                })
            }
        }
    };
    response
}

#[post("/api/browser/active")]
pub async fn browser_active() -> impl Responder {
    let running_chrome = list_chrome_instances().await;
    web::Json(ServerResponse {
        success: true,
        data: Some(running_chrome),
        msg: None,
    })
}
