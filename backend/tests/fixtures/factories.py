import factory
from factory.django import DjangoModelFactory
from django.contrib.auth import get_user_model
from main.models import Service, Order, OrderItem

User = get_user_model()


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User

    username = factory.Sequence(lambda n: f"testuser{n}")
    email = factory.LazyAttribute(lambda obj: f"{obj.username}@test.com")
    password = factory.PostGenerationMethodCall("set_password", "TestPass123!")
    role = "USER"

    @factory.post_generation
    def confirm_password(obj, create, extracted, **kwargs):
        if create:
            obj.save()


class AdminUserFactory(UserFactory):
    role = "ADMIN"
    username = factory.Sequence(lambda n: f"admin{n}")


class ServiceFactory(DjangoModelFactory):
    class Meta:
        model = Service

    name = factory.Faker("word")
    price = factory.Faker("pydecimal", left_digits=5, right_digits=2, positive=True)
    description = factory.Faker("sentence")
    category = factory.Faker("word")
    brand = factory.Faker("company")
    status = "active"
    weight = factory.Faker("pydecimal", left_digits=2, right_digits=2, positive=True)


class OrderFactory(DjangoModelFactory):
    class Meta:
        model = Order

    user = factory.SubFactory(UserFactory)
    status = "draft"
    total_amount = 0
    delivery_address = factory.Faker("address")
