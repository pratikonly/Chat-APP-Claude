import { ENDPOINTS, POLL_INTERVAL, USERS_POLL_INTERVAL } from './config.js';

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
if (!currentUser || !currentUser.id || !currentUser.username) {
  console.log('No valid user found, redirecting to login');
  window.location.href = '/login.html';
  throw new Error('Not authenticated'); // Stop execution
}

// DOM elements
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const logoutBtn = document.getElementById('logoutBtn');
const currentUserSpan = document.getElementById('currentUser');
const onlineUsersContainer = document.getElementById('onlineUsers');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');

// Set current user display
currentUserSpan.textContent = `@${currentUser.username}`;
document.getElementById('settingsUsername').textContent = currentUser.username;
document.getElementById('settingsUserId').textContent = currentUser.id;

let lastMessageId = 0;
let pollingInterval;
let usersPollingInterval;

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

function getInitials(username) {
  return username.substring(0, 2).toUpperCase();
}

function createMessageElement(msg) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${msg.user_id === currentUser.id ? 'own' : ''}`;
  messageDiv.dataset.timestamp = msg.created_at;
  
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

function createUserElement(user, isCurrent) {
  const userDiv = document.createElement('div');
  userDiv.className = `user-item ${isCurrent ? 'current-user' : ''}`;
  
  const avatar = document.createElement('div');
  avatar.className = 'user-avatar';
  avatar.textContent = getInitials(user.username);
  
  const infoDiv = document.createElement('div');
  infoDiv.className = 'user-info-text';
  
  const nameSpan = document.createElement('span');
  nameSpan.className = 'user-name';
  nameSpan.textContent = user.username;
  
  const statusDiv = document.createElement('div');
  statusDiv.className = 'user-status';
  
  const dot = document.createElement('span');
  dot.className = 'status-dot';
  
  const statusText = document.createElement('span');
  statusText.textContent = isCurrent ? 'You' : 'Online';
  
  statusDiv.appendChild(dot);
  statusDiv.appendChild(statusText);
  
  infoDiv.appendChild(nameSpan);
  infoDiv.appendChild(statusDiv);
  
  userDiv.appendChild(avatar);
  userDiv.appendChild(infoDiv);
  
  return userDiv;
}

async function loadOnlineUsers() {
  try {
    const response = await fetch(ENDPOINTS.USERS);
    const data = await response.json();

    if (data.users) {
      onlineUsersContainer.innerHTML = '';
      
      // Always show current user first
      const currentUserElement = createUserElement({ username: currentUser.username }, true);
      onlineUsersContainer.appendChild(currentUserElement);
      
      // Show other users
      const otherUsers = data.users.filter(u => u.user_id !== currentUser.id);
      otherUsers.forEach(user => {
        const userElement = createUserElement(user, false);
        onlineUsersContainer.appendChild(userElement);
      });

      if (otherUsers.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.style.cssText = 'padding: 20px; text-align: center; color: #666; font-size: 13px;';
        emptyMsg.textContent = 'No other users online';
        onlineUsersContainer.appendChild(emptyMsg);
      }
    }
  } catch (error) {
    console.error('Error loading online users:', error);
  }
}

async function loadMessages(initial = false) {
  try {
    const url = initial 
      ? ENDPOINTS.MESSAGES 
      : `${ENDPOINTS.MESSAGES}?since=${lastMessageId}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
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
    if (initial) {
      messagesContainer.innerHTML = '<div class="loading">Error loading messages. Please refresh.</div>';
    }
  }
}

async function sendMessage() {
  const message = messageInput.value.trim();
  
  if (!message) return;

  sendBtn.disabled = true;
  const originalText = sendBtn.textContent;
  sendBtn.textContent = 'Sending...';
  
  try {
    console.log('Sending message:', { userId: currentUser.id, username: currentUser.username, message });
    
    const response = await fetch(ENDPOINTS.MESSAGES, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: currentUser.id,
        username: currentUser.username,
        message: message
      })
    });

    const responseText = await response.text();
    console.log('Response status:', response.status);
    console.log('Response text:', responseText);

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Server error: ${response.status} - ${responseText}`);
      }
      throw new Error(errorData.error || errorData.details || 'Failed to send message');
    }

    messageInput.value = '';
    
    // Immediately load new messages
    await loadMessages();
  } catch (error) {
    console.error('Error sending message:', error);
    alert(`Failed to send message: ${error.message}`);
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = originalText;
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

settingsBtn.addEventListener('click', () => {
  settingsModal.style.display = 'flex';
});

if (menuToggle) {
  menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });
}

// Close settings modal when clicking outside
settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) {
    settingsModal.style.display = 'none';
  }
});

// Initial load
console.log('Starting initial load for user:', currentUser);
loadMessages(true);
loadOnlineUsers();

// Start polling for new messages
pollingInterval = setInterval(() => {
  loadMessages(false);
}, POLL_INTERVAL);

// Start polling for online users
usersPollingInterval = setInterval(() => {
  loadOnlineUsers();
}, USERS_POLL_INTERVAL);

// Update timestamps every minute
setInterval(() => {
  const timeSpans = document.querySelectorAll('.message-time');
  const messages = document.querySelectorAll('.message');
  messages.forEach((messageEl, index) => {
    const timestamp = messageEl.dataset.timestamp;
    if (timestamp && timeSpans[index]) {
      timeSpans[index].textContent = formatTime(timestamp);
    }
  });
}, 60000);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (pollingInterval) clearInterval(pollingInterval);
  if (usersPollingInterval) clearInterval(usersPollingInterval);
});
