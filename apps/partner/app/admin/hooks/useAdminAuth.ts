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

      // Get user role
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
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

      console.log("Admin auth successful. User:", userId, "Role:", role);

      setAuth({
        user: { id: userId, email },
        role: role as any,
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
