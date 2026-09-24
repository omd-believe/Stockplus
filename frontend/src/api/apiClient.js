/**
 * Small API client with Bearer token injection, error parsing, and 401 handling.
 */

export class ApiError extends Error {
  constructor(message, status, payload = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

let onUnauthorizedCallback = null;

export function setUnauthorizedHandler(callback) {
  onUnauthorizedCallback = callback;
}

const RAW_API_URL = import.meta.env.VITE_API_URL || '';
const BASE_URL = RAW_API_URL ? `${RAW_API_URL.replace(/\/$/, '')}/api` : '/api';

export async function request(path, options = {}) {
  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = sessionStorage.getItem('token');
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const config = {
    ...options,
    headers,
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch (err) {
    throw new ApiError('Unable to reach the server. Please check your connection.', 0);
  }

  if (response.status === 401) {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    if (typeof onUnauthorizedCallback === 'function') {
      onUnauthorizedCallback();
    }
    throw new ApiError('Session expired. Log in again.', 401);
  }

  // Parse JSON response body if present
  let data = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const message = data?.message || data?.error || `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, data);
  }

  return data;
}
