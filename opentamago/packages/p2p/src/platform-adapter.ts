export interface PlatformAdapter {
  getDeviceId(): string;
  getDeviceName(): string;
  getPlatform(): string;
  getOS(): string;
  getAppVersion(): string;
  getScreenInfo(): { width: number; height: number; scale: number };
}

// Shared helpers reusable by browser-based adapters
export function getOSFromUserAgent(): string {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "iOS";
  if (ua.includes("Android")) return "Android";
  if (/Mac OS X|Macintosh/.test(ua)) return "macOS";
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Linux")) return "Linux";
  if (ua.includes("CrOS")) return "ChromeOS";
  return navigator.platform;
}

export function getBrowserName(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari")) return "Safari";
  return "Browser";
}

/**
 * Generic device-ID persistence. Callers supply a thin storage interface so
 * this works with localStorage, SecureStore, etc.
 */
const DEVICE_ID_KEY = "opentamago-device-id";

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

let cachedDeviceId: string | null = null;

export function getOrCreateDeviceId(storage: {
  get(key: string): string | null;
  set(key: string, value: string): void;
}): string {
  if (cachedDeviceId) return cachedDeviceId;
  let id = storage.get(DEVICE_ID_KEY);
  if (!id) {
    id = generateUUID();
    storage.set(DEVICE_ID_KEY, id);
  }
  cachedDeviceId = id;
  return id;
}
