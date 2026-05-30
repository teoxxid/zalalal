# VoltMarket

Маркетплейс электронной техники. Проект состоит из бэкенда на Django и фронтенда на React.

## Структура проекта

```
marketplace/
├── backend/ # Django бэкенд
├── frontend/ # React фронтенд
├── minio-files/ # Исходные медиафайлы для загрузки в MinIO
├── minio-data/ # Локальные данные MinIO при запуске через Docker
├── ruff.toml # Конфиг Ruff (линтер + форматтер)
├── .pre-commit-config.yaml # Pre-commit хуки
├── docker-compose.yml
└── README.md
```

## Быстрый запуск

```
docker-compose up --build
```
При запуске через Docker bucket `services` создаётся автоматически, файлы из `minio-files` загружаются в MinIO, а демо-товары создаются в базе с правильными `image_key` и `video_key`.

Если папка проекта на другом компьютере лежит как `D:\marketplace`, дополнительных абсолютных путей менять не нужно: Docker Compose использует относительные `./minio-data` и `./minio-files`.

## Ссылки

- **React фронтенд:** http://localhost:5173
- **Django API:** http://localhost:8000/api/services/
- **MinIO Console:** http://localhost:9001
- **MinIO public files:** http://localhost:9000/services/
- **Adminer:** http://localhost:8080

## Документация

- [Backend README](./backend/README.md)
- [Frontend README](./frontend/README.md)

## Автор

Тихомирова Е. Ю., группа ИС-23
