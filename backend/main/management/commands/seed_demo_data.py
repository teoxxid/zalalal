from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db.models.signals import post_delete, post_save

from main.minio_client import set_public_read_policy, upload_path_to_minio
from main.models import Service, invalidate_service_cache


DEMO_SERVICES = [
    {
        "name": "Apple iPhone 16 Pro 128GB",
        "price": Decimal("120000.00"),
        "description": "Флагманский смартфон Apple с дисплеем ProMotion, камерой профессионального уровня и высокой производительностью.",
        "category": "Смартфоны",
        "brand": "Apple",
        "rating": Decimal("4.90"),
        "weight": Decimal("0.22"),
        "image_key": "AppleiPhone16Pro128.jpg",
        "video_key": "iphone16pro.mp4",
    },
    {
        "name": "Apple Watch Ultra 2",
        "price": Decimal("85000.00"),
        "description": "Защищенные смарт-часы Apple для спорта, навигации и ежедневного контроля активности.",
        "category": "Носимые устройства",
        "brand": "Apple",
        "rating": Decimal("4.80"),
        "weight": Decimal("0.06"),
        "image_key": "AppleWatchUltra2.jpg",
        "video_key": "applewatchultra2.mp4",
    },
    {
        "name": "MacBook Pro 16",
        "price": Decimal("250000.00"),
        "description": "Профессиональный ноутбук Apple с большим Liquid Retina XDR дисплеем и мощной аппаратной платформой.",
        "category": "Ноутбуки",
        "brand": "Apple",
        "rating": Decimal("4.90"),
        "weight": Decimal("2.10"),
        "image_key": "MacBookPro16.png",
        "video_key": "macbookpro16.mp4",
    },
    {
        "name": "Sony WH-1000XM5",
        "price": Decimal("35000.00"),
        "description": "Беспроводные наушники Sony с активным шумоподавлением и длительным временем работы.",
        "category": "Аудио",
        "brand": "Sony",
        "rating": Decimal("4.70"),
        "weight": Decimal("0.25"),
        "image_key": "SonyWH_1000XM5.jpg",
        "video_key": "",
    },
    {
        "name": "Xiaomi Robot Vacuum S20+",
        "price": Decimal("42000.00"),
        "description": "Робот-пылесос Xiaomi для сухой и влажной уборки с построением карты помещения.",
        "category": "Бытовая техника",
        "brand": "Xiaomi",
        "rating": Decimal("4.60"),
        "weight": Decimal("3.80"),
        "image_key": "XiaomiRobotVacuumS20-.jpg",
        "video_key": "",
    },
    {
        "name": "Dreame H12 Pro FlexReach",
        "price": Decimal("52000.00"),
        "description": "Моющий беспроводной пылесос Dreame для ухода за твердыми напольными покрытиями.",
        "category": "Бытовая техника",
        "brand": "Dreame",
        "rating": Decimal("4.60"),
        "weight": Decimal("5.10"),
        "image_key": "DreameH12ProFlexReach.jpg",
        "video_key": "",
    },
    {
        "name": "HONOR MagicBook X14 Plus 2025",
        "price": Decimal("78000.00"),
        "description": "Компактный ноутбук HONOR для учебы, работы и повседневных задач.",
        "category": "Ноутбуки",
        "brand": "HONOR",
        "rating": Decimal("4.50"),
        "weight": Decimal("1.40"),
        "image_key": "HONORMagicBookX14Plus2025.jpg",
        "video_key": "",
    },
    {
        "name": "DEXP SBS510M Side-by-Side",
        "price": Decimal("68000.00"),
        "description": "Вместительный холодильник Side-by-Side DEXP для хранения большого объема продуктов.",
        "category": "Бытовая техника",
        "brand": "DEXP",
        "rating": Decimal("4.40"),
        "weight": Decimal("85.00"),
        "image_key": "SidebySideDEXPSBS510M.jpg",
        "video_key": "",
    },
]


EXTRA_MINIO_FILES = ["background.mp4", "logo.png"]


class Command(BaseCommand):
    help = "Создает демо-товары и при необходимости загружает медиафайлы в MinIO."

    def add_arguments(self, parser):
        parser.add_argument(
            "--skip-minio",
            action="store_true",
            help="Не загружать файлы в MinIO, а только создать записи в базе данных.",
        )

    def handle(self, *args, **options):
        seed_dir = Path(settings.MINIO_SEED_DIR)

        if not options["skip_minio"]:
            self._upload_minio_files(seed_dir)

        created_count = 0
        updated_count = 0

        post_save.disconnect(invalidate_service_cache, sender=Service)
        post_delete.disconnect(invalidate_service_cache, sender=Service)
        try:
            self._cleanup_duplicate_services()
            for item in DEMO_SERVICES:
                service, created = Service.objects.update_or_create(
                    name=item["name"],
                    defaults={**item, "status": "active"},
                )
                if created:
                    created_count += 1
                    self.stdout.write(f"Создан товар #{service.id}: {service.name}")
                else:
                    updated_count += 1
                    self.stdout.write(f"Обновлен товар #{service.id}: {service.name}")
        finally:
            post_save.connect(invalidate_service_cache, sender=Service)
            post_delete.connect(invalidate_service_cache, sender=Service)

        self.stdout.write(
            self.style.SUCCESS(
                f"Готово: создано {created_count}, обновлено {updated_count} товаров."
            )
        )

    def _cleanup_duplicate_services(self) -> None:
        canonical_names = {item["name"] for item in DEMO_SERVICES}
        canonical_image_keys = {item["image_key"] for item in DEMO_SERVICES}

        duplicates = Service.objects.filter(image_key__in=canonical_image_keys).exclude(
            name__in=canonical_names
        )
        duplicates = duplicates | Service.objects.filter(name__iexact="iPhone 16 Pro").exclude(
            name="Apple iPhone 16 Pro 128GB"
        )

        for service in duplicates.distinct():
            service.status = "deleted"
            service.save(update_fields=["status"])
            self.stdout.write(f"Скрыт дубль товара: {service.name}")

    def _upload_minio_files(self, seed_dir: Path) -> None:
        if not seed_dir.exists():
            self.stdout.write(
                self.style.WARNING(f"Папка с файлами MinIO не найдена: {seed_dir}")
            )
            return

        set_public_read_policy()
        file_names = {
            item["image_key"]
            for item in DEMO_SERVICES
            if item["image_key"]
        } | {
            item["video_key"]
            for item in DEMO_SERVICES
            if item["video_key"]
        } | set(EXTRA_MINIO_FILES)

        for file_name in sorted(file_names):
            file_path = seed_dir / file_name
            if not file_path.exists():
                self.stdout.write(self.style.WARNING(f"Файл не найден: {file_path}"))
                continue
            if upload_path_to_minio(file_path, file_name):
                self.stdout.write(f"Загружен в MinIO: {file_name}")
            else:
                self.stdout.write(self.style.ERROR(f"Не удалось загрузить: {file_name}"))
