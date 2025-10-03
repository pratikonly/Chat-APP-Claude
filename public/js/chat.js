import { ENDPOINTS, POLL_INTERVAL } from './config.js';

// Get user info from cookie
function getUserFromCookie() {
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'user') {
      try {
        return JSON.parse(decodeURIComponent(value));
      } catch {
        return null;
      }
    }
  }
  return null;
}

const currentUser = window.currentUser || getUserFromCookie();

// Redirect if not logged in
if (!currentUser) {
  window.location.href = '/login.html';
}

const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const logoutBtn = document.getElementById('logoutBtn');
const currentUserSpan = document.getElementById('currentUser');

currentUserSpan.textContent = `@${currentUser.username}`;

let lastMessageId = 0;
let pollingInterval;

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return date.toLocaleDateString();
}

function createMessageElement(msg) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${msg.user_id === currentUser.id ? 'own' : ''}`;

  const headerDiv = document.createElement('div');
  headerDiv.className = 'message-header';

  const usernameSpan = document.createElement('span');
  usernameSpan.className = 'message-username';
  usernameSpan.textContent = msg.username;

  const timeSpan = document.createElement('span');
  timeSpan.className = 'message-time';
  timeSpan.textContent = formatTime(msg.created_at);

  headerDiv.appendChild(usernameSpan);
  headerDiv.appendChild(timeSpan);

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.textContent = msg.message;

  messageDiv.appendChild(headerDiv);
  messageDiv.appendChild(contentDiv);

  return messageDiv;
}

async function loadMessages(initial = false) {
  try {
    const url = initial 
      ? ENDPOINTS.MESSAGES 
      : `${ENDPOINTS.MESSAGES}?since=${lastMessageId}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.messages && data.messages.length > 0) {
      if (initial) {
        messagesContainer.innerHTML = '';
      }

      data.messages.forEach(msg => {
        const messageEl = createMessageElement(msg);
        messagesContainer.appendChild(messageEl);
        lastMessageId = Math.max(lastMessageId, msg.id);
      });

      // Scroll to bottom
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } else if (initial) {
      messagesContainer.innerHTML = '<div class="loading">No messages yet. Start the conversation!</div>';
    }
  } catch (error) {
    console.error('Error loading messages:', error);
  }
}

async function sendMessage() {
  const message = messageInput.value.trim();

  if (!message) return;

  sendBtn.disabled = true;

  try {
    const response = await fetch(ENDPOINTS.MESSAGES, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: currentUser.id,
        username: currentUser.username,
        message
      })
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    messageInput.value = '';

    // Immediately load new messages
    await loadMessages();
  } catch (error) {
    console.error('Error sending message:', error);
    alert('Failed to send message. Please try again.');
  } finally {
    sendBtn.disabled = false;
    messageInput.focus();
  }
}

function logout() {
  // Clear cookie
  document.cookie = 'user=; path=/; max-age=0';
  window.currentUser = null;
  window.location.href = '/login.html';
}

// Event listeners
sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

logoutBtn.addEventListener('click', logout);

// Initial load
loadMessages(true);

// Start polling for new messages
pollingInterval = setInterval(() => {
  loadMessages(false);
}, POLL_INTERVAL);

// Update timestamps every minute
setInterval(() => {
  const timeSpans = document.querySelectorAll('.message-time');
  timeSpans.forEach((span, index) => {
    const messages = Array.from(messagesContainer.querySelectorAll('.message'));
    if (messages[index]) {
      const messageEl = messages[index];
      const timestamp = messageEl.dataset.timestamp;
      if (timestamp) {
        span.textContent = formatTime(timestamp);
      }
    }
  });
}, 60000);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
});