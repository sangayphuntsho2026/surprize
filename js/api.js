async function api(url, method = "GET", body) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

// finds an input by id first, then by name
function val(key) {
  const el = document.getElementById(key) || document.querySelector(`[name="${key}"]`);
  return el ? el.value : "";
}

// used by profile.html
const API = {
  me: () => api("/api/auth/me"),
  updateProfile: data => api("/api/auth/profile", "PUT", data),
  changePassword: (cur, n1) =>
    api("/api/auth/password", "PATCH", { currentPassword: cur, newPassword: n1 }),
  logout: () => api("/api/auth/logout", "POST")
};