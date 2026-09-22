import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button, Card, Icon } from "./ui";
import ResetFlow from "./ResetFlow";

export default function SignIn({ onBack }: { onBack?: () => void }) {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signUp");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState(false);

  if (resetting) return <ResetFlow onBack={() => setResetting(false)} />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn("password", { email, password, flow });
    } catch (err) {
      const detail = String(err instanceof Error ? err.message : err).toLowerCase();
      if (flow === "signUp") {
        if (detail.includes("already") || detail.includes("exists") || detail.includes("taken")) {
          setError("That email is already registered. Switch to Sign in below.");
        } else if (password.length < 8) {
          setError("Password must be at least 8 characters");
        } else {
          setError("Could not create that account. Try signing in instead.");
        }
      } else {
        setError("Wrong email or password");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-full place-items-center px-6 py-10">
      <div className="w-full max-w-sm">
        {onBack && (
          <button
            onClick={onBack}
            className="mb-6 inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80"
          >
            <Icon.Arrow className="h-3.5 w-3.5 rotate-180" /> Back to home
          </button>
        )}

        <div className="mb-6 flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/20 text-emerald-300">
            <Icon.Rx className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold tracking-tight">Callsheet Doctor</p>
            <p className="text-xs text-white/40">Diagnose the production. Cure the gaps.</p>
          </div>
        </div>

        <Card className="p-6">
          <h2 className="text-lg font-semibold">
            {flow === "signUp" ? "Create your account" : "Welcome back"}
          </h2>
          <p className="mt-1 text-sm text-white/45">
            One workspace per production. Your inbox does the chasing.
          </p>
          <form onSubmit={submit} className="mt-5 space-y-3">
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
              {flow === "signUp" ? "Sign up" : "Sign in"}
            </Button>
          </form>
          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              className="text-xs text-white/50 hover:text-white/80"
              onClick={() => setFlow(flow === "signUp" ? "signIn" : "signUp")}
            >
              {flow === "signUp" ? "Already have an account? Sign in" : "Need an account? Sign up"}
            </button>
            <button
              className="text-xs text-white/50 hover:text-white/80"
              onClick={() => setResetting(true)}
            >
              Forgot password?
            </button>
          </div>
        </Card>
      </div>
    </main>
  );
}
