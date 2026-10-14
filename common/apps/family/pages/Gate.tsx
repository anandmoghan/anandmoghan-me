'use client';

import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { useAuth } from "@/common/firebase/AuthProvider";
import { getFirebaseAuth } from "@/common/firebase/client";
import Spinner from "@/common/apps/family/components/Spinner";

/** Email and password sign in, for phones where Google sign in won't complete (iOS home-screen
 * apps, plain http on the home network). Same Firebase accounts, same family allowlist. Signs the
 * anonymous site session in to the existing account. */
function PasswordSignIn() {
  const { signInExisting } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const field = "field !min-h-12";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await signInExisting(email.trim(), password);
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      const text =
        code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found"
          ? "Email or password is wrong. Use \"Set or reset password\" if you've never set one."
          : code === "auth/too-many-requests"
            ? "Too many tries. Wait a few minutes, or reset your password."
            : "Sign in failed, please try again.";
      setMessage({ text, error: true });
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!email.trim()) {
      setMessage({ text: "Type your email first, then tap reset.", error: true });
      return;
    }
    setResetting(true);
    setMessage(null);
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
      setMessage({ text: "Check your inbox for a link to set your password.", error: false });
    } catch {
      setMessage({ text: "Couldn't send the email. Check the address and try again.", error: true });
    } finally {
      setResetting(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="mt-6 w-full space-y-3 border-t border-border pt-6 text-left">
      <p className="text-sm font-semibold text-muted">Or sign in with email</p>
      <input type="email" autoComplete="username" required aria-label="Email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
      <input type="password" autoComplete="current-password" required aria-label="Password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
      <button type="submit" disabled={busy} aria-busy={busy} className="tap flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-border bg-surface font-bold disabled:opacity-60">
        {busy ? <><Spinner />Signing in...</> : "Sign in"}
      </button>
      <button type="button" disabled={resetting} aria-busy={resetting} onClick={() => void reset()} className="tap flex min-h-11 w-full items-center justify-center gap-2 text-sm text-muted underline disabled:opacity-60">
        {resetting ? <><Spinner />Sending...</> : "Set or reset password"}
      </button>
      {message && (
        <p role={message.error ? "alert" : "status"} className={`text-sm ${message.error ? "text-destructive" : "text-muted"}`}>
          {message.text}
        </p>
      )}
    </form>
  );
}

export function SignIn() {
  const { upgradeWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="mx-auto mt-10 flex max-w-sm flex-col items-center px-6 pb-10 text-center">
      <h1 className="text-[1.9rem] font-extrabold">Family</h1>
      <p className="mt-2 text-muted">Health, shopping, style and updates for the family.</p>
      <button
        type="button"
        disabled={busy}
        aria-busy={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await upgradeWithGoogle();
          } catch (err) {
            const code = (err as { code?: string }).code;
            if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") setError("Sign in failed, please try again.");
          } finally {
            setBusy(false);
          }
        }}
        className="tap mt-8 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-domain font-bold text-domain-foreground shadow-card disabled:opacity-60"
      >
        {busy ? <><Spinner />Signing in...</> : "Sign in with Google"}
      </button>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      <PasswordSignIn />
    </div>
  );
}

export function NotAllowed() {
  const { user, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center px-6 pt-20 text-center" data-testid="not-allowed">
      <h1 className="text-2xl font-extrabold">This app is for the Mohan family</h1>
      <p className="mt-3 text-muted">
        You are signed in as {user?.email}, which is not on the family list. If this should work, ask Anand to add your email.
      </p>
      <button type="button" disabled={busy} aria-busy={busy} onClick={() => { setBusy(true); void signOut().finally(() => setBusy(false)); }} className="tap mt-8 flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-border bg-surface font-bold disabled:opacity-60">
        {busy ? <><Spinner />Signing out...</> : "Sign out"}
      </button>
    </div>
  );
}
