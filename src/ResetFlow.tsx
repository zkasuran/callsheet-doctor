import { useState } from "react";
import { useConvex } from "convex/react";
import { api } from "../convex/_generated/api";
import { Button, Card, Icon, Spinner } from "./ui";
import { assertPasskey } from "./lib/passkey";

type Step = "email" | "choose" | "totp" | "newpass" | "done";

// Password reset without email. The user proves a second factor they enrolled while
// signed in (a TOTP code or a passkey), which returns a short-lived token that unlocks
// setting a new password.
export default function ResetFlow({ onBack }: { onBack: () => void }) {
  const convex = useConvex();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [factors, setFactors] = useState<{ totp: boolean; passkeys: string[] } | null>(null);
  const [code, setCode] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function findFactors(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const f = await convex.query(api.reset.factors, { email });
      if (!f.totp && f.passkeys.length === 0) {
        setError(
          "No second factor is set for this email, so there is no way to reset it. Sign in, then add an authenticator or a passkey under Security.",
        );
        return;
      }
      setFactors(f);
      setStep("choose");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    setBusy(true);
    setError(null);
    try {
      const res = await convex.action(api.reset.verifyTotpReset, { email, code });
      if (res.ok && res.token) {
        setToken(res.token);
        setStep("newpass");
      } else {
        setError("That code did not match. Enter the current code from your app.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function verifyPasskey() {
    setBusy(true);
    setError(null);
    try {
      const begin = await convex.query(api.reset.beginPasskeyReset, { email });
      if (!begin) {
        setError("No passkey found for this email.");
        return;
      }
      const assertion = await assertPasskey({
        challenge: begin.challenge,
        credentialIds: begin.credentialIds,
      });
      const res = await convex.action(api.reset.verifyPasskeyReset, {
        email,
        challenge: begin.challenge,
        ...assertion,
      });
      if (res.ok && res.token) {
        setToken(res.token);
        setStep("newpass");
      } else {
        setError("Passkey could not be verified. Try again.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg.includes("NotAllowed") ? "Passkey prompt was dismissed." : msg);
    } finally {
      setBusy(false);
    }
  }

  async function setNewPassword() {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const res = await convex.action(api.reset.setPassword, { email, token, newPassword: password });
      if (res.ok) {
        setStep("done");
      } else {
        setError(res.error ?? "Could not set the password. Start again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-full place-items-center px-6 py-10">
      <div className="w-full max-w-sm">
        <button
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80"
        >
          <Icon.Arrow className="h-3.5 w-3.5 rotate-180" /> Back to sign in
        </button>

        <Card className="p-6">
          <h2 className="text-lg font-semibold">Reset your password</h2>
          <p className="mt-1 text-sm text-white/45">
            There is no email reset. Prove a second factor you set up to choose a new password.
          </p>

          {error && <p className="mt-4 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p>}

          {/* Step: email */}
          {step === "email" && (
            <form onSubmit={findFactors} className="mt-5 space-y-3">
              <input
                className="w-full rounded-lg border border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-400/60"
                type="email"
                placeholder="you@studio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? <Spinner /> : "Continue"}
              </Button>
            </form>
          )}

          {/* Step: choose a factor */}
          {step === "choose" && factors && (
            <div className="mt-5 space-y-2">
              {factors.totp && (
                <Button variant="ghost" className="w-full justify-start" onClick={() => setStep("totp")}>
                  <Icon.Bolt className="h-4 w-4 text-emerald-300" /> Use my authenticator code
                </Button>
              )}
              {factors.passkeys.length > 0 && (
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  disabled={busy}
                  onClick={verifyPasskey}
                >
                  {busy ? <Spinner /> : <><Icon.Bolt className="h-4 w-4 text-sky-300" /> Use a passkey</>}
                </Button>
              )}
            </div>
          )}

          {/* Step: TOTP code */}
          {step === "totp" && (
            <div className="mt-5 space-y-3">
              <p className="text-sm text-white/50">Enter the 6-digit code from your authenticator app.</p>
              <input
                className="w-full rounded-lg border border-white/15 bg-transparent px-3 py-2 text-center text-lg tracking-[0.3em] outline-none focus:border-emerald-400/60"
                placeholder="000000"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
              <Button className="w-full" disabled={busy || code.length !== 6} onClick={verifyCode}>
                {busy ? <Spinner /> : "Verify"}
              </Button>
            </div>
          )}

          {/* Step: new password */}
          {step === "newpass" && (
            <div className="mt-5 space-y-3">
              <p className="text-sm text-white/50">Factor verified. Choose a new password.</p>
              <input
                className="w-full rounded-lg border border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-400/60"
                type="password"
                placeholder="New password (8+ characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button className="w-full" disabled={busy || password.length < 8} onClick={setNewPassword}>
                {busy ? <Spinner /> : "Set new password"}
              </Button>
            </div>
          )}

          {/* Step: done */}
          {step === "done" && (
            <div className="mt-5 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
                <Icon.Check className="h-6 w-6" />
              </span>
              <p className="mt-3 text-sm text-white/70">Password updated. Sign in with your new password.</p>
              <Button className="mt-4 w-full" onClick={onBack}>
                Back to sign in
              </Button>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
