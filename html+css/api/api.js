const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:3000"
  : "https://tripwise-vx0k.onrender.com";

/* Determines the user role based on the current page URL. */
function _getRoleFromPage() {
  const page = window.location.pathname.split("/").pop();
  if (page.startsWith("admin"))            return "admin";
  if (page.startsWith("localcommunities")) return "community";
  if (page.startsWith("community"))        return "community";
  return "traveller";
}

/* Returns the correct localStorage key based on user role. */

function _tokenKey(role) {
  const r = role || _getRoleFromPage();
  if (r === "admin")     return "tripwise_token_admin";
  if (r === "community") return "tripwise_token_community";
  return "tripwise_token_traveller";
}

/* Stores the authentication token in localStorage. */
function setToken(token, role) {
  localStorage.setItem(_tokenKey(role), token);
}

function getToken() {
  return localStorage.getItem(_tokenKey());
}

function clearToken() {
  localStorage.removeItem(_tokenKey());
}

async function apiFetch(path, options = {}) {
  const token = getToken();

  // Default headers for JSON communication
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Send request to backend API
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