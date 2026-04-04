"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@hillaha/core";
import type { AdminRole } from "@hillaha/core";

export interface AdminAuthContext {
  user: { id: string; email: string } | null;
  role: AdminRole | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isRegionalManager: boolean;
  isRegularAdmin: boolean;
  isAccountant: boolean;
  isCustomerService: boolean;
  adminType: "regional_manager" | "regular_admin" | null;
  loading: boolean;
}

export function useAdminAuth(): AdminAuthContext {
  const router = useRouter();
  const [auth, setAuth] = useState<AdminAuthContext>({
    user: null,
    role: null,
    isAdmin: false,
    isSuperAdmin: false,
    isRegionalManager: false,
    isRegularAdmin: false,
    isAccountant: false,
    isCustomerService: false,
    adminType: null,
    loading: true,
  });

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        setAuth(prev => ({ ...prev, loading: false }));
        router.push("/login");
        return;
      }

      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        setAuth(prev => ({ ...prev, loading: false }));
        router.push("/login");
        return;
      }

      const userId = userData.user.id;
      const email = userData.user.email || "";

      // Get user role and admin_type
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, admin_type")
        .eq("id", userId)
        .single();

      if (profileError) {
        setAuth(prev => ({ ...prev, loading: false }));
        router.push("/login");
        return;
      }

      if (!profile) {
        setAuth(prev => ({ ...prev, loading: false }));
        router.push("/login");
        return;
      }

      const role = (profile as any)?.role as string;
      const adminType = (profile as any)?.admin_type as string | null;

      if (!role) {
        setAuth(prev => ({ ...prev, loading: false }));
        router.push("/login");
        return;
      }

      const isAdmin = role === "admin" || role === "super_admin" || role === "accountant" || role === "customer_service";

      if (!isAdmin) {
        setAuth(prev => ({ ...prev, loading: false }));
        router.push("/dashboard");
        return;
      }

      const isSuperAdmin = role === "super_admin";
      const isAccountant = role === "accountant";
      const isCustomerService = role === "customer_service";
      const isRegionalManager = adminType === "regional_manager";
      const isRegularAdmin = adminType === "regular_admin";


      setAuth({
        user: { id: userId, email },
        role: role as any,
        isAdmin: true,
        isSuperAdmin,
        isRegionalManager,
        isRegularAdmin,
        isAccountant,
        isCustomerService,
        adminType: (adminType as "regional_manager" | "regular_admin") || null,
        loading: false,
      });
    } catch {
      setAuth(prev => ({ ...prev, loading: false }));
      router.push("/login");
    }
  };

  return auth;
}
