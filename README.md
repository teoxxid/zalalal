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

После `git pull origin main` на Windows:

```
scripts\start.bat
```

Скрипт проверит Docker Desktop, попробует запустить его, дождётся Docker Engine и выполнит `docker compose up --build`.

Если запускаете вручную, сначала откройте Docker Desktop и дождитесь статуса Engine running, затем:

```
docker compose up --build
```

Ошибка вида:

```
open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified
```

означает, что Docker Desktop не запущен, не установлен или выключен Linux/WSL 2 engine. Это не ошибка MinIO и не ошибка проекта: `docker compose` не может подключиться к Docker Engine до чтения/запуска контейнеров.

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
