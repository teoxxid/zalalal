// frontend/src/hooks/useCachedFetch.js
import { useState, useEffect } from 'react';

const CACHE_PREFIX = 'voltmarket_cache_';
const DEFAULT_TTL = 300000; // 5 минут

export function useCachedFetch(url, ttl = DEFAULT_TTL) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cacheStatus, setCacheStatus] = useState('MISS'); // HIT | MISS | ERROR

  useEffect(() => {
    const cacheKey = CACHE_PREFIX + url;
    const now = Date.now();

    // 1. Проверяем localStorage
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { data: cachedData, timestamp } = JSON.parse(cached);
        if (now - timestamp < ttl) {
          console.log(`[CACHE] HIT for ${url}`);
          setData(cachedData);
          setCacheStatus('HIT');
          setLoading(false);
          return;
        } else {
          console.log(`[CACHE] TTL expired for ${url}`);
          localStorage.removeItem(cacheKey);
        }
      } catch (e) {
        localStorage.removeItem(cacheKey);
      }
    }

    // 2. Cache MISS -> fetch
    console.log(`[CACHE] MISS for ${url}. Fetching from API...`);
    setCacheStatus('MISS');
    setLoading(true);

    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        localStorage.setItem(cacheKey, JSON.stringify({ data: json, timestamp: now }));
        console.log(`[CACHE] SET for ${url}. TTL: ${ttl}ms`);
      })
      .catch((err) => {
        console.error(`[CACHE] ERROR fetching ${url}:`, err);
        setCacheStatus('ERROR');
      })
      .finally(() => setLoading(false));
  }, [url, ttl]);

  return { data, loading, cacheStatus };
}
