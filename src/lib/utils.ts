import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { exists, remove, mkdir, BaseDirectory } from "@tauri-apps/plugin-fs";
import * as path from "@tauri-apps/api/path";
import { ProfileType } from "./types";
import { invoke } from "@tauri-apps/api/core";
import { load } from "@tauri-apps/plugin-store";
import { type } from "@tauri-apps/plugin-os";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const proxyRegex =
  /^(http|socks5):\/\/(?:([\w-]+):([\w-]+)@)?([\w.-]+):(\d{1,5})$/;

export const validateProxy = (proxy: string) => {
  const match = proxy.match(proxyRegex);
  if (!match) {
    return { valid: false, error: "Invalid proxy format" };
  }
  const protocol = match[1];
  const username = match[2] || null;
  const password = match[3] || null;
  const host = match[4];
  const port = parseInt(match[5], 10);
  if (port < 1 || port > 65535) {
    return { valid: false, error: "Invalid port range" };
  }
  return {
    valid: true,
    protocol,
    username,
    password,
    host,
    port,
  };
};

export const stripCredentials = (proxy: string): string | "" => {
  const match = proxy.match(proxyRegex);
  if (!match) {
    return "";
  }
  const protocol = match[1];
  const host = match[4];
  const port = match[5];
  return `${protocol}://${host}:${port}`;
};

export const generateUniqueProfileName = (
  count: number,
  length: number = 6
) => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const names = [];
  for (let i = 0; i < count; i++) {
    let uniqueName = "";
    for (let j = 0; j < length; j++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      uniqueName += chars[randomIndex];
    }
    names.push(uniqueName);
  }
  return names;
};

export const getUserDir = async (name: string) => {
  const appDir = await path.appDataDir();
  return `${appDir}/profiles/${name}`;
};

export const createLocalProfile = async (profileName: string) => {
  const pathExist = await exists(`profiles`, {
    baseDir: BaseDirectory.AppData,
  });
  console.log({ pathExist });
  if (!pathExist) {
    await mkdir(`profiles`, { baseDir: BaseDirectory.AppData });
  }
  await mkdir(`profiles/${profileName}`, { baseDir: BaseDirectory.AppData });
};

export const createBulkProfiles = async (profileNames: string[]) => {
  for (const name of profileNames) {
    await createLocalProfile(name);
  }
};

export const removeLocalProfile = async (profileName: string) => {
  const profileExist = await exists(`profiles/${profileName}`, {
    baseDir: BaseDirectory.AppData,
  });
  if (profileExist) {
    await remove(`profiles/${profileName}`, {
      baseDir: BaseDirectory.AppData,
      recursive: true,
    });
  }
};

export const removeBulkProfiles = async (profileNames: string[]) => {
  for (const name of profileNames) {
    await removeLocalProfile(name);
  }
};

export function getLastNameFromPath(path: string) {
  const normalizedPath = path.replace(/\\/g, "/");
  const parts = normalizedPath.split("/");
  const filteredParts = parts.filter((part) => part !== "");
  return filteredParts.pop();
}

export async function launchChromeWithProfile(
  profile: ProfileType,
  onOpenFailed: (name: string) => void,
  port?: number
) {
  const userDir = await getUserDir(profile.name);
  console.log("Start to open profile: ", profile, userDir);
  let validProxy = false;
  let proxyInfo;
  if (profile.proxy_name) {
    proxyInfo = validateProxy(profile.proxy_name);
    validProxy = proxyInfo.valid;
  }
  let socks5 = "";
  if (validProxy && proxyInfo) {
    try {
      const auth =
        proxyInfo.username && proxyInfo.password
          ? { user: proxyInfo.username, pass: proxyInfo.password }
          : undefined;
      socks5 = await invoke("start_proxy", {
        proxy: { ip: proxyInfo.host, port: proxyInfo.port, auth },
      });
      console.log({ socks5 });
    } catch (error) {
      onOpenFailed(profile.name);
      console.log(`Start proxy error: ${error}`);
      return;
    }
  }
  let win_chrome_path;
  const osType = await type();
  const isWin = osType == "windows";
  if (isWin) {
    const store = await load("settings.json");
    win_chrome_path = await store.get("chrome_path");
  }
  invoke("launch_chrome", {
    id: profile.id,
    userDir,
    port,
    proxy: socks5 ? `socks5://${socks5}` : undefined,
    win_chrome_path,
  })
    .then(console.log)
    .catch(console.error);
}
