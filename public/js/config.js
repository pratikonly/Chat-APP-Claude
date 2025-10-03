export const API_BASE = window.location.origin;

export const ENDPOINTS = {
  AUTH: `${API_BASE}/api/auth`,
  MESSAGES: `${API_BASE}/api/messages`,
  USERS: `${API_BASE}/api/users`
};

export const POLL_INTERVAL = 2000; // Poll for new messages every 2 seconds
export const USERS_POLL_INTERVAL = 5000; // Poll for online users every 5 seconds
