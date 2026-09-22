import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button, Card } from "./ui";

export default function SignIn() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signUp");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn("password", { email, password, flow });
    } catch {
      setError(flow === "signUp" ? "Could not create that account" : "Wrong email or password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex-1 grid place-items-center px-6">
      <Card className="w-full max-w-sm p-6">
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
        <button
          className="mt-4 text-xs text-white/50 hover:text-white/80"
          onClick={() => setFlow(flow === "signUp" ? "signIn" : "signUp")}
        >
          {flow === "signUp" ? "Already have an account? Sign in" : "Need an account? Sign up"}
        </button>
      </Card>
    </main>
  );
}
