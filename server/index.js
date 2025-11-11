import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Basic config
const PORT = process.env.PORT || 3000;
const STATIC_DIR = path.join(__dirname, '../public');

// Middlewares
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// Serve static frontend
app.use('/', express.static(STATIC_DIR));

// Health
app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// Simple memory store per session (in-memory, not persistent)
// For MVP we accept the entire conversation from the client.

// Proxy endpoint to Yandex Foundation Models API (YandexGPT)
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, temperature, maxTokens } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages must be a non-empty array' });
    }

    const apiKey = process.env.YANDEX_API_KEY;
    const folderId = process.env.YANDEX_FOLDER_ID;

    if (!apiKey || !folderId) {
      return res.status(500).json({ error: 'Server misconfiguration: missing YANDEX_API_KEY or YANDEX_FOLDER_ID' });
    }

      // Determine temperature: coerce to number and clamp to [0, 1]
      let computedTemperature = 0.3;
      if (typeof temperature === 'number') {
        computedTemperature = temperature;
      } else if (typeof temperature === 'string' && temperature.trim() !== '' && !Number.isNaN(Number(temperature))) {
        computedTemperature = Number(temperature);
      }
      if (computedTemperature < 0) computedTemperature = 0;
      if (computedTemperature > 1) computedTemperature = 1;

    // Build request to Yandex Foundation Models API
    // Docs: https://cloud.yandex.ru/docs/foundation-models/ (modelUri and schema)
    const modelUri = `gpt://${folderId}/yandexgpt/latest`;
    const url = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';

    // Convert messages from {role: 'user'|'assistant'|'system', content: '...'} to expected schema
    // Yandex expects: messages: [{ role: 'user'|'assistant'|'system', text: '...' }]
    const ycMessages = messages.map((m) => ({ role: m.role, text: String(m.content ?? '') }));

    const payload = {
      modelUri,
      completionOptions: {
        stream: false,
          temperature: computedTemperature,
        maxTokens: typeof maxTokens === 'number' ? maxTokens : 800,
      },
      messages: ycMessages,
    };

      // Log outgoing request details (without secrets)
      // eslint-disable-next-line no-console
      console.log('[LLM Request] modelUri:', modelUri);
      // eslint-disable-next-line no-console
      console.log('[LLM Request] req.body.temperature:', temperature, '=> used:', computedTemperature);
      // eslint-disable-next-line no-console
      console.log('[LLM Request] completionOptions:', payload.completionOptions);
      // eslint-disable-next-line no-console
      console.log('[LLM Request] messages:', ycMessages);

    const ycResp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Api-Key ${apiKey}`,
        'x-folder-id': folderId,
      },
      body: JSON.stringify(payload),
    });

      // eslint-disable-next-line no-console
      console.log('[LLM Response] status:', ycResp.status);

    if (!ycResp.ok) {
      const errText = await ycResp.text();
      return res.status(500).json({ error: 'Yandex API error', status: ycResp.status, details: errText });
    }

    const data = await ycResp.json();

    // The response typically contains result.alternatives[0].message.text
    let assistantText = '';
    try {
      const alternatives = data?.result?.alternatives || [];
      if (alternatives.length > 0) {
        assistantText = alternatives[0]?.message?.text ?? '';
      }
    } catch (_) {
      // fallthrough
    }

      res.json({ reply: assistantText, usedTemperature: computedTemperature, raw: data });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});


