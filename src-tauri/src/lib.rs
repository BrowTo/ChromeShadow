use serde::Serialize;
use std::collections::{HashMap, HashSet};
use std::net::{TcpListener, TcpStream};
use std::path::Path;
use std::process::Command;
use std::sync::{Arc, RwLock};
use std::time::Duration;
use tauri::{Emitter, Window};
use tauri_plugin_sql::{Migration, MigrationKind};
use tokio::net::TcpStream as TokioTcpStream;
use tokio::sync::Mutex;
use tokio::task;
use tokio::time::sleep;
mod proxy_manager;
use crate::proxy_manager::{check_proxy, list_proxy, start_proxy, stop_proxy, ProxyManager};

#[derive(Debug, Clone, Serialize)]
pub struct ChromeInstance {
    pub pid: u32,
    pub user_dir: String,
    pub port: u16,
    pub os: String,
    pub proxy: Option<String>,
}

#[derive(Clone, Serialize)]
struct ChromeStarted {
    user_dir: String,
    pid: u32,
}

#[derive(Clone, Serialize)]
struct ChromeStoped {
    pid: u32,
    proxy: Option<String>,
}

lazy_static::lazy_static! {
    static ref CHROME_INSTANCES: Arc<Mutex<HashMap<u32, ChromeInstance>>> = Arc::new(Mutex::new(HashMap::new()));
    static ref USED_PORTS: Arc<RwLock<HashSet<u16>>> = Arc::new(RwLock::new(HashSet::new()));
}

#[tauri::command]
async fn list_chrome_instances() -> Vec<ChromeInstance> {
    let instances = CHROME_INSTANCES.lock().await;
    let mut instances = instances.clone();
    instances.retain(|_, inst| is_process_running(inst.pid, inst.port));
    instances.values().cloned().collect()
}

fn is_port_open(port: u16) -> bool {
    TcpStream::connect(("127.0.0.1", port)).is_ok()
}

fn is_process_running(pid: u32, port: u16) -> bool {
    println!("Start check process with pid: {}, port: {}", pid, port);
    if cfg!(target_os = "windows") {
        let output = Command::new("tasklist")
            .args(["/FI", &format!("PID eq {}", pid)])
            .output()
            .expect("Failed to check process");
        let output_str = String::from_utf8_lossy(&output.stdout);
        output_str.contains(&pid.to_string()) && is_port_open(port)
    } else {
        let output = Command::new("ps")
            .args(["-p", &pid.to_string()])
            .output()
            .expect("Failed to check process");
        output.status.success() && is_port_open(port)
    }
}

async fn wait_for_chrome_start(port: u16) -> bool {
    loop {
        match TokioTcpStream::connect(format!("127.0.0.1:{}", port)).await {
            Ok(_) => {
                println!("Chrome Started, port: {} used.", port);
                return true;
            }
            Err(_) => {
                println!("Waiting Chrome launching...");
                sleep(Duration::from_millis(100)).await;
            }
        }
    }
}

async fn monitor_chrome(
    window: Window,
    user_dir: String,
    pid: u32,
    port: u16,
    proxy: Option<String>,
) {
    let chrome_instances = CHROME_INSTANCES.clone();
    println!("Listening chrome open port: {}", port);
    if !wait_for_chrome_start(port).await {
        println!("Chrome (PID: {}) port occupied.", pid);
        chrome_instances.lock().await.remove(&pid);
        window
            .emit("chrome-closed", ChromeStoped { pid, proxy })
            .unwrap();
        return;
    }
    println!("Chrome port: {} opened, start monitor...", port);
    let _ = window.emit("chrome-started", ChromeStarted { user_dir, pid });
    loop {
        if !is_port_open(port) {
            println!("Chrome (PID: {}) closed.", pid);
            chrome_instances.lock().await.remove(&pid);
            window
                .emit("chrome-closed", ChromeStoped { pid, proxy })
                .unwrap();
            break;
        }
        sleep(Duration::from_secs(1)).await;
    }
}

fn find_available_port(start: u16) -> Option<u16> {
    let mut port = start;
    loop {
        if let Ok(listener) = TcpListener::bind(("127.0.0.1", port)) {
            let mut used_ports = USED_PORTS.write().unwrap();
            if !used_ports.contains(&port) {
                println!("Port: {} is available and bound.", port);
                used_ports.insert(port);
                drop(listener);
                return Some(port);
            }
            drop(listener);
        }
        port += 1;
        if port == 65535 {
            return None;
        }
    }
}

#[tauri::command]
async fn launch_chrome(
    window: Window,
    user_dir: String,
    proxy: Option<String>,
) -> Result<String, String> {
    let port = find_available_port(9223).ok_or("No port useable")?;
    println!("Find avaliable port: {}", port);
    let (chrome_path, os) = if cfg!(target_os = "windows") {
        (
            "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
            "Windows".to_string(),
        )
    } else if cfg!(target_os = "macos") {
        (
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "Mac".to_string(),
        )
    } else {
        return Err("Os not supported".to_string());
    };
    let mut args = vec![
        format!("--user-data-dir={}", user_dir),
        format!("--remote-debugging-port={}", port),
        format!(
            "--window-name={}",
            Path::new(&user_dir)
                .file_name()
                .and_then(|s| s.to_str())
                .unwrap()
        ),
        "--no-first-run".to_string(),
        "--hide-crash-restore-bubble".to_string(),
    ];
    if proxy.is_some() {
        args.push(format!("--proxy-server={}", proxy.as_ref().unwrap()));
    }
    let mut cmd = Command::new(chrome_path);
    cmd.args(&args);
    match cmd.spawn() {
        Ok(child) => {
            let pid = child.id();
            let instance = ChromeInstance {
                pid,
                user_dir: user_dir.clone(),
                port,
                os: os.clone(),
                proxy: if proxy.is_some() {
                    Some(proxy.clone().unwrap()[9..].to_string())
                } else {
                    None
                },
            };
            CHROME_INSTANCES.lock().await.insert(pid, instance);
            task::spawn(monitor_chrome(
                window.clone(),
                user_dir.clone(),
                pid,
                port,
                proxy,
            ));
            Ok(format!(
                "Launch chrome success, PORT: {}, PID: {}, OS: {}",
                port, pid, os
            ))
        }
        Err(e) => Err(format!("Chrome launch failed: {}", e)),
    }
}

#[tauri::command]
async fn close_chrome(pid: u32) -> Result<String, String> {
    let instance = {
        let mut instances = CHROME_INSTANCES.lock().await;
        instances.remove(&pid)
    };
    match instance {
        Some(instance) => {
            println!("Attempting to close Chrome with PID: {}", pid);
            let result = if instance.os == "Windows" {
                println!("Window kill");
                Command::new("taskkill")
                    .args(["/PID", &pid.to_string(), "/F"])
                    .output()
            } else {
                println!("Mac kill");
                Command::new("kill").args(["-9", &pid.to_string()]).output()
            };
            match result {
                Ok(_) => {
                    {
                        let mut used_ports = USED_PORTS.write().unwrap();
                        used_ports.remove(&instance.port);
                    }
                    Ok(format!(
                        "Close Chrome success, PID: {}, OS: {}",
                        pid, instance.os
                    ))
                }
                Err(e) => Err(format!("Close Chrome failed: {}", e)),
            }
        }
        None => Err("Instance not found".to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let manager = ProxyManager::default();
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(
                    "sqlite:shadow.db",
                    vec![Migration {
                        version: 1,
                        description: "table init",
                        sql: include_str!("../migrations/1.sql"),
                        kind: MigrationKind::Up,
                    }],
                )
                .build(),
        )
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            launch_chrome,
            close_chrome,
            list_chrome_instances,
            check_proxy,
            start_proxy,
            stop_proxy,
            list_proxy
        ])
        .manage(manager)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
