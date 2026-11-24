import type { ApiResponse } from "@mizan/shared";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";
const TOKEN_STORAGE_KEY = "mizan_auth_token";

export class ApiClientError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, code = "REQUEST_FAILED", details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.details = details;
  }
}

export function isInsufficientCredits(err: unknown): err is ApiClientError {
  return err instanceof ApiClientError && err.code === "INSUFFICIENT_CREDITS";
}

export function creditDetails(err: unknown): { required: number; available: number } | null {
  if (!isInsufficientCredits(err) || !err.details || typeof err.details !== "object") {
    return null;
  }
  const details = err.details as { required?: unknown; available?: unknown };
  const required = typeof details.required === "number" ? details.required : 0;
  const available = typeof details.available === "number" ? details.available : 0;
  return { required, available };
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !payload.success) {
    if (!payload.success) {
      throw new ApiClientError(payload.error.message, payload.error.code, payload.error.details);
    }
    throw new ApiClientError(`Request failed with status ${response.status}`);
  }

  return payload.data;
}

export async function downloadCsv(path: string, filename: string): Promise<void> {
  const token = getStoredToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, {
    headers,
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`Export failed with status ${response.status}`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function fetchAuthenticatedBlob(path: string): Promise<Blob> {
  const token = getStoredToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE}${path}`, {
    headers,
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`Could not load the file (${response.status})`);
  }
  return response.blob();
}

export function apiUpload<T>(
  path: string,
  body: FormData,
  onProgress?: (percent: number) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}${path}`);
    xhr.withCredentials = true;
    xhr.timeout = 90_000;

    const token = getStoredToken();
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (!onProgress || !event.lengthComputable || event.total <= 0) return;
      onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };

    xhr.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
    xhr.ontimeout = () => reject(new Error("Upload timed out. Try again with a smaller photo or shorter recording."));
    xhr.onload = () => {
      let payload: ApiResponse<T> | null = null;
      try {
        payload = JSON.parse(xhr.responseText) as ApiResponse<T>;
      } catch {
        reject(new Error("The server returned an unreadable response."));
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300 || !payload.success) {
        if (payload && !payload.success) {
          reject(new ApiClientError(payload.error.message, payload.error.code, payload.error.details));
          return;
        }
        reject(new ApiClientError("Upload request failed"));
        return;
      }
      resolve(payload.data);
    };

    xhr.send(body);
  });
}
