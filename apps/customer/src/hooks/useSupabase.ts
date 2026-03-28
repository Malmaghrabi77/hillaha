import { useCallback } from 'react';

/**
 * ✅ Centralized Supabase Client Hook
 * يوفر وصول آمن وموحد إلى عميل Supabase
 *
 * الاستخدام:
 * const supabase = useSupabase();
 * if (!supabase) return; // Handle case when Supabase is not available
 *
 * const { data } = await supabase.from('table').select('*');
 */

export const useSupabase = () => {
  return useCallback(() => {
    try {
      return (require("@hillaha/core") as any).getSupabase?.() ?? null;
    } catch {
      return null;
    }
  }, [])();
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
    const supabase = (() => {
      try {
        return (require("@hillaha/core") as any).getSupabase?.() ?? null;
      } catch {
        return null;
      }
    })();

    if (!supabase) return fallback;
    return await operation(supabase);
  } catch (error) {
    console.error("Supabase operation error:", error);
    return fallback;
  }
};
