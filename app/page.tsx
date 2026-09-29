"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";

import {
  AuthScreen,
  LoadingScreen,
  PasswordRecoveryScreen,
  SetupScreen,
} from "@/components/auth-screen";
import { Dashboard } from "@/components/dashboard/dashboard";
import { Toaster } from "@/components/ui/sonner";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export default function Home() {
  const supabase = getSupabaseClient();
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
      if (event === "SIGNED_OUT") setPasswordRecovery(false);
      setSession(nextSession);
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  let content;
  if (!isSupabaseConfigured || !supabase) {
    content = <SetupScreen />;
  } else if (!authReady) {
    content = <LoadingScreen />;
  } else if (passwordRecovery && session) {
    content = (
      <PasswordRecoveryScreen
        supabase={supabase}
        onComplete={() => setPasswordRecovery(false)}
      />
    );
  } else if (!session) {
    content = <AuthScreen supabase={supabase} />;
  } else {
    content = (
      <Dashboard
        supabase={supabase}
        user={session.user}
        onSignOut={async () => {
          const { error } = await supabase.auth.signOut();
          if (error) {
            toast.error("Could not sign out", { description: error.message });
          }
        }}
      />
    );
  }

  return (
    <>
      {content}
      <Toaster position="bottom-right" richColors />
    </>
  );
}
