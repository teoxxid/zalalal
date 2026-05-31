# VoltMarket

Маркетплейс электронной техники. Проект состоит из бэкенда на Django и фронтенда на React.

## Структура проекта

```
marketplace/
├── backend/ # Django бэкенд
├── frontend/ # React фронтенд
├── minio-files/ # исходные изображения и видео для MinIO
├── ruff.toml # Конфиг Ruff (линтер + форматтер)
├── .pre-commit-config.yaml # Pre-commit хуки
├── docker-compose.yml
└── README.md
```

## Запуск

Перед запуском должен быть включен Docker Desktop.

### 1. Инфраструктура

```
docker compose up -d
```

Эта команда поднимает только инфраструктуру: PostgreSQL, Redis, MinIO, Adminer, Prometheus и Grafana. Backend и frontend не стартуют автоматически.

### 2. Разовая подготовка MinIO и базы

Загрузка файлов из `minio-files/` в MinIO:

```
docker compose --profile setup run --rm minio-init
```

Миграции, заполнение каталога и создание администратора:

```
docker compose run --rm backend python manage.py migrate
docker compose run --rm backend python manage.py seed_demo_data --skip-minio
docker compose run --rm backend python manage.py ensure_admin
```

Администратор для входа: `admin` / `admin123`.

### 3. Backend и frontend отдельно

Backend в Docker:

```
docker compose run --service-ports --rm backend python manage.py runserver 0.0.0.0:8000
```

Frontend локально:

```
cd frontend
npm run dev -- --host 0.0.0.0
```

## Ссылки

- **React фронтенд:** http://localhost:5173
- **Django API:** http://localhost:8000/api/services/
- **MinIO:** http://localhost:9001
- **Adminer:** http://localhost:8080

Доступ к MinIO Console: логин `minioadmin`, пароль `minioadmin`.

## Документация

- [Backend README](./backend/README.md)
- [Frontend README](./frontend/README.md)

## Автор

Тихомирова Е. Ю., группа ИС-23
