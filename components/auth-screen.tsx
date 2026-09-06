"use client";

import { FormEvent, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ArrowRight,
  Cloud,
  Database,
  Loader2,
  LockKeyhole,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthMode = "sign-in" | "sign-up" | "forgot-password";

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-7 flex items-center justify-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 font-mono text-sm font-bold text-primary">
            JT
          </div>
          <div>
            <p className="text-lg font-semibold tracking-[-0.025em]">JobTrack by Nick Vivarelli</p>
            <p className="text-xs text-muted-foreground">Your search, synchronized</p>
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}

export function LoadingScreen() {
  return (
    <AuthShell>
      <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
        Loading your workspace…
      </div>
    </AuthShell>
  );
}

export function SetupScreen() {
  return (
    <AuthShell>
      <Card className="border-[#ffb562]/25 bg-card/90 shadow-[0_24px_70px_rgba(0,0,0,.28)]">
        <CardContent className="px-6">
          <div className="flex size-11 items-center justify-center rounded-xl border border-[#ffb562]/20 bg-[#ffb562]/10 text-[#ffca8d]">
            <Database className="size-5" aria-hidden="true" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-[-0.04em]">
            Connect the database
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Add the two Supabase variables to this Vercel project, then redeploy.
          </p>
          <div className="mt-5 space-y-2 rounded-lg border border-white/[0.07] bg-black/15 p-4 font-mono text-xs text-[#b8c8d5]">
            <p>NEXT_PUBLIC_SUPABASE_URL</p>
            <p>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</p>
          </div>
        </CardContent>
      </Card>
    </AuthShell>
  );
}

export function AuthScreen({ supabase }: { supabase: SupabaseClient }) {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      if (mode === "forgot-password") {
        const { error: resetError } =
          await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin,
          });
        if (resetError) throw resetError;
        setNotice(
          "If an account exists for this email, a reset link is on its way.",
        );
      } else if (mode === "sign-in") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setNotice("Check your email to confirm the account, then come back and sign in.");
        }
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Authentication failed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
    setNotice(null);
  }

  const title =
    mode === "sign-in"
      ? "Welcome back"
      : mode === "sign-up"
        ? "Create your account"
        : "Reset your password";
  const description =
    mode === "sign-in"
      ? "Sign in to open your application dashboard."
      : mode === "sign-up"
        ? "Your applications will be private to this account."
        : "Enter your email and we’ll send you a secure reset link.";
  const submitLabel =
    mode === "sign-in"
      ? "Sign in"
      : mode === "sign-up"
        ? "Create account"
        : "Send reset link";

  return (
    <AuthShell>
      <Card className="gap-0 border-white/[0.08] bg-card/90 py-0 shadow-[0_24px_70px_rgba(0,0,0,.28)]">
        <CardContent className="px-6 py-7 sm:px-8 sm:py-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex size-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <LockKeyhole className="size-5" aria-hidden="true" />
            </div>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Cloud className="size-3.5 text-primary" aria-hidden="true" />
              Cloud sync enabled
            </span>
          </div>

          <h1 className="mt-6 text-2xl font-semibold tracking-[-0.04em]">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {description}
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="auth-email">Email</Label>
              <Input
                id="auth-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                autoFocus
              />
            </div>
            {mode !== "forgot-password" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="auth-password">Password</Label>
                  {mode === "sign-in" && (
                    <button
                      type="button"
                      className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                      onClick={() => changeMode("forgot-password")}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete={
                    mode === "sign-in" ? "current-password" : "new-password"
                  }
                  minLength={8}
                  required
                />
              </div>
            )}

            {error && (
              <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-sm text-[#ffadb2]">
                {error}
              </p>
            )}
            {notice && (
              <p className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2.5 text-sm leading-6 text-[#9af1dc]">
                {notice}
              </p>
            )}

            <Button className="w-full" type="submit" disabled={submitting}>
              {submitting ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <ArrowRight aria-hidden="true" />
              )}
              {submitLabel}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "sign-in"
              ? "First time here?"
              : mode === "sign-up"
                ? "Already have an account?"
                : "Remembered your password?"}{" "}
            <button
              type="button"
              className="font-medium text-primary underline-offset-4 hover:underline"
              onClick={() =>
                changeMode(mode === "sign-in" ? "sign-up" : "sign-in")
              }
            >
              {mode === "sign-in" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </CardContent>
      </Card>
    </AuthShell>
  );
}

export function PasswordRecoveryScreen({
  supabase,
  onComplete,
}: {
  supabase: SupabaseClient;
  onComplete: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) throw updateError;

      window.history.replaceState(null, "", window.location.pathname);
      toast.success("Password updated");
      onComplete();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Your password could not be updated. Please request a new link.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <Card className="gap-0 border-white/[0.08] bg-card/90 py-0 shadow-[0_24px_70px_rgba(0,0,0,.28)]">
        <CardContent className="px-6 py-7 sm:px-8 sm:py-8">
          <div className="flex size-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <LockKeyhole className="size-5" aria-hidden="true" />
          </div>

          <h1 className="mt-6 text-2xl font-semibold tracking-[-0.04em]">
            Choose a new password
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Your applications and notes will stay connected to this account.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                minLength={8}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="Enter it again"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            {error && (
              <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-sm text-[#ffadb2]">
                {error}
              </p>
            )}

            <Button className="w-full" type="submit" disabled={submitting}>
              {submitting ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <ArrowRight aria-hidden="true" />
              )}
              Save new password
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
