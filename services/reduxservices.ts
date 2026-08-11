// services/reduxservices.ts
const getApiBaseUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/";
  const clean = envUrl.replace(/['"]+/g, "").trim();
  return clean.endsWith("/") ? clean : `${clean}/`;
};

const buildFullUrl = (url: string): string => {
  const baseUrl = getApiBaseUrl();
  const cleanPath = url.startsWith("/") ? url.slice(1) : url;
  return `${baseUrl}${cleanPath}`;
};

// Drops undefined/null/"" values so they never get serialized as the
// literal string "undefined" in the query string (URLSearchParams would
// otherwise happily stringify a JS `undefined` value into "undefined").
const cleanQueryParams = (
  params?: Record<string, string | number | undefined | null>
): Record<string, string> => {
  const out: Record<string, string> = {};
  if (!params) return out;
  for (const key in params) {
    const value = params[key];
    if (value !== undefined && value !== null && value !== "") {
      out[key] = String(value);
    }
  }
  return out;
};

const handleResponse = async (response: Response) => {
  const rawText = await response.text();

  let data;

  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    if (rawText.trim().startsWith("<!DOCTYPE") || rawText.trim().startsWith("<html")) {
      throw new Error(
        `Server returned HTML instead of JSON (${response.status} ${response.statusText}). Please check backend API server running.`
      );
    }
    throw new Error("Failed to parse JSON response.");
  }

  return {
    success: response.ok,
    data: response.ok ? data : null,
    error: !response.ok
      ? {
          message:
            data?.message ||
            data?.error?.message ||
            `HTTP ${response.status}: Something went wrong`,
        }
      : null,
  };
};

const refreshAccessToken = async () => {
  if (typeof window === "undefined") return null;

  const refreshToken = localStorage.getItem("refreshToken");

  if (!refreshToken) return null;

  try {
    const res = await fetch(buildFullUrl("user/refresh-token"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });

    const json = await res.json();

    if (res.ok && json?.data?.accessToken) {
      localStorage.setItem("token", json.data.accessToken);
      return json.data.accessToken;
    }

    return null;
  } catch (error) {
    console.error("Refresh token error:", error);
    return null;
  }
};

export const reduxApiClient = {
  request: async (
    method: string,
    url: string,
    body?: any,
    includeToken = true,
    isFileUpload = false
  ) => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("token")
        : null;

    const headers: Record<string, string> = {};

    if (includeToken && token) {
      headers.Authorization = `Bearer ${token}`;
    }

    if (!isFileUpload) {
      headers["Content-Type"] = "application/json";
    }

    const options: RequestInit = {
      method,
      headers,
      ...(body
        ? {
            body: isFileUpload ? body : JSON.stringify(body),
          }
        : {}),
    };

    const fullUrl = buildFullUrl(url);
    let response = await fetch(fullUrl, options);

    if (response.status === 401 && includeToken) {
      const newToken = await refreshAccessToken();

      if (newToken) {
        (options.headers as Record<string, string>).Authorization =
          `Bearer ${newToken}`;

        response = await fetch(fullUrl, options);
      }
    }

    return handleResponse(response);
  },

  get: (
    url: string,
    params?: Record<string, string | number | undefined | null>,
    includeToken = true
  ) => {
    const clean = cleanQueryParams(params);
    const query = Object.keys(clean).length
      ? `?${new URLSearchParams(clean).toString()}`
      : "";

    return reduxApiClient.request("GET", `${url}${query}`, undefined, includeToken);
  },

  post: (url: string, body?: any, includeToken = true) =>
    reduxApiClient.request("POST", url, body, includeToken),

  put: (url: string, body?: any, includeToken = true) =>
    reduxApiClient.request("PUT", url, body, includeToken),

  patch: (url: string, body?: any, includeToken = true) =>
    reduxApiClient.request("PATCH", url, body, includeToken),

  delete: (url: string, includeToken = true) =>
    reduxApiClient.request("DELETE", url, undefined, includeToken),

  postFile: (url: string, formData: FormData) =>
    reduxApiClient.request("POST", url, formData, true, true),
};