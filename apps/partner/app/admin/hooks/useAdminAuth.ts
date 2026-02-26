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
  loading: boolean;
}

export function useAdminAuth(): AdminAuthContext {
  const router = useRouter();
  const [auth, setAuth] = useState<AdminAuthContext>({
    user: null,
    role: null,
    isAdmin: false,
    isSuperAdmin: false,
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

      // Get current session
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.user) {
        setAuth(prev => ({ ...prev, loading: false }));
        router.push("/login");
        return;
      }

      const userId = sessionData.session.user.id;
      const email = sessionData.session.user.email || "";

      // Get user role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      const role = (profile as { role: string } | null)?.role as AdminRole | null;
      const isAdmin = role === "admin" || role === "super_admin";

      if (!isAdmin) {
        setAuth(prev => ({ ...prev, loading: false }));
        router.push("/dashboard");
        return;
      }

      setAuth({
        user: { id: userId, email },
        role,
        isAdmin: true,
        isSuperAdmin: role === "super_admin",
        loading: false,
      });
    } catch (error) {
      console.error("Error checking admin auth:", error);
      setAuth(prev => ({ ...prev, loading: false }));
      router.push("/login");
    }
  };

  return auth;
}
