// api.js
export async function api(url, method = "GET", data = null, token = null) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : null,
  });

  if (!response.ok) {
    throw new Error("Error en la petición");
  }

  return await response.json();
}
