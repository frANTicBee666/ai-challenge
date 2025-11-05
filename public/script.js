const chatEl = document.getElementById('chat');
const formEl = document.getElementById('composer');
const inputEl = document.getElementById('input');
const themeToggleEl = document.getElementById('theme-toggle');
const openSettingsBtn = document.getElementById('open-settings');
const settingsModalEl = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings');
const cancelSettingsBtn = document.getElementById('cancel-settings');
const settingsFormEl = document.getElementById('settings-form');
const tempValueEl = document.getElementById('temp-value');

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

// ===================== Settings =====================
const SETTINGS_KEY = 'ygpt_settings_v1';
function defaultSettings() {
  return {
    format: 'plain',            // 'json' | 'xml' | 'plain'
    schema: '',
    sendMode: 'each_message',   // 'on_save' | 'each_message'
    temperature: 0.7,
  };
}

function formatDefaultTemperature(format) {
  if (format === 'json' || format === 'xml') return 0.2;
  return 0.7; // plain text
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings();
    const parsed = JSON.parse(raw);
    return { ...defaultSettings(), ...parsed };
  } catch {
    return defaultSettings();
  }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function buildSystemMessage(settings) {
  const { format, schema } = settings;
  let header = '';
  if (format === 'json') header = 'Ответ возвращай строго в формате JSON.';
  else if (format === 'xml') header = 'Ответ возвращай строго в формате XML.';
  else header = 'Ответ возвращай простым текстом (plain text).';

  const schemaPart = schema?.trim()
    ? ` Используй следующую схему/уточнение формата: ${schema.trim()}`
    : '';

  const post = format === 'plain'
    ? ' Избегай лишних префиксов и пояснений.'
    : ' Не добавляй комментарии до/после и не изменяй структуру. Возвращай только валидные данные указанного формата.';

  return `${header}${schemaPart}${post}`;
}

let settings = loadSettings();

function openSettings() {
  if (!settingsModalEl) return;
  // Populate form
  const form = settingsFormEl;
  if (!form) return;

  const formatInputs = form.elements.namedItem('format');
  if (formatInputs) {
    const list = Array.isArray(formatInputs) ? formatInputs : [formatInputs];
    list.forEach((i) => { if (i.value === settings.format) i.checked = true; });
  }
  const schemaInput = form.elements.namedItem('schema');
  if (schemaInput) schemaInput.value = settings.schema || '';
  const sendModeInputs = form.elements.namedItem('sendMode');
  if (sendModeInputs) {
    const list = Array.isArray(sendModeInputs) ? sendModeInputs : [sendModeInputs];
    list.forEach((i) => { if (i.value === settings.sendMode) i.checked = true; });
  }
  const tempInput = form.elements.namedItem('temperature');
  if (tempInput) {
    tempInput.value = String(settings.temperature);
    if (tempValueEl) tempValueEl.textContent = String(settings.temperature);
  }

  settingsModalEl.classList.remove('hidden');
}

function closeSettings() {
  if (!settingsModalEl) return;
  settingsModalEl.classList.add('hidden');
}

openSettingsBtn?.addEventListener('click', openSettings);
closeSettingsBtn?.addEventListener('click', closeSettings);
cancelSettingsBtn?.addEventListener('click', closeSettings);

// Auto-adjust temperature when format changes
settingsFormEl?.addEventListener('change', (e) => {
  const target = e.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (target.name === 'format') {
    const tempInput = settingsFormEl.elements.namedItem('temperature');
    const newDefault = formatDefaultTemperature(target.value);
    if (tempInput) {
      tempInput.value = String(newDefault);
      if (tempValueEl) tempValueEl.textContent = String(newDefault);
    }
  }
});

// Show temperature value
settingsFormEl?.addEventListener('input', (e) => {
  const target = e.target;
  if (target && target.name === 'temperature' && tempValueEl) {
    tempValueEl.textContent = String(target.value);
  }
});

// Save settings
settingsFormEl?.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = settingsFormEl;
  const format = form.elements.namedItem('format').value || 'plain';
  const schema = form.elements.namedItem('schema').value || '';
  const sendMode = form.elements.namedItem('sendMode').value || 'each_message';
  const temperature = parseFloat(form.elements.namedItem('temperature').value || '0.7');

  settings = { format, schema, sendMode, temperature };
  saveSettings(settings);

  if (settings.sendMode === 'on_save') {
    // Pin system message into the conversation once
    const sys = buildSystemMessage(settings);
    // Avoid duplicating if the last system is identical
    const lastSystemIndex = [...conversation].reverse().findIndex((m) => m.role === 'system');
    if (lastSystemIndex === -1 || conversation[conversation.length - 1 - lastSystemIndex]?.content !== sys) {
      conversation.push({ role: 'system', content: sys });
      addBubble('assistant', 'Системные настройки применены.');
    }
  }

  closeSettings();
});

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
    // Build message list depending on sendMode
    const messages = [...conversation];
    if (settings.sendMode === 'each_message') {
      messages.unshift({ role: 'system', content: buildSystemMessage(settings) });
    }

    const resp = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, temperature: settings.temperature }),
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


