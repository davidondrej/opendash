"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

function toAuthStatusMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const lowered = message.toLowerCase();

  if (lowered.includes("fetch failed") || lowered.includes("enotfound") || lowered.includes("network")) {
    return "Cannot reach Supabase. Check NEXT_PUBLIC_SUPABASE_URL and your network.";
  }

  return message || "Authentication failed. Please try again.";
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nextPath, setNextPath] = useState("/");
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState("Sign in with your OpenDash account.");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextParam = params.get("next");
    if (nextParam && nextParam.startsWith("/")) {
      setNextPath(nextParam);
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setStatus("Email and password are required.");
      return;
    }

    setIsSubmitting(true);
    setStatus(isSignUpMode ? "Creating account..." : "Signing in...");

    try {
      const supabase = getSupabaseBrowserClient();

      if (isSignUpMode) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (error) {
          setStatus(toAuthStatusMessage(error));
          return;
        }

        if (!data.session) {
          setStatus("Account created. Check your email to confirm your account, then sign in.");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          setStatus(toAuthStatusMessage(error));
          return;
        }
      }

      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      setStatus(toAuthStatusMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center px-4 py-10">
      <section className="od-panel w-full p-6">
        <p className="od-overline">OpenDash Access</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{isSignUpMode ? "Create Account" : "Login"}</h1>
        <p className="mt-2 text-sm text-[var(--od-muted)]">
          {isSignUpMode
            ? "Create a user account to manage files and connected agents."
            : "Sign in to open the dashboard and manage your markdown workspace."}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <label className="block text-sm">
            <span className="mb-1.5 block text-[var(--od-soft-text)]">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="od-input w-full"
              autoComplete="email"
              required
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block text-[var(--od-soft-text)]">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="od-input w-full"
              autoComplete={isSignUpMode ? "new-password" : "current-password"}
              required
            />
          </label>

          <button type="submit" disabled={isSubmitting} className="od-button-primary w-full">
            {isSubmitting ? "Please wait..." : isSignUpMode ? "Create account" : "Sign in"}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between gap-2 text-sm text-[var(--od-muted)]">
          <button
            type="button"
            onClick={() => {
              setIsSignUpMode((prev) => !prev);
              setStatus("Sign in with your OpenDash account.");
            }}
            className="text-[var(--od-soft-text)] underline underline-offset-4"
          >
            {isSignUpMode ? "Already have an account? Sign in" : "First time here? Create an account"}
          </button>
          <Link href="/" className="text-[var(--od-soft-text)] underline underline-offset-4">
            Home
          </Link>
        </div>

        <p className="mt-4 text-sm text-[var(--od-muted)]">{status}</p>
      </section>
    </main>
  );
}
