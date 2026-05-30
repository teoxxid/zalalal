import io
from minio import Minio
from minio.error import S3Error
import json

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

        return True
    except S3Error as e:
        print(f"Ошибка MinIO: {e}")
        return False
    except Exception as e:
        print(f"Ошибка загрузки в MinIO: {e}")
        return False


def check_minio_connection():
    """Проверяет подключение к MinIO"""
    try:
        # Проверяем существование бакета
        if not minio_client.bucket_exists(MINIO_BUCKET):
            minio_client.make_bucket(MINIO_BUCKET)
            print(f"Бакет {MINIO_BUCKET} создан")
        
        buckets = minio_client.list_buckets()
        print(f"Подключение к MinIO успешно. Бакеты: {[b.name for b in buckets]}")
        return True
    except Exception as e:
        print(f"Ошибка подключения к MinIO: {e}")
        return False


def set_public_read_policy():
    """Устанавливает политику публичного чтения для бакета"""
    try:
        policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"AWS": "*"},
                    "Action": ["s3:GetObject"],
                    "Resource": [f"arn:aws:s3:::{MINIO_BUCKET}/*"]
                }
            ]
        }
        minio_client.set_bucket_policy(MINIO_BUCKET, json.dumps(policy))
        print(f"Политика публичного чтения установлена для {MINIO_BUCKET}")
        return True
    except Exception as e:
        print(f"Ошибка установки политики: {e}")
        return False
    