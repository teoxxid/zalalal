# backend/main/cache_utils.py
import logging
from django.core.cache import cache
from django.http import HttpResponse

logger = logging.getLogger("cache")


def get_cached_or_fetch(key, fetch_func, ttl=300):
    """
    Проверяет кэш. Если есть -> HIT, если нет -> вызывает fetch_func, сохраняет -> MISS.
    Возвращает (data, is_hit)
    """
    data = cache.get(key)
    if data is not None:
        logger.info(f"CACHE HIT | key={key} | ttl={ttl}s")
        return data, True

    logger.info(f"CACHE MISS | key={key} | fetching from DB...")
    data = fetch_func()
    cache.set(key, data, ttl)
    logger.info(f"CACHE SET | key={key} | ttl={ttl}s")
    return data, False


def invalidate_cache_pattern(pattern):
    """Инвалидирует ключи по паттерну (для Django/Redis)"""
    try:
        from django.core.cache import caches

        cache_obj = caches["default"]
        # redis-cli KEYS pattern
        keys = cache_obj.client.keys(pattern)
        if keys:
            cache_obj.delete_many(keys)
            logger.warning(
                f"CACHE INVALIDATE | pattern={pattern} | deleted={len(keys)} keys"
            )
        else:
            logger.info(f"CACHE INVALIDATE | pattern={pattern} | no keys found")
    except Exception as e:
        logger.error(f"CACHE ERROR | invalidation failed | error={str(e)}")
