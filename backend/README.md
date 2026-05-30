# VoltMarket - Backend

Бэкенд-часть маркетплейса электронной техники. Проект разработан в рамках лабораторных работ по курсу «Разработка Web-приложений».

## Стек технологий

- **Backend:** [Django](https://www.djangoproject.com/) + [Django REST Framework](https://www.django-rest-framework.org/)
- **База данных:** [PostgreSQL](https://www.postgresql.org/)
- **Хранилище файлов:** [MinIO](https://min.io/)
- **Контейнеризация:** [Docker](https://www.docker.com/)
- **Качество кода:** [Ruff](https://docs.astral.sh/ruff/), [pre-commit](https://pre-commit.com/)

## Структура проекта
```
backend/
├── main/                          # Основное приложение
│   ├── migrations/                # Миграции БД
│   ├── static/                    # CSS и статика
│   ├── templates/                 # HTML шаблоны
│   ├── admin.py
│   ├── apps.py
│   ├── models.py                  # Модели данных
│   ├── serializers.py             # API сериализаторы
│   ├── urls.py                    # Маршруты приложения
│   └── views.py                   # Контроллеры
├── marketplace/                   # Настройки Django
│   ├── settings.py
│   └── urls.py
├── venv/                          # Виртуальное окружение
├── .env                           # Переменные окружения (секреты)
├── .env.example                   # Пример переменных окружения
├── .gitignore                     # Игнорируемые файлы
├── Dockerfile                     # Образ для Docker
├── manage.py                      # Управление Django
├── README.md                      # Документация
└── requirements.txt               # Зависимости Python
```

## Установка и запуск

### Локальная установка

```
# Клонирование репозитория
git clone <url-репозитория>
cd marketplace/backend

# Создание и активация виртуального окружения
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

# Установка зависимостей
pip install -r requirements.txt

# Применение миграций
python manage.py migrate

# Запуск сервера
python manage.py runserver
```
Приложение будет доступно по адресу: http://127.0.0.1:8000
## Запуск через Docker (из корня проекта)

```
cd D:\marketplace
docker-compose up --build
```
Docker Compose автоматически:

- поднимает MinIO на `http://localhost:9000` и консоль на `http://localhost:9001`;
- создаёт bucket `services`;
- выдаёт публичное чтение файлов bucket;
- загружает файлы из `minio-files`;
- применяет миграции Django;
- создаёт демо-товары с `image_key`/`video_key`, совпадающими с файлами MinIO.

Для ручной локальной инициализации демо-товаров:

```
python manage.py seed_demo_data
```

## API Endpoints

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/services/` | Список всех товаров |
| GET | `/api/services/<id>/` | Детальная информация о товаре |
| POST | `/api/order/add/<id>/` | Добавление товара в заявку |
| PUT | `/api/order/item/<id>/` | Обновление количества товара |
| DELETE | `/api/order/<id>/` | Удаление заявки |

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

Создайте файл `.env` из `.env.example` и заполните:

| Переменная | Описание | Пример |
|------------|----------|--------|
| `DJANGO_DEBUG` | Режим отладки | `True` |
| `DJANGO_SECRET_KEY` | Секретный ключ Django | `django-insecure-key` |
| `ALLOWED_HOSTS` | Разрешённые хосты | `localhost,127.0.0.1` |
| `DB_NAME` | Название базы данных | `marketplace` |
| `DB_USER` | Пользователь БД | `user` |
| `DB_PASSWORD` | Пароль БД | `password` |
| `DB_HOST` | Хост БД | `postgres` |
| `DB_PORT` | Порт БД | `5432` |
| `MINIO_ENDPOINT` | Адрес MinIO для backend | `localhost:9000`, в Docker `minio:9000` |
| `MINIO_PUBLIC_ENDPOINT` | Адрес MinIO для браузера | `http://localhost:9000` |
| `MINIO_BUCKET` | Bucket с файлами товаров | `services` |
| `MINIO_SEED_DIR` | Папка исходных файлов для seed | `../minio-files` |

## Код-стайл

В проекте приняты следующие соглашения по оформлению кода:

- **Имена переменных и функций:** `snake_case`
- **Имена классов:** `PascalCase`
- **Имена файлов:** `snake_case.py`
- **Максимальная длина строки:** 88 символов
- **Форматирование и линтинг:** [Ruff](https://docs.astral.sh/ruff/)
- **Pre-commit хуки:** автоматическая проверка перед коммитом

Перед каждым коммитом код автоматически проверяется pre-commit хуками.

## Pre-commit хуки

Проект использует pre-commit для автоматической проверки качества кода:

- `trailing-whitespace` — удаление лишних пробелов
- `end-of-file-fixer` — добавление пустой строки в конце файлов
- `check-yaml` — проверка синтаксиса YAML
- `check-added-large-files` — проверка размера файлов
- `check-merge-conflict` — проверка маркеров конфликтов
- `detect-private-key` — проверка наличия приватных ключей
- `ruff` — линтинг и форматирование Python кода
- `ruff-format` — форматирование Python кода

Для ручного запуска всех хуков:
```
pre-commit run --all-files
```
## Особенности реализации

- **Заявки имеют 5 статусов:** черновик, удалена, сформирована, завершена, отклонена
- **Логическое удаление:** заявки не удаляются физически, а меняют статус на "deleted"
- **Удалённые заявки:** недоступны для просмотра, перенаправляют на специальную страницу
- **Расчёты при завершении:** автоматически вычисляется общее количество товаров и итоговый вес заказа
- **MinIO:** все медиафайлы (фото и видео) хранятся в объектном хранилище

## Известные проблемы и решения
## Ошибка выполнения скриптов PowerShell

Если не активируется виртуальное окружение:

```
Set-ExecutionPolicy Unrestricted -Scope Process
venv\Scripts\Activate.ps1
```
## Автор

Тихомирова Е. Ю., студент группы ИС-23
