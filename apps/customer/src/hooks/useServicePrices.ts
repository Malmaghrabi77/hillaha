import { useState, useEffect } from "react";
import { useSupabase } from "./useSupabase";

export interface ServicePrice {
  id: string;
  category: string;
  service_key: string;
  label_ar: string;
  description_ar: string;
  icon: string;
  price: number;
  price_unit: string;
  sort_order: number;
}

export function useServicePrices(category: string) {
  const supabase = useSupabase();
  const [prices, setPrices] = useState<ServicePrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    (supabase as any)
      .from("service_prices")
      .select("*")
      .eq("category", category)
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }: any) => {
        if (data?.length) setPrices(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [category, supabase]);

  return { prices, loading };
}
