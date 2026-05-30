import os

from minio import Minio


client = Minio(
    os.getenv("MINIO_ENDPOINT", "localhost:9000"),
    access_key=os.getenv("MINIO_ACCESS_KEY", "minioadmin"),
    secret_key=os.getenv("MINIO_SECRET_KEY", "minioadmin"),
    secure=os.getenv("MINIO_SECURE", "False") == "True",
)
bucket_name = os.getenv("MINIO_BUCKET", "services")

# Проверяем подключение
try:
    buckets = client.list_buckets()
    print("Подключение к Minio успешно!")
    print("Доступные buckets:", [b.name for b in buckets])

    objects = client.list_objects(bucket_name)
    print(f"\nФайлы в bucket {bucket_name}:")
    for obj in objects:
        print(f" - {obj.object_name}")

except Exception as e:
    print(f"Ошибка: {e}")
