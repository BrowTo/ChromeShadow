use serde::{Deserialize, Serialize};
use std::fmt::Display;
use std::io::{copy, Error, Read, Result, Write};
use std::net::{SocketAddr, TcpListener, TcpStream};
use std::str::FromStr;
use std::sync::atomic::AtomicI16;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::State;
use tokio::sync::Mutex as TokioMutex;

#[derive(Debug, Clone, Hash, Eq, PartialEq, Serialize, Deserialize)]
pub struct ProxyAuth {
    pub user: String,
    pub pass: String,
}

#[derive(Debug, Clone, Hash, Eq, PartialEq, Serialize, Deserialize)]
pub struct Proxy {
    pub ip: String,
    pub port: u16,
    pub auth: Option<ProxyAuth>,
}

#[derive(Debug, Clone, Hash, Eq, PartialEq, Serialize, Deserialize)]
pub struct ProxyStatus {
    pub is_working: bool,
    pub latency: Duration,
}

impl FromStr for Proxy {
    type Err = String;
    fn from_str(s: &str) -> std::result::Result<Self, Self::Err> {
        let parts: Vec<&str> = s.split(":").collect();
        if parts.len() < 2 {
            return Err("Invalid proxy string".to_string());
        }
        let uri = parts[0].parse().expect("Invalid proxy IP");
        let port = parts[1].parse().expect("Invalid proxy port");
        if parts.len() == 2 {
            return Ok(Proxy {
                ip: uri,
                port,
                auth: None,
            });
        }
        let user = parts[2].parse().expect("Invalid proxy user");
        let pass = parts[3].parse().expect("Invalid proxy pass");
        Ok(Proxy {
            ip: uri,
            port,
            auth: Some(ProxyAuth { user, pass }),
        })
    }
}

impl Display for Proxy {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let str = match &self.auth {
            Some(auth) => format!("{}:{}:{}:{}", self.ip, self.port, auth.user, auth.pass),
            None => format!("{}:{}", self.ip, self.port),
        };
        write!(f, "{}", str)
    }
}

const SOCKS_VERSION: u8 = 0x05;
const AUTHENTICATION_VERSION: u8 = 0x01;

#[derive(Debug, Clone, Serialize)]
pub struct ProxyServer {
    addr: SocketAddr,
    proxy: Arc<Mutex<Proxy>>,
    should_stop: Arc<Mutex<bool>>,
}

impl ProxyServer {
    pub fn new_with_proxy(port: i16, proxy: Proxy) -> Result<ProxyServer> {
        let addr = format!("127.0.0.1:{port}").parse().unwrap();
        Ok(ProxyServer {
            addr,
            proxy: Arc::new(Mutex::new(proxy)),
            should_stop: Arc::new(Mutex::new(false)),
        })
    }

    fn remote(proxy: Proxy) -> Result<TcpStream> {
        // create a connection
        let proxy_url = format!("{}:{}", proxy.ip, proxy.port);
        let mut remote_stream = TcpStream::connect(proxy_url).map_err(|e| {
            Error::new(
                std::io::ErrorKind::Other,
                format!("Failed to connect to proxy: {}", e),
            )
        })?;

        // greeting header
        remote_stream.write_all(&[
            SOCKS_VERSION,                                  // SOCKS version
            0x01,                                           // Number of authentication methods
            if proxy.auth.is_none() { 0x00 } else { 0x02 }, // Username/password authentication
        ])?;

        // Receive the servers reply
        let mut buffer: [u8; 2] = [0; 2];
        remote_stream.read_exact(&mut buffer)?;

        // Check the SOCKS version
        if buffer[0] != SOCKS_VERSION {
            return Err(Error::new(
                std::io::ErrorKind::Other,
                format!("Server does not support socks version: {}", SOCKS_VERSION),
            ));
        }
        if proxy.auth.is_none() {
            if buffer[1] != 0x00 {
                // Check the authentication method
                return Err(Error::new(
                    std::io::ErrorKind::Other,
                    "Server does not support no authentication",
                ));
            }
        } else {
            // Check the authentication method
            if buffer[1] != 0x02 {
                return Err(Error::new(
                    std::io::ErrorKind::Other,
                    "Server does not support username/password authentication",
                ));
            }

            let proxy_auth = proxy.auth.as_ref().unwrap();

            // Create a username/password negotiation request
            let username: &str = proxy_auth.user.as_str();
            let password: &str = proxy_auth.pass.as_str();

            let mut auth_request = vec![
                AUTHENTICATION_VERSION, // Username/password authentication version
            ];

            auth_request.push(username.len() as u8); // Username length
            auth_request.extend_from_slice(username.as_bytes());
            auth_request.push(password.len() as u8); // Password length
            auth_request.extend_from_slice(password.as_bytes());

            // Send the username/password negotiation request
            remote_stream.write_all(&auth_request)?;

            // Receive the username/password negotiation reply/welcome message
            let mut buffer: [u8; 2] = [0; 2];
            remote_stream.read_exact(&mut buffer)?;

            // Check the username/password authentication version
            if buffer[0] != AUTHENTICATION_VERSION {
                return Err(Error::new(
                    std::io::ErrorKind::Other,
                    format!(
                        "Unsupported username/password authentication version: {}",
                        buffer[0]
                    ),
                ));
            }

            // Check the username/password authentication status
            if buffer[1] != 0x00 {
                return Err(Error::new(
                    std::io::ErrorKind::Other,
                    "Username/password authentication failed",
                ));
            }
        }

        // Return the stream
        Ok(remote_stream)
    }

    fn client(mut local_stream: TcpStream, mut remote_stream: TcpStream) -> Result<()> {
        // greeting header
        let mut buffer: [u8; 2] = [0; 2];
        local_stream.read_exact(&mut buffer[..])?;
        let _version = buffer[0]; // should be the same as SOCKS_VERSION
        let number_of_methods = buffer[1];

        // authentication methods
        let mut methods: Vec<u8> = vec![];
        for _ in 0..number_of_methods {
            let mut next_method: [u8; 1] = [0; 1];
            local_stream.read_exact(&mut next_method[..])?;
            methods.push(next_method[0]);
        }

        // only accept no authentication
        if !methods.contains(&0x00) {
            // no acceptable methods were offered
            local_stream.write_all(&[SOCKS_VERSION, 0xFF])?;
            return Err(Error::new(
                std::io::ErrorKind::Other,
                "Method not supported",
            ));
        }

        // we choose no authentication
        local_stream.write_all(&[SOCKS_VERSION, 0x00])?;
        // clone our streams
        let mut incoming_local = local_stream.try_clone()?;
        let mut incoming_remote = remote_stream.try_clone()?;

        // copy the data from one to the other
        let handle_outgoing = thread::spawn(move || -> Result<()> {
            copy(&mut local_stream, &mut remote_stream)?;
            Ok(())
        });

        let handle_incoming = thread::spawn(move || -> Result<()> {
            copy(&mut incoming_remote, &mut incoming_local)?;
            Ok(())
        });

        _ = handle_outgoing.join();
        _ = handle_incoming.join();

        // The End.
        Ok(())
    }

    pub fn check_proxy(proxy: Proxy) -> Result<ProxyStatus> {
        let start = std::time::Instant::now();
        let mut remote = Self::remote(proxy.clone())?;
        let dest = "httpbin.org:80";
        remote.write_all(&[
            SOCKS_VERSION,    // SOCKS version
            0x01,             // Connect
            0x00,             // Reserved
            0x03,             // Domain name
            dest.len() as u8, // Domain name length
        ])?;
        remote.write_all(dest.as_bytes())?;
        remote.write_all(&[0x00, 0x50])?;
        let mut buffer: [u8; 10] = [0; 10];
        remote.read_exact(&mut buffer)?;
        let latency = start.elapsed();
        Ok(ProxyStatus {
            is_working: true,
            latency,
        })
    }

    // pub fn get_proxy(&self) -> Option<Proxy> {
    //     self.proxy.lock().map_or(None, |p| Some(p.clone()))
    // }

    pub fn get_addr(&self) -> SocketAddr {
        self.addr
    }

    pub fn start(&self) -> Result<()> {
        println!(
            "Starting proxy server on: {} | Proxy {}",
            self.addr,
            self.proxy.lock().unwrap().ip,
        );
        let server = TcpListener::bind(self.addr)?;
        for stream in server.incoming() {
            if *self.should_stop.lock().unwrap() {
                drop(server);
                break;
            }
            match stream {
                Ok(stream) => match self.proxy.lock() {
                    Ok(proxy) => {
                        let remote_stream: TcpStream = Self::remote(proxy.clone())?;
                        thread::spawn(move || match Self::client(stream, remote_stream) {
                            Ok(_) => {}
                            Err(e) => {
                                println!("Failed to handle client: {:?}", e);
                            }
                        });
                    }
                    Err(e) => {
                        println!("Failed to get proxy: {:?}", e);
                        continue;
                    }
                },
                Err(e) => {
                    println!("Failed to accept connection: {:?}", e);
                    return Err(e);
                }
            }
        }

        println!("Proxy server stopped on: {}", self.addr);
        Ok(())
    }

    pub fn stop(&self) -> Result<()> {
        *self.should_stop.lock().unwrap() = true;
        println!("Stopping proxy server on: {}", self.addr);
        let stream = TcpStream::connect(self.addr)?;
        drop(stream);
        Ok(())
    }
}

impl TryFrom<(i16, Proxy)> for ProxyServer {
    type Error = Error;
    fn try_from(value: (i16, Proxy)) -> Result<Self> {
        ProxyServer::new_with_proxy(value.0, value.1)
    }
}

impl TryFrom<(i16, String)> for ProxyServer {
    type Error = Error;
    fn try_from((port, proxy_str): (i16, String)) -> Result<Self> {
        let proxy =
            Proxy::from_str(&proxy_str).map_err(|e| Error::new(std::io::ErrorKind::Other, e))?;
        ProxyServer::try_from((port, proxy))
    }
}

#[derive(Debug)]
pub struct ProxyManager {
    servers: Arc<TokioMutex<Vec<ProxyServer>>>,
    port_seq: AtomicI16,
}

impl ProxyManager {
    pub fn default() -> Self {
        ProxyManager {
            servers: Arc::new(TokioMutex::new(Vec::new())),
            port_seq: AtomicI16::new(8090),
        }
    }

    pub async fn servers(&self) -> Vec<ProxyServer> {
        self.servers.lock().await.clone().to_vec()
    }

    pub async fn create_server(&self, proxy: Proxy) -> std::result::Result<SocketAddr, Error> {
        let port = self.port_seq.load(std::sync::atomic::Ordering::SeqCst);
        self.port_seq
            .fetch_add(1, std::sync::atomic::Ordering::SeqCst);
        let server = ProxyServer::new_with_proxy(port, proxy.clone())?;
        let server_addr = server.get_addr();
        let mut servers = self.servers.lock().await;
        servers.push(server.clone());
        tokio::spawn(async move { server.start() });
        Ok(server_addr)
    }

    pub async fn get_server_by_local_proxy(&self, proxy: &Proxy) -> Option<ProxyServer> {
        let servers = self.servers().await;
        for x in servers {
            let addr: SocketAddr = format!("{}:{}", proxy.ip, proxy.port).parse().unwrap();
            if addr.ip() == x.get_addr().ip() && addr.port() == x.get_addr().port() {
                return Some(x);
            }
        }
        None
    }

    pub async fn stop_server(&self, proxy: &Proxy) -> std::result::Result<(), Error> {
        let server = self.get_server_by_local_proxy(proxy).await;
        match server {
            Some(server) => {
                let addr = server.get_addr();
                let mut servers = self.servers.lock().await;
                servers.retain(|x| x.get_addr() != addr);
                server.stop()?;
                self.port_seq
                    .fetch_sub(1, std::sync::atomic::Ordering::SeqCst);
                Ok(())
            }
            None => Err(Error::new(
                std::io::ErrorKind::Other,
                "Server not found".to_string(),
            )),
        }
    }
}

#[tauri::command]
pub async fn start_proxy(
    proxy: Proxy,
    state: State<'_, ProxyManager>,
) -> std::result::Result<SocketAddr, String> {
    let manager = state.inner();
    match manager.create_server(proxy).await {
        Ok(addr) => Ok(addr),
        Err(e) => Err(format!("{}", e)),
    }
}

#[tauri::command]
pub async fn stop_proxy(
    proxy: Proxy,
    state: State<'_, ProxyManager>,
) -> std::result::Result<(), String> {
    match state.inner().stop_server(&proxy).await {
        Ok(()) => Ok(()),
        Err(e) => Err(format!("{}", e)),
    }
}

#[tauri::command]
pub async fn check_proxy(
    proxy: Proxy,
    _state: State<'_, ProxyManager>,
) -> std::result::Result<ProxyStatus, String> {
    match ProxyServer::check_proxy(proxy) {
        Ok(status) => Ok(status),
        Err(e) => Err(format!("{}", e)),
    }
}

#[tauri::command]
pub async fn list_proxy(
    state: State<'_, ProxyManager>,
) -> std::result::Result<Vec<ProxyServer>, String> {
    let proxies = state.inner().servers().await;
    Ok(proxies)
}
