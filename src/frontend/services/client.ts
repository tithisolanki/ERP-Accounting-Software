export const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5000';

export const getHeaders = (token: string) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`
});

export async function apiFetch<T>(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...getHeaders(token), ...(options.headers as Record<string, string> | undefined) }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed: ${path}`);
  }
  return data as T;
}

export async function apiFetchRaw(path: string, token: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...getHeaders(token), ...(options.headers as Record<string, string> | undefined) }
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || `Request failed: ${path}`);
  }
  return res;
}
