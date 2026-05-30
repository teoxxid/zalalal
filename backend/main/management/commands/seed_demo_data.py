from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db.models.signals import post_delete, post_save

from main.minio_client import (
    object_exists,
    set_public_read_policy,
    upload_path_to_minio,
)
from main.models import Service, invalidate_service_cache


DEMO_SERVICES = [
    {
        "name": "iPhone 16 Pro 128GB",
        "price": Decimal("120000.00"),
        "description": "Флагманский смартфон Apple с мощным процессором и качественной камерой.",
        "image_key": "AppleiPhone16Pro128.jpg",
        "video_key": "iphone16pro.mp4",
        "category": "Смартфоны",
        "brand": "Apple",
        "rating": Decimal("4.90"),
        "weight": Decimal("0.22"),
    },
    {
        "name": "Apple Watch Ultra 2",
        "price": Decimal("85000.00"),
        "description": "Прочные умные часы Apple для спорта, навигации и ежедневных задач.",
        "image_key": "AppleWatchUltra2.jpg",
        "video_key": "applewatchultra2.mp4",
        "category": "Носимые устройства",
        "brand": "Apple",
        "rating": Decimal("4.80"),
        "weight": Decimal("0.06"),
    },
    {
        "name": "MacBook Pro 16",
        "price": Decimal("250000.00"),
        "description": "Профессиональный ноутбук Apple с большим экраном и высокой производительностью.",
        "image_key": "MacBookPro16.png",
        "video_key": "macbookpro16.mp4",
        "category": "Ноутбуки",
        "brand": "Apple",
        "rating": Decimal("4.90"),
        "weight": Decimal("2.10"),
    },
    {
        "name": "Sony WH-1000XM5",
        "price": Decimal("35000.00"),
        "description": "Беспроводные наушники Sony с активным шумоподавлением.",
        "image_key": "SonyWH_1000XM5.jpg",
        "video_key": "",
        "category": "Аудио",
        "brand": "Sony",
        "rating": Decimal("4.70"),
        "weight": Decimal("0.25"),
    },
    {
        "name": "Xiaomi Robot Vacuum S20+",
        "price": Decimal("42000.00"),
        "description": "Робот-пылесос Xiaomi для сухой и влажной уборки.",
        "image_key": "XiaomiRobotVacuumS20-.jpg",
        "video_key": "",
        "category": "Бытовая техника",
        "brand": "Xiaomi",
        "rating": Decimal("4.60"),
        "weight": Decimal("3.80"),
    },
    {
        "name": "Dreame H12 Pro FlexReach",
        "price": Decimal("52000.00"),
        "description": "Моющий пылесос Dreame для быстрой уборки твёрдых покрытий.",
        "image_key": "DreameH12ProFlexReach.jpg",
        "video_key": "",
        "category": "Бытовая техника",
        "brand": "Dreame",
        "rating": Decimal("4.60"),
        "weight": Decimal("5.10"),
    },
    {
        "name": "HONOR MagicBook X14 Plus 2025",
        "price": Decimal("78000.00"),
        "description": "Компактный ноутбук HONOR для учебы, работы и повседневных задач.",
        "image_key": "HONORMagicBookX14Plus2025.jpg",
        "video_key": "",
        "category": "Ноутбуки",
        "brand": "HONOR",
        "rating": Decimal("4.50"),
        "weight": Decimal("1.40"),
    },
    {
        "name": "DEXP SBS510M Side-by-Side",
        "price": Decimal("68000.00"),
        "description": "Вместительный холодильник Side-by-Side для дома.",
        "image_key": "SidebySideDEXPSBS510M.jpg",
        "video_key": "",
        "category": "Бытовая техника",
        "brand": "DEXP",
        "rating": Decimal("4.40"),
        "weight": Decimal("85.00"),
    },
]


class Command(BaseCommand):
    help = "Создаёт демо-товары и связывает их с объектами в MinIO."

    def add_arguments(self, parser):
        parser.add_argument(
            "--skip-minio",
            action="store_true",
            help="Не загружать файлы в MinIO, только создать/обновить записи Service.",
        )

    def handle(self, *args, **options):
        seed_dir = Path(settings.MINIO_SEED_DIR)
        if not options["skip_minio"]:
            if not seed_dir.exists():
                self.stdout.write(self.style.WARNING(f"Папка {seed_dir} не найдена, загрузка файлов пропущена."))
            else:
                set_public_read_policy()
                for file_path in seed_dir.iterdir():
                    if file_path.is_file():
                        if not object_exists(file_path.name):
                            upload_path_to_minio(file_path)
                            self.stdout.write(f"MinIO: загружен {file_path.name}")

        created = 0
        updated = 0
        post_save.disconnect(invalidate_service_cache, sender=Service)
        post_delete.disconnect(invalidate_service_cache, sender=Service)
        try:
            for item in DEMO_SERVICES:
                service, was_created = Service.objects.update_or_create(
                    name=item["name"],
                    defaults={**item, "status": "active"},
                )
                if was_created:
                    created += 1
                else:
                    updated += 1
        finally:
            post_save.connect(invalidate_service_cache, sender=Service)
            post_delete.connect(invalidate_service_cache, sender=Service)

        self.stdout.write(
            self.style.SUCCESS(
                f"Демо-товары готовы: создано {created}, обновлено {updated}."
            )
        )
