"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { GoogleButton } from "@/components/ui/GoogleButton";

export default function SignupPage() {
  const { user, signUp, logInWithGoogle, loading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/events");
  }, [user, loading, router]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      await signUp(email.trim().toLowerCase(), password, name.trim());
      router.push("/events");
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setError(null);
    setGoogleBusy(true);
    try {
      await logInWithGoogle();
      router.push("/events");
    } catch (err) {
      setError(friendly(err));
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-brand-50 to-white">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-block px-3 py-1 rounded bg-brand-600 text-white text-xs font-bold uppercase tracking-widest">
            Stag Planner
          </div>
          <h1 className="mt-3 text-2xl font-bold">Create your account</h1>
          <p className="text-sm text-gray-600">Free, takes 30 seconds.</p>
        </div>
        <div className="card space-y-4">
          <GoogleButton onClick={onGoogle} busy={googleBusy} label="Sign up with Google" />

          <div className="flex items-center gap-3 text-xs text-gray-400 uppercase tracking-wide">
            <div className="flex-1 h-px bg-gray-200" />
            <span>or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="label">Name</label>
              <input
                type="text"
                required
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                required
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? "Creating…" : "Create account"}
            </button>
            <p className="text-center text-sm text-gray-600">
              Already have one?{" "}
              <Link href="/login" className="text-brand-700 font-medium hover:underline">
                Log in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}

function friendly(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  if (code.includes("email-already-in-use")) return "That email is already registered.";
  if (code.includes("invalid-email")) return "That email looks invalid.";
  if (code.includes("weak-password")) return "Password is too weak.";
  if (code.includes("popup-closed-by-user") || code.includes("cancelled-popup-request")) return "";
  if (code.includes("popup-blocked")) return "Pop-up was blocked. Allow pop-ups and try again.";
  if (code.includes("operation-not-allowed")) return "Google sign-in isn't enabled in Firebase yet.";
  return (err as Error)?.message ?? "Something went wrong.";
}
