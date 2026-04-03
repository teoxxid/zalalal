from minio import Minio

# Настройки подключения
client = Minio(
    "localhost:9000", access_key="minioadmin", secret_key="minioadmin", secure=False
)

# Проверяем подключение
try:
    buckets = client.list_buckets()
    print("Подключение к Minio успешно!")
    print("Доступные buckets:", [b.name for b in buckets])

    # Проверяем наличие файлов в bucket services
    objects = client.list_objects("services")
    print("\nФайлы в bucket services:")
    for obj in objects:
        print(f" - {obj.object_name}")

except Exception as e:
    print(f"Ошибка: {e}")
