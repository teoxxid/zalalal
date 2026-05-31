import os

from minio import Minio


endpoint = os.getenv("MINIO_ENDPOINT", "localhost:9000")
access_key = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
secret_key = os.getenv("MINIO_SECRET_KEY", "minioadmin")
bucket_name = os.getenv("MINIO_BUCKET", "services")
secure = os.getenv("MINIO_SECURE", "False") == "True"

client = Minio(endpoint, access_key=access_key, secret_key=secret_key, secure=secure)

try:
    buckets = client.list_buckets()
    print("Подключение к MinIO успешно!")
    print("Доступные buckets:", [bucket.name for bucket in buckets])

    print(f"\nФайлы в bucket {bucket_name}:")
    for obj in client.list_objects(bucket_name):
        print(f" - {obj.object_name}")
except Exception as exc:
    print(f"Ошибка: {exc}")
