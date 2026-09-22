import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button, Card, Icon, Spinner } from "./ui";

// Upgrade the current guest to a real account in place. Because the guest session is
// still active, signing up with a password links the new credentials to the existing
// anonymous user (see convex/auth.ts createOrUpdateUser), so every production, contact
// and worked errand carries over. Nothing is recreated.
export default function UpgradeAccount({ onClose }: { onClose: () => void }) {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // flow: signUp while the guest session is live -> upgrade in place.
      await signIn("password", { email, password, flow: "signUp" });
      onClose(); // same workspace, now a real account
    } catch (err) {
      const detail = String(err instanceof Error ? err.message : err).toLowerCase();
      if (detail.includes("already") || detail.includes("exists") || detail.includes("taken")) {
        setError("That email is already registered. Use a different email to save this work.");
      } else {
        setError("Could not create the account. Try a different email.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-6">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <Card className="relative w-full max-w-sm p-6">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Icon.Sparkles className="h-4 w-4 text-emerald-300" /> Save your work
          </h3>
          <button onClick={onClose} className="rounded p-1 text-white/50 hover:text-white/80" aria-label="Close">
            <Icon.Close className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 text-sm text-white/50">
          Add an email and password to keep this workspace. Everything you see stays, you just get a
          way back in.
        </p>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <input
            className="w-full rounded-lg border border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-400/60"
            type="email"
            placeholder="you@studio.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="w-full rounded-lg border border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-400/60"
            type="password"
            placeholder="Password (8+ characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? <Spinner /> : "Create account & keep my work"}
          </Button>
        </form>
        <p className="mt-3 text-center text-[11px] text-white/35">
          Then set up an authenticator or passkey under Security to enable password reset.
        </p>
      </Card>
    </div>
  );
}
