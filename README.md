# YandexGPT Chat (MVP)

Простое веб‑приложение с сервером на Node.js/Express и статическим фронтендом. Интерфейс напоминает современные мессенджеры: сообщения пользователя — синие, ответы модели — зелёные. На время ожидания отображается «Подождите, я думаю…».

## Возможности
- Диалог «пользователь ↔ LLM» через API Yandex Foundation Models (YandexGPT)
- Простая установка: Node.js или Docker/Docker Compose
- Переменные окружения для ключа и каталога Yandex Cloud

## Требования
- Node.js 18+ (или Docker 24+)
- Ключ API Yandex Cloud и `folderId`

## Настройка окружения
Создайте файл `.env` (рядом с `package.json`) со значениями:

```
PORT=3000
YANDEX_API_KEY=ваш_api_key
YANDEX_FOLDER_ID=ваш_folder_id
```

> Примечание: `.env.example` может быть недоступен в этом репозитории. Скопируйте блок выше как шаблон.

## Локальный запуск (Node.js)
```bash
npm install
npm run dev
# Откройте http://localhost:3000
```

## Запуск в Docker
```bash
# В корне проекта:
export YANDEX_API_KEY=ваш_api_key
export YANDEX_FOLDER_ID=ваш_folder_id

docker compose up --build -d
# Откройте http://<IP_сервера>:3000
```

## Структура проекта
- `server/index.js` — Express сервер, прокси к YandexGPT (`/api/chat`), раздача статики
- `public/` — статические файлы фронтенда (`index.html`, `styles.css`, `script.js`)
- `Dockerfile`, `docker-compose.yml` — для деплоя на VPS

## Переменные окружения
- `PORT` — порт сервера (по умолчанию 3000)
- `YANDEX_API_KEY` — API‑ключ Yandex Cloud
- `YANDEX_FOLDER_ID` — ID каталога (folderId)

## Как это работает
Фронтенд отправляет историю диалога на `POST /api/chat` в формате:
```json
{
  "messages": [
    { "role": "user", "content": "Привет" },
    { "role": "assistant", "content": "Здравствуйте!" }
  ]
}
```
Сервер приводит формат к требованиям Yandex Foundation Models и обращается к `https://llm.api.cloud.yandex.net/foundationModels/v1/completion` с `modelUri = gpt://<folderId>/yandexgpt/latest`. Ответ возвращается фронтенду в виде `{ reply: string }`.

## Примечания по безопасности
- Ключ храните в переменных окружения на сервере/VPS.
- Эта версия хранит историю диалога только на клиенте. Для персистентности потребуется база данных/сессии (можно добавить позже).

## Деплой на VPS (коротко)
1. Установить Docker и Docker Compose.
2. Склонировать репозиторий.
3. Экспортировать переменные `YANDEX_API_KEY`, `YANDEX_FOLDER_ID` в окружение или описать их в `docker-compose.yml` (env_file).
4. `docker compose up --build -d`.
5. Прокинуть домен/HTTPS (например, Caddy/NGINX) — можно добавить конфиги по запросу.

## Дальнейшие улучшения
- Стриминг ответа (SSE) для показа «пайпинга» текста
- История диалога на сервере (сессии, БД)
- Настройки температуры/системного промпта в UI
- Темизация и доработка дизайна


