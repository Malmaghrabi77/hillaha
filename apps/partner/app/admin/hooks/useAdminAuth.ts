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
        console.error("Supabase client not initialized");
        setAuth(prev => ({ ...prev, loading: false }));
        router.push("/login");
        return;
      }

      // Get current session
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.user) {
        console.log("No active session");
        setAuth(prev => ({ ...prev, loading: false }));
        router.push("/login");
        return;
      }

      const userId = sessionData.session.user.id;
      const email = sessionData.session.user.email || "";

      // Get user role and admin_type
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, admin_type")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        setAuth(prev => ({ ...prev, loading: false }));
        router.push("/login");
        return;
      }

      if (!profile) {
        console.error("Profile not found for user:", userId);
        setAuth(prev => ({ ...prev, loading: false }));
        router.push("/login");
        return;
      }

      const role = (profile as any)?.role as string;
      const adminType = (profile as any)?.admin_type as string | null;

      if (!role) {
        console.error("Role not found in profile");
        setAuth(prev => ({ ...prev, loading: false }));
        router.push("/login");
        return;
      }

      const isAdmin = role === "admin" || role === "super_admin";

      if (!isAdmin) {
        console.warn("User does not have admin role. Role:", role);
        setAuth(prev => ({ ...prev, loading: false }));
        router.push("/dashboard");
        return;
      }

      const isSuperAdmin = role === "super_admin";
      const isRegionalManager = adminType === "regional_manager";
      const isRegularAdmin = adminType === "regular_admin";

      console.log("Admin auth successful.", {
        userId,
        role,
        adminType,
        isSuperAdmin,
        isRegionalManager,
        isRegularAdmin,
      });

      setAuth({
        user: { id: userId, email },
        role: role as any,
        isAdmin: true,
        isSuperAdmin,
        isRegionalManager,
        isRegularAdmin,
        adminType: (adminType as "regional_manager" | "regular_admin") || null,
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
