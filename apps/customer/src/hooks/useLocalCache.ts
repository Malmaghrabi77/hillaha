import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';

/**
 * ✅ Local Cache Hook
 * استخدم البيانات المحفوظة محلياً لتسريع التحميل
 *
 * مثال الاستخدام:
 * const { data, loading, saveCache, clearCache } = useLocalCache('my_partners');
 *
 * // حفظ البيانات
 * await saveCache(partnersDataFromAPI);
 *
 * // مسح البيانات
 * await clearCache();
 */

interface UseCacheReturn<T> {
  data: T | null;
  loading: boolean;
  saveCache: (newData: T) => Promise<void>;
  clearCache: () => Promise<void>;
}

export const useLocalCache = <T = any>(key: string): UseCacheReturn<T> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCache();
  }, [key]);

  const loadCache = async () => {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (cached) {
        setData(JSON.parse(cached) as T);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const saveCache = async (newData: T) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(newData));
      setData(newData);
    } catch {
    }
  };

  const clearCache = async () => {
    try {
      await AsyncStorage.removeItem(key);
      setData(null);
    } catch {
    }
  };

  return { data, loading, saveCache, clearCache };
};
