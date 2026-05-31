from django.core.management.base import BaseCommand
from django.db import IntegrityError
from django.db.models import ProtectedError

from main.models import User


class Command(BaseCommand):
    help = "Пересоздает локального администратора с известным логином и паролем."

    def add_arguments(self, parser):
        parser.add_argument("--username", default="admin")
        parser.add_argument("--password", default="admin123")
        parser.add_argument("--email", default="")

    def handle(self, *args, **options):
        username = options["username"]
        password = options["password"]
        email = options["email"]

        self._normalize_demo_user()
        self._remove_legacy_admins(username)

        try:
            existing_user = User.objects.filter(username=username).first()
            if existing_user:
                existing_user.delete()
                self.stdout.write(f"Удален старый пользователь: {username}")
        except Exception as exc:
            self.stdout.write(
                self.style.WARNING(
                    f"Не удалось удалить старого пользователя {username}: {exc}. "
                    "Обновляю учетные данные существующей записи."
                )
            )

        try:
            user = User.objects.create_superuser(
                username=username,
                email=email,
                password=password,
            )
        except IntegrityError:
            user = User.objects.get(username=username)
            user.set_password(password)

        user.role = "ADMIN"
        user.is_staff = True
        user.is_superuser = True
        user.is_moderator = True
        user.email = email
        user.save(
            update_fields=[
                "password",
                "role",
                "is_staff",
                "is_superuser",
                "is_moderator",
                "email",
            ]
        )

        self.stdout.write(
            self.style.SUCCESS(f"Администратор готов: логин {username}, пароль {password}")
        )

    def _normalize_demo_user(self):
        user = User.objects.filter(username="user").first()
        old_user = User.objects.filter(username="user1").first()

        if old_user and not user:
            old_user.username = "user"
            old_user.email = "user@gmail.com"
            old_user.role = "USER"
            old_user.is_staff = False
            old_user.is_superuser = False
            old_user.is_moderator = False
            old_user.save(
                update_fields=[
                    "username",
                    "email",
                    "role",
                    "is_staff",
                    "is_superuser",
                    "is_moderator",
                ]
            )
            self.stdout.write("Пользователь user1 переименован в user")
        elif user:
            user.email = "user@gmail.com"
            user.role = "USER"
            user.is_staff = False
            user.is_superuser = False
            user.is_moderator = False
            user.save(update_fields=["email", "role", "is_staff", "is_superuser", "is_moderator"])
            if old_user:
                try:
                    old_user.delete()
                    self.stdout.write("Дубликат user1 удален")
                except ProtectedError:
                    old_user.username = f"legacy_user_{old_user.id}"
                    old_user.email = ""
                    old_user.save(update_fields=["username", "email"])
                    self.stdout.write(
                        self.style.WARNING(
                            f"user1 связан с заявками, поэтому переименован в {old_user.username}"
                        )
                    )

    def _remove_legacy_admins(self, username: str):
        legacy_users = User.objects.filter(username__in=["админ"]).exclude(username=username)
        legacy_users = legacy_users | User.objects.filter(email="admin@example.local").exclude(username=username)

        for legacy_user in legacy_users.distinct():
            try:
                legacy_user.delete()
                self.stdout.write(f"Удален старый админ: {legacy_user.username}")
            except ProtectedError:
                legacy_user.username = f"legacy_admin_{legacy_user.id}"
                legacy_user.email = ""
                legacy_user.role = "USER"
                legacy_user.is_staff = False
                legacy_user.is_superuser = False
                legacy_user.is_moderator = False
                legacy_user.save(
                    update_fields=[
                        "username",
                        "email",
                        "role",
                        "is_staff",
                        "is_superuser",
                        "is_moderator",
                    ]
                )
                self.stdout.write(
                    self.style.WARNING(
                        f"Старый админ #{legacy_user.id} связан с заявками, поэтому переименован."
                    )
                )
