const DEFAULT_API_URL = "http://localhost:8000";

export async function submitCase(payload) {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;
  const response = await fetch(`${baseUrl}/cases`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Request failed (${response.status}): ${text}`);
  }

  return response.json();
}
