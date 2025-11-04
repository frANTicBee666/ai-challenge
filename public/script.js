const chatEl = document.getElementById('chat');
const formEl = document.getElementById('composer');
const inputEl = document.getElementById('input');
const themeToggleEl = document.getElementById('theme-toggle');

/**
 * Conversation memory (client-side) in OpenAI-like shape
 * [{ role: 'user'|'assistant'|'system', content: string }]
 */
const conversation = [];

// Theme handling
const THEME_KEY = 'ygpt_theme';
function getPreferredTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  return prefersLight ? 'light' : 'dark';
}
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
  if (themeToggleEl) themeToggleEl.checked = theme === 'light';
}
function initTheme() {
  const theme = getPreferredTheme();
  applyTheme(theme);
}
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'light' ? 'dark' : 'light';
  applyTheme(next);
  localStorage.setItem(THEME_KEY, next);
}

initTheme();
if (themeToggleEl) {
  themeToggleEl.addEventListener('change', toggleTheme);
}

function addBubble(role, text) {
  const row = document.createElement('div');
  row.className = `row ${role}`;
  const bubble = document.createElement('div');
  bubble.className = `bubble ${role}`;
  bubble.textContent = text;
  row.appendChild(bubble);
  chatEl.appendChild(row);
  chatEl.scrollTop = chatEl.scrollHeight;
  return row;
}

function addThinking() {
  const row = document.createElement('div');
  row.className = 'row assistant';
  const thinking = document.createElement('div');
  thinking.className = 'thinking';
  thinking.textContent = 'Подождите, я думаю…';
  row.appendChild(thinking);
  chatEl.appendChild(row);
  chatEl.scrollTop = chatEl.scrollHeight;
  return row;
}

formEl.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = inputEl.value.trim();
  if (!text) return;

  inputEl.value = '';
  formEl.querySelector('button').disabled = true;

  // Render user bubble
  addBubble('user', text);
  conversation.push({ role: 'user', content: text });

  // Render thinking placeholder
  const thinkingRow = addThinking();

  try {
    const resp = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: conversation }),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(errText || 'Request failed');
    }
    const data = await resp.json();
    const reply = data?.reply || '';

    // Replace thinking row with assistant bubble
    thinkingRow.remove();
    addBubble('assistant', reply || '(пустой ответ)');
    conversation.push({ role: 'assistant', content: reply });
  } catch (err) {
    thinkingRow.remove();
    addBubble('assistant', 'Ошибка получения ответа. Попробуйте ещё раз.');
    // eslint-disable-next-line no-console
    console.error(err);
  } finally {
    formEl.querySelector('button').disabled = false;
  }
});


