import { useMemo } from 'react';
import { getCustomerSupabase } from '../../lib/supabase';

/**
 * ✅ Centralized Supabase Client Hook
 * يوفر وصول آمن وموحد إلى عميل Supabase
 * يستخدم AsyncStorage لحفظ الجلسة في React Native
 *
 * الاستخدام:
 * const supabase = useSupabase();
 * if (!supabase) return; // Handle case when Supabase is not available
 *
 * const { data } = await supabase.from('table').select('*');
 */

export const useSupabase = () => {
  return useMemo(() => {
    try {
      return getCustomerSupabase();
    } catch {
      return null;
    }
  }, []);
};

/**
 * ✅ Type-safe Supabase method wrapper
 * للعمليات الموحدة
 */
export const withSupabase = async <T,>(
  operation: (supabase: ReturnType<typeof useSupabase>) => Promise<T>,
  fallback?: T
): Promise<T | undefined> => {
  try {
    const supabase = getCustomerSupabase();
    if (!supabase) return fallback;
    return await operation(supabase);
  } catch {
    return fallback;
  }
};
