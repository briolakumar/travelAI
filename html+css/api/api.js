const API_BASE = "http://localhost:3000";

function setToken(token) {
  localStorage.setItem("tripwise_token", token);
}

function getToken() {
  return localStorage.getItem("tripwise_token");
}

function clearToken() {
  localStorage.removeItem("tripwise_token");
  localStorage.removeItem("tripwise_role");
  localStorage.removeItem("tripwise_name");
}

async function apiFetch(path, options = {}) {
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : { message: await response.text() };

  if (!response.ok) {
    throw new Error(data.message || data.error || "Request failed");
  }

  return data;
}