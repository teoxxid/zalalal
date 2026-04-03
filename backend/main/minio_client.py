import io

from minio import Minio

MINIO_ENDPOINT = "localhost:9000"
MINIO_ACCESS_KEY = "minioadmin"
MINIO_SECRET_KEY = "minioadmin"
MINIO_BUCKET = "services"
MINIO_SECURE = False

# Создаем клиент
minio_client = Minio(
    MINIO_ENDPOINT,
    access_key=MINIO_ACCESS_KEY,
    secret_key=MINIO_SECRET_KEY,
    secure=MINIO_SECURE,
)


def get_image_url(image_key):
    """Получает прямую ссылку на изображение"""
    if image_key:
        return f"http://localhost:9000/{MINIO_BUCKET}/{image_key}"
    return None


def get_video_url(video_key):
    """Получает прямую ссылку на видео"""
    if video_key:
        return f"http://localhost:9000/{MINIO_BUCKET}/{video_key}"
    return None


def upload_file_to_minio(file, object_name):
    """Загружает файл в MinIO"""
    try:
        # Читаем файл в байты
        file_data = file.read()
        file_size = len(file_data)

        # Создаем BytesIO объект
        file_stream = io.BytesIO(file_data)

        # Загружаем в MinIO
        minio_client.put_object(
            MINIO_BUCKET,
            object_name,
            file_stream,
            file_size,
            content_type=file.content_type,
        )

        # Открываем публичный доступ к файлу
        try:
            minio_client.set_bucket_policy(
                MINIO_BUCKET, f"{MINIO_BUCKET}/{object_name}", "readonly"
            )
        except Exception as policy_error:
            print(
                f"Предупреждение: не удалось установить "
                f"политику доступа: {policy_error}"
            )

        return True
    except Exception as e:
        print(f"Ошибка загрузки в MinIO: {e}")
        return False


def check_minio_connection():
    """Проверяет подключение к MinIO"""
    try:
        buckets = minio_client.list_buckets()
        print(f"Подключение к MinIO успешно. " f"Бакеты: {[b.name for b in buckets]}")
        return True
    except Exception as e:
        print(f"Ошибка подключения к MinIO: {e}")
        return False
