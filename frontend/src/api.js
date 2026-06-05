const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5050";
export default API_URL;

export async function getGoogleAuthUrl(token) {
  const res = await fetch(`${API_URL}/auth/google`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error("Failed to get Google auth URL");
  }
  return await res.json();
}

export async function previewGolfshotSync(token) {
  const res = await fetch(`${API_URL}/gmail/sync?dry_run=1`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return await res.json();
}

export async function doGolfshotSync(token) {
  const res = await fetch(`${API_URL}/gmail/sync`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return await res.json();
}
