// Auto-detect backend URL
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_URL = isLocal 
  ? 'http://localhost:5000/api'                    // local backend port 5000
  : 'https://chatbotnormal.onrender.com/api';      // production Render URL

let sessionId = localStorage.getItem('chatSessionId');
if (!sessionId) {
  sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('chatSessionId', sessionId);
}

// DOM elements
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendMessage');
const clearButton = document.getElementById('clearChat');
const typingIndicator = document.getElementById('typingIndicator');
const charCount = document.querySelector('.char-count');

// Theme toggle
const toggleTheme = document.getElementById('toggleTheme');
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
  document.body.setAttribute('data-theme', 'dark');
  toggleTheme.innerHTML = '<i class="fas fa-sun"></i>';
}
toggleTheme.addEventListener('click', () => {
  const currentTheme = document.body.getAttribute('data-theme');
  if (currentTheme === 'dark') {
    document.body.removeAttribute('data-theme');
    localStorage.setItem('theme', 'light');
    toggleTheme.innerHTML = '<i class="fas fa-moon"></i>';
  } else {
    document.body.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
    toggleTheme.innerHTML = '<i class="fas fa-sun"></i>';
  }
});

// Character count & auto-resize
messageInput.addEventListener('input', () => {
  charCount.textContent = `${messageInput.value.length}/500`;
  messageInput.style.height = 'auto';
  messageInput.style.height = messageInput.scrollHeight + 'px';
});

// Load history
async function loadChatHistory() {
  try {
    const response = await fetch(`${API_URL}/chat/history/${sessionId}`);
    const data = await response.json();
    if (data.messages && data.messages.length > 0) {
      chatMessages.innerHTML = '';
      data.messages.forEach(msg => addMessageToChat(msg.content, msg.role));
    }
  } catch (error) {
    console.error('Error loading history:', error);
  }
}

// Add message to chat
function addMessageToChat(message, role) {
  const welcomeMsg = document.querySelector('.welcome-message');
  if (welcomeMsg && chatMessages.children.length === 1) {
    welcomeMsg.style.display = 'none';
  }
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;
  messageDiv.innerHTML = `
    ${role === 'bot' ? '<div class="message-icon"><i class="fas fa-robot"></i></div>' : ''}
    <div class="message-content"><p>${escapeHtml(message)}</p></div>
    ${role === 'user' ? '<div class="message-icon"><i class="fas fa-user"></i></div>' : ''}
  `;
  chatMessages.appendChild(messageDiv);
  scrollToBottom();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Send message
async function sendMessage() {
  const message = messageInput.value.trim();
  if (!message) return;
  addMessageToChat(message, 'user');
  messageInput.value = '';
  charCount.textContent = '0/500';
  messageInput.style.height = 'auto';
  typingIndicator.style.display = 'flex';
  scrollToBottom();

  try {
    const response = await fetch(`${API_URL}/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sessionId })
    });
    const data = await response.json();
    typingIndicator.style.display = 'none';
    if (data.success) {
      addMessageToChat(data.response, 'bot');
    } else {
      addMessageToChat('Sorry, I encountered an error. Please try again.', 'bot');
    }
  } catch (error) {
    console.error('Error:', error);
    typingIndicator.style.display = 'none';
    addMessageToChat('Network error. Please check your connection.', 'bot');
  }
}

// Clear chat
async function clearChat() {
  if (confirm('Are you sure you want to clear all messages?')) {
    try {
      await fetch(`${API_URL}/chat/history/${sessionId}`, { method: 'DELETE' });
      chatMessages.innerHTML = `
        <div class="welcome-message">
          <i class="fas fa-robot"></i>
          <h3>Welcome to AI Chatbot!</h3>
          <p>Chat history cleared. Ask me anything!</p>
        </div>
      `;
    } catch (error) {
      console.error('Error clearing chat:', error);
    }
  }
}

// Event listeners
sendButton.addEventListener('click', sendMessage);
clearButton.addEventListener('click', clearChat);
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

loadChatHistory();