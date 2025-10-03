export const API_BASE = window.location.origin;

export const ENDPOINTS = {
  AUTH: `${API_BASE}/api/auth`,
  MESSAGES: `${API_BASE}/api/messages`
};

export const POLL_INTERVAL = 2000; // Poll for new messages every 2 seconds