import { ENDPOINTS } from './config.js';

const errorDiv = document.getElementById('error');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

function showError(message) {
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  setTimeout(() => {
    errorDiv.style.display = 'none';
  }, 5000);
}

async function handleAuth(action, username, password) {
  try {
    const response = await fetch(ENDPOINTS.AUTH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action, username, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Authentication failed');
    }

    // Store user info
    const userInfo = {
      id: data.user.id,
      username: data.user.username
    };

    // Store in memory (sessionStorage alternative)
    window.currentUser = userInfo;

    // Also use a cookie for persistence
    document.cookie = `user=${JSON.stringify(userInfo)}; path=/; max-age=86400`;

    // Redirect to chat
    window.location.href = '/index.html';
  } catch (error) {
    showError(error.message);
  }
}

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (username.length < 3) {
      showError('Username must be at least 3 characters');
      return;
    }

    if (password.length < 6) {
      showError('Password must be at least 6 characters');
      return;
    }

    await handleAuth('login', username, password);
  });
}

if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (username.length < 3) {
      showError('Username must be at least 3 characters');
      return;
    }

    if (password.length < 6) {
      showError('Password must be at least 6 characters');
      return;
    }

    await handleAuth('register', username, password);
  });
}