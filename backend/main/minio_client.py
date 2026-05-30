import io
import json
import mimetypes
from pathlib import Path
from urllib.parse import quote

from django.conf import settings
from minio import Minio
from minio.error import S3Error


MINIO_ENDPOINT = settings.MINIO_ENDPOINT
MINIO_ACCESS_KEY = settings.MINIO_ACCESS_KEY
MINIO_SECRET_KEY = settings.MINIO_SECRET_KEY
MINIO_BUCKET = settings.MINIO_BUCKET
MINIO_SECURE = settings.MINIO_SECURE
MINIO_PUBLIC_ENDPOINT = settings.MINIO_PUBLIC_ENDPOINT

minio_client = Minio(
    MINIO_ENDPOINT,
    access_key=MINIO_ACCESS_KEY,
    secret_key=MINIO_SECRET_KEY,
    secure=MINIO_SECURE,
)


def get_public_file_url(object_name: str | None) -> str | None:
    if not object_name:
        return None
    encoded_name = quote(str(object_name).lstrip("/"), safe="/")
    return f"{MINIO_PUBLIC_ENDPOINT}/{MINIO_BUCKET}/{encoded_name}"


def get_image_url(image_key):
    return get_public_file_url(image_key)


def get_video_url(video_key):
    return get_public_file_url(video_key)


def ensure_bucket_exists():
    if not minio_client.bucket_exists(MINIO_BUCKET):
        minio_client.make_bucket(MINIO_BUCKET)


def upload_file_to_minio(file, object_name):
    try:
        ensure_bucket_exists()
        file_data = file.read()
        file_size = len(file_data)
        file_stream = io.BytesIO(file_data)
        minio_client.put_object(
            MINIO_BUCKET,
            object_name,
            file_stream,
            file_size,
            content_type=getattr(file, "content_type", None) or "application/octet-stream",
        )
        return True
    except S3Error as e:
        print(f"Ошибка MinIO: {e}")
        return False
    except Exception as e:
        print(f"Ошибка загрузки в MinIO: {e}")
        return False


def upload_path_to_minio(file_path: Path, object_name: str | None = None):
    object_name = object_name or file_path.name
    content_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
    ensure_bucket_exists()
    minio_client.fput_object(
        MINIO_BUCKET,
        object_name,
        str(file_path),
        content_type=content_type,
    )


def object_exists(object_name: str) -> bool:
    try:
        minio_client.stat_object(MINIO_BUCKET, object_name)
        return True
    except S3Error as e:
        if e.code in {"NoSuchKey", "NoSuchBucket"}:
            return False
        raise


def check_minio_connection():
    try:
        ensure_bucket_exists()
        buckets = minio_client.list_buckets()
        print(f"Подключение к MinIO успешно. Бакеты: {[b.name for b in buckets]}")
        return True
    except Exception as e:
        print(f"Ошибка подключения к MinIO: {e}")
        return False


def set_public_read_policy():
    try:
        ensure_bucket_exists()
        policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"AWS": "*"},
                    "Action": ["s3:GetObject"],
                    "Resource": [f"arn:aws:s3:::{MINIO_BUCKET}/*"],
                }
            ],
        }
        minio_client.set_bucket_policy(MINIO_BUCKET, json.dumps(policy))
        print(f"Политика публичного чтения установлена для {MINIO_BUCKET}")
        return True
    except Exception as e:
        print(f"Ошибка установки политики: {e}")
        return False
