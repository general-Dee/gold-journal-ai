"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { friendlyAuthErrorMessage } from "@/lib/auth-errors";
import { Button, Card, Input, Label } from "@/components/ui/primitives";

export default function LoginPage() {
  const { login, signup, resetPassword, user } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [busy, setBusy] = useState(false);

  if (user) {
    router.replace("/");
  }

  function switchMode(next: "login" | "signup" | "reset") {
    setMode(next);
    setError(null);
    setResetSent(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") {
        await login(email, password);
        router.replace("/");
      } else if (mode === "signup") {
        await signup(email, password);
        router.replace("/");
      } else {
        try {
          await resetPassword(email);
        } catch (err) {
          const code = (err as { code?: string } | null)?.code;
          if (code !== "auth/user-not-found") throw err;
        }
        setResetSent(true);
      }
    } catch (err) {
      setError(friendlyAuthErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="font-display text-2xl font-semibold text-ink">
            Gold<span className="text-gold-bright">Journal</span>
          </div>
          <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">XAUUSD Trading Desk</div>
        </div>

        <Card className="p-6">
          {mode === "reset" && resetSent ? (
            <div className="text-sm leading-relaxed text-ink">
              If an account exists for <span className="text-gold-bright">{email}</span>, a password reset link is on its way.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@desk.com" />
              </div>
              {mode !== "reset" && (
                <div>
                  <div className="flex items-center justify-between">
                    <Label>Password</Label>
                    {mode === "login" && (
                      <button
                        type="button"
                        onClick={() => switchMode("reset")}
                        className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-faint hover:text-gold-bright"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                </div>
              )}
              {error && <div className="rounded-md border border-loss/30 bg-loss/10 px-3 py-2 text-xs text-loss">{error}</div>}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Please wait…" : mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
              </Button>
            </form>
          )}
        </Card>

        <div className="mt-4 text-center text-xs text-muted">
          {mode === "reset" ? (
            <button onClick={() => switchMode("login")} className="text-gold-bright hover:underline">
              Back to sign in
            </button>
          ) : (
            <>
              {mode === "login" ? "New to the desk?" : "Already have an account?"}{" "}
              <button
                onClick={() => switchMode(mode === "login" ? "signup" : "login")}
                className="text-gold-bright hover:underline"
              >
                {mode === "login" ? "Create an account" : "Sign in"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
