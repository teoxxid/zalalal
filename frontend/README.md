# VoltMarket - Frontend

Фронтенд-часть маркетплейса электронной техники. Проект разработан в рамках лабораторных работ по курсу «Разработка Web-приложений».

## Стек технологий

- **Frontend:** [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/)
- **HTTP-клиент:** `fetch` для каталога, [Axios](https://axios-http.com/) и сгенерированный Swagger-клиент для авторизации и заявок
- **Качество кода:** [ESLint](https://eslint.org/), [Prettier](https://prettier.io/)
- **Контейнеризация:** [Docker](https://www.docker.com/)

## Структура проекта

```
frontend/
├── public/                      # Статические файлы
├── src/
│   ├── services/                # API-клиенты
│   │   └── api.ts               # Axios настройки
│   ├── App.tsx                  # Главный компонент
│   ├── main.tsx                 # Точка входа
│   └── vite-env.d.ts            # Типы окружения
├── .gitignore                   # Игнорируемые файлы
├── .prettierrc                  # Конфиг Prettier (форматтер)
├── Dockerfile                   # Образ для Docker
├── eslint.config.js             # Конфиг ESLint (линтер)
├── index.html
├── package-lock.json
├── package.json
├── README.md
├── tsconfig.app.json            # Настройки TypeScript для приложения
├── tsconfig.json                # Корневой конфиг TypeScript
├── tsconfig.node.json           # Настройки TypeScript для Node.js
└── vite.config.ts               # Конфиг Vite
```

## Установка и запуск

### Локальная установка

```
# Перейти в папку фронтенда
cd frontend

# Установить зависимости
npm install

# Запустить в режиме разработки
npm run dev
```

Приложение будет доступно по адресу: http://localhost:5173
Запросы `/api/...` в dev-режиме проксируются Vite на backend из `VITE_API_TARGET` или `http://localhost:8000`.

### Сборка для production

```bash
npm run build
```

### Сборка mock/PWA для GitHub Pages

```bash
npm run build:mock
npm run deploy
```

Mock/PWA-сборка использует base path `/zalalal/`. Если API недоступен, карточки берутся из локальной коллекции.

### Запуск через Docker

```bash
# Из корня проекта
docker compose --profile app up frontend
```

### Tauri

Для сборки нативного приложения укажите IP backend в локальной сети:

```powershell
$env:VITE_API_TARGET="http://192.168.0.103:8000"
npm run tauri build
```

## API Endpoints

Фронтенд взаимодействует с бэкендом через REST API:

| Метод  | URL                     | Описание                      |
| ------ | ----------------------- | ----------------------------- |
| GET    | `/api/services/`        | Список всех товаров           |
| GET    | `/api/services/<id>/`   | Детальная информация о товаре |
| POST   | `/api/order/add/<id>/`  | Добавление товара в заявку    |
| PUT    | `/api/order/item/<id>/` | Обновление количества товара  |
| DELETE | `/api/order/<id>/`      | Удаление заявки               |

### Пример ответа API

```
{
    "status": "success",
    "data": [
        {
            "id": 1,
            "name": "iPhone 15 Pro Max",
            "price": "89990.00",
            "image_url": "http://localhost:9000/services/iphone15promax.jpg",
            "category": "Смартфоны",
            "brand": "Apple",
            "rating": "4.80"
        }
    ]
}
```

## Переменные окружения

| Переменная     | Описание       | Пример                      |
| -------------- | -------------- | --------------------------- |
| `VITE_API_TARGET` | URL backend для proxy/dev/build | `http://localhost:8000` |
| `VITE_MINIO_PUBLIC_ENDPOINT` | URL MinIO для медиа | `http://localhost:9000` |
| `VITE_BASE_PATH` | Base path для Pages | `/zalalal/` |

Создайте файл `.env` из `.env.example`:

```
cp .env.example .env
```

## Код-стайл

- **Имена переменных и функций:** `camelCase`
- **Имена компонентов React:** `PascalCase`
- **Имена файлов:** `camelCase` для компонентов, `kebab-case` для остальных
- **Максимальная длина строки:** 100 символов
- **Форматирование:** Prettier
- **Линтер:** ESLint

## Особенности реализации

- **Адаптивная сетка:** 4 колонки на десктопе, 2 на планшете, 1 на мобильных устройствах
- **Hover-эффекты:** поднятие карточки и тень при наведении
- **Загрузка данных:** `fetch` для ЛР6 каталога с mock fallback, Axios/Swagger clients для ЛР7 заявок и авторизации
- **Похожие товары:** transformer.js (`@huggingface/transformers`) считает embeddings описаний на странице товара
- **Обработка ошибок:** отображение сообщения при неудачной загрузке

## Автор

Тихомирова Е. Ю., студент группы ИС-23
