import type { ApiResponse } from "@mizan/shared";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";
const TOKEN_STORAGE_KEY = "mizan_auth_token";

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
    const message = !payload.success
      ? payload.error.message
      : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload.data;
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
    xhr.timeout = 45_000;

    const token = getStoredToken();
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (!onProgress || !event.lengthComputable || event.total <= 0) return;
      onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };

    xhr.onerror = () => reject(new Error("Voice upload failed. Check your connection and try again."));
    xhr.ontimeout = () => reject(new Error("Voice upload timed out. Try a shorter recording."));
    xhr.onload = () => {
      let payload: ApiResponse<T> | null = null;
      try {
        payload = JSON.parse(xhr.responseText) as ApiResponse<T>;
      } catch {
        reject(new Error("The server returned an unreadable voice response."));
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300 || !payload.success) {
        reject(new Error(!payload.success ? payload.error.message : "Voice request failed"));
        return;
      }
      resolve(payload.data);
    };

    xhr.send(body);
  });
}
