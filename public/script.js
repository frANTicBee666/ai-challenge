const chatEl = document.getElementById('chat');
const formEl = document.getElementById('composer');
const inputEl = document.getElementById('input');

/**
 * Conversation memory (client-side) in OpenAI-like shape
 * [{ role: 'user'|'assistant'|'system', content: string }]
 */
const conversation = [];

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


