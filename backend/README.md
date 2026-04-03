# VoltMarket - Backend

Бэкенд-часть маркетплейса электронной техники. Проект разработан в рамках лабораторных работ по курсу «Разработка Web-приложений».

## Стек технологий

- **Backend:** [Django](https://www.djangoproject.com/) + [Django REST Framework](https://www.django-rest-framework.org/)
- **База данных:** [PostgreSQL](https://www.postgresql.org/)
- **Хранилище файлов:** [MinIO](https://min.io/)
- **Контейнеризация:** [Docker](https://www.docker.com/)
- **Качество кода:** [Flake8](https://flake8.pycqa.org/), [Black](https://black.readthedocs.io/), [isort](https://pycqa.github.io/isort/), [pre-commit](https://pre-commit.com/)

## Структура проекта
```
marketplace/
├── backend/ # Бэкенд
│ ├── main/ # Основное приложение
│ │ ├── migrations/ # Миграции БД
│ │ ├── static/ # CSS и статика
│ │ ├── templates/ # HTML шаблоны
│ │ ├── admin.py
│ │ ├── apps.py
│ │ ├── models.py # Модели данных
│ │ ├── serializers.py # API сериализаторы
│ │ ├── urls.py # Маршруты приложения
│ │ └── views.py # Контроллеры
│ ├── marketplace/ # Настройки Django
│ │ ├── settings.py
│ │ └── urls.py
│ ├── manage.py
│ ├── requirements.txt
│ ├── .env
│ └── Dockerfile
├── frontend/ # Фронтенд
├── docker-compose.yml
└── README.md
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
cd C:\Users\teoxxid\marketplace
docker-compose up --build
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
| `DEBUG` | Режим отладки | `True` |
| `SECRET_KEY` | Секретный ключ Django | `django-insecure-key` |
| `ALLOWED_HOSTS` | Разрешённые хосты | `localhost,127.0.0.1` |
| `DB_NAME` | Название базы данных | `marketplace` |
| `DB_USER` | Пользователь БД | `user` |
| `DB_PASSWORD` | Пароль БД | `password` |
| `DB_HOST` | Хост БД | `postgres` |
| `DB_PORT` | Порт БД | `5432` |

## Код-стайл

В проекте приняты следующие соглашения по оформлению кода:

- **Имена переменных и функций:** `snake_case`
- **Имена классов:** `PascalCase`
- **Имена файлов:** `snake_case.py`
- **Максимальная длина строки:** 88 символов
- **Форматирование:** [Black](https://black.readthedocs.io/)
- **Сортировка импортов:** [isort](https://pycqa.github.io/isort/)
- **Линтер:** [Flake8](https://flake8.pycqa.org/)

Перед каждым коммитом код автоматически проверяется pre-commit хуками.

## Pre-commit хуки

Проект использует pre-commit для автоматической проверки качества кода:

- `trailing-whitespace` — удаление лишних пробелов
- `end-of-file-fixer` — добавление пустой строки в конце файлов
- `check-yaml` — проверка синтаксиса YAML
- `check-added-large-files` — проверка размера файлов
- `check-merge-conflict` — проверка маркеров конфликтов
- `detect-private-key` — проверка наличия приватных ключей
- `isort` — сортировка импортов
- `black` — форматирование кода
- `flake8` — линтинг кода

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

### Проблемы с подключением к PyPI

При установке пакетов могут возникать таймауты. Используйте зеркало:

```
pip install -i https://mirrors.aliyun.com/pypi/simple/ <package_name>
```
## Ошибка выполнения скриптов PowerShell

Если не активируется виртуальное окружение:

```
Set-ExecutionPolicy Unrestricted -Scope Process
venv\Scripts\Activate.ps1
```
## Автор

Тихомирова Е. Ю., студент группы ИС-23