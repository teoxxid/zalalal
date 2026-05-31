import io
import json
import mimetypes
from pathlib import Path

from django.conf import settings
from minio import Minio
from minio.error import S3Error


def _public_endpoint() -> str:
    return str(settings.MINIO_PUBLIC_ENDPOINT).rstrip("/")


def get_public_file_url(object_name: str | None) -> str | None:
    if not object_name:
        return None
    return f"{_public_endpoint()}/{settings.MINIO_BUCKET}/{object_name}"


def get_image_url(image_key: str | None) -> str | None:
    return get_public_file_url(image_key)


def get_video_url(video_key: str | None) -> str | None:
    return get_public_file_url(video_key)


minio_client = Minio(
    settings.MINIO_ENDPOINT,
    access_key=settings.MINIO_ACCESS_KEY,
    secret_key=settings.MINIO_SECRET_KEY,
    secure=settings.MINIO_SECURE,
)


def ensure_bucket_exists() -> None:
    if not minio_client.bucket_exists(settings.MINIO_BUCKET):
        minio_client.make_bucket(settings.MINIO_BUCKET)


def set_public_read_policy() -> bool:
    try:
        ensure_bucket_exists()
        policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"AWS": "*"},
                    "Action": ["s3:GetObject"],
                    "Resource": [f"arn:aws:s3:::{settings.MINIO_BUCKET}/*"],
                }
            ],
        }
        minio_client.set_bucket_policy(settings.MINIO_BUCKET, json.dumps(policy))
        return True
    except Exception as exc:
        print(f"Ошибка установки политики MinIO: {exc}")
        return False


def upload_file_to_minio(file, object_name: str) -> bool:
    try:
        ensure_bucket_exists()
        file_data = file.read()
        file_stream = io.BytesIO(file_data)
        minio_client.put_object(
            settings.MINIO_BUCKET,
            object_name,
            file_stream,
            len(file_data),
            content_type=getattr(file, "content_type", None)
            or mimetypes.guess_type(object_name)[0]
            or "application/octet-stream",
        )
        return True
    except S3Error as exc:
        print(f"Ошибка MinIO: {exc}")
        return False
    except Exception as exc:
        print(f"Ошибка загрузки в MinIO: {exc}")
        return False


def upload_path_to_minio(path: Path, object_name: str | None = None) -> bool:
    try:
        ensure_bucket_exists()
        path = Path(path)
        target_name = object_name or path.name
        content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        minio_client.fput_object(
            settings.MINIO_BUCKET,
            target_name,
            str(path),
            content_type=content_type,
        )
        return True
    except Exception as exc:
        print(f"Ошибка загрузки {path} в MinIO: {exc}")
        return False


def object_exists(object_name: str) -> bool:
    try:
        minio_client.stat_object(settings.MINIO_BUCKET, object_name)
        return True
    except Exception:
        return False


def check_minio_connection() -> bool:
    try:
        ensure_bucket_exists()
        buckets = minio_client.list_buckets()
        print(f"Подключение к MinIO успешно. Бакеты: {[bucket.name for bucket in buckets]}")
        return True
    except Exception as exc:
        print(f"Ошибка подключения к MinIO: {exc}")
        return False
