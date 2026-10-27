"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import { supabase } from "@/lib/supabase";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/login";
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(!isLogin);

  useEffect(() => {
    let active = true;

    async function verifySession() {
      if (isLogin) {
        if (active) {
          setChecking(false);
        }
        return;
      }

      const { data, error } = await supabase.auth.getUser();

      if (!active) {
        return;
      }

      if (error || !data.user) {
        await supabase.auth.signOut();
        router.replace("/login");
        setAuthenticated(false);
        setChecking(false);
        return;
      }

      await supabase
        .from("staff")
        .update({ auth_user_id: data.user.id })
        .ilike("email", data.user.email || "")
        .is("auth_user_id", null);

      setAuthenticated(true);
      setChecking(false);
    }

    void verifySession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && !isLogin) {
        setAuthenticated(false);
        router.replace("/login");
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [isLogin, router]);

  if (isLogin) {
    return <main className="min-h-screen">{children}</main>;
  }

  if (checking || !authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-medium text-slate-500">
        Checking secure session…
      </main>
    );
  }

  return (
    <>
      <Sidebar />
      <main className="min-h-screen lg:pl-64">{children}</main>
    </>
  );
}
