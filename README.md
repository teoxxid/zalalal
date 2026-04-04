# VoltMarket

Маркетплейс электронной техники. Проект состоит из бэкенда на Django и фронтенда на React.

## Структура проекта

```
marketplace/
├── backend/ # Django бэкенд
├── frontend/ # React фронтенд
├── ruff.toml # Конфиг Ruff (линтер + форматтер)
├── .pre-commit-config.yaml # Pre-commit хуки
├── docker-compose.yml
└── README.md
```

## Быстрый запуск

```
docker-compose up --build
```
## Ссылки

- **React фронтенд:** http://localhost:5173
- **Django API:** http://localhost:8000/api/services/
- **MinIO:** http://localhost:9001
- **Adminer:** http://localhost:8080

## Документация

- [Backend README](./backend/README.md)
- [Frontend README](./frontend/README.md)

## Автор

Тихомирова Е. Ю., группа ИС-23
