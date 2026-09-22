import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import QRCode from "qrcode";
import { api } from "../../convex/_generated/api";
import { Badge, Button, Card, Empty, Icon, Spinner, ago } from "../ui";
import PageHeader from "./PageHeader";
import { registerPasskey } from "../lib/passkey";

export default function Security() {
  const status = useQuery(api.mfa.status);

  const beginTotp = useMutation(api.mfa.beginTotp);
  const confirmTotp = useAction(api.mfa.confirmTotp);
  const disableTotp = useMutation(api.mfa.disableTotp);
  const beginPasskey = useMutation(api.mfa.beginPasskey);
  const finishPasskey = useMutation(api.mfa.finishPasskey);
  const removePasskey = useMutation(api.mfa.removePasskey);

  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ text: string; kind: "ok" | "err" } | null>(null);

  function say(text: string, kind: "ok" | "err" = "ok") {
    setNote({ text, kind });
  }

  async function startTotp() {
    setBusy("totp-begin");
    setNote(null);
    try {
      const { secret, uri } = await beginTotp({});
      setSecret(secret);
      setQr(await QRCode.toDataURL(uri, { margin: 1, width: 200 }));
    } catch (e) {
      say(e instanceof Error ? e.message : String(e), "err");
    } finally {
      setBusy(null);
    }
  }

  async function verifyTotp() {
    setBusy("totp-confirm");
    setNote(null);
    try {
      const res = await confirmTotp({ code });
      if (res.ok) {
        setQr(null);
        setSecret(null);
        setCode("");
        say("Authenticator 2FA is on. You can now reset your password with a code.");
      } else {
        say("That code did not match. Check the app and try the current code.", "err");
      }
    } catch (e) {
      say(e instanceof Error ? e.message : String(e), "err");
    } finally {
      setBusy(null);
    }
  }

  async function addPasskey() {
    setBusy("passkey");
    setNote(null);
    try {
      const opts = await beginPasskey({});
      const reg = await registerPasskey(opts);
      await finishPasskey({
        challenge: opts.challenge,
        attestationObject: reg.attestationObject,
        label: reg.label,
      });
      say("Passkey added. You can now reset your password with it.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      say(msg.includes("NotAllowed") ? "Passkey prompt was dismissed." : msg, "err");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <PageHeader
        title="Security"
        subtitle="Set up a second factor. It is also how you reset a forgotten password, since there is no email reset."
      />

      {note && (
        <p
          className={`mb-4 rounded-lg px-3 py-2 text-xs ${
            note.kind === "err" ? "bg-rose-500/10 text-rose-300" : "bg-emerald-500/10 text-emerald-300"
          }`}
        >
          {note.text}
        </p>
      )}

      {/* TOTP */}
      <Card className="mb-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Icon.Bolt className="h-4 w-4 text-emerald-300" /> Authenticator app (TOTP)
            </h3>
            <p className="mt-1 text-sm text-white/45">
              Use Google Authenticator, Authy, 1Password or any TOTP app.
            </p>
          </div>
          {status?.totpEnabled ? (
            <Badge tone="confirmed">
              <Icon.Check className="h-3 w-3" /> On
            </Badge>
          ) : (
            <Badge tone="neutral">Off</Badge>
          )}
        </div>

        {status?.totpEnabled ? (
          <Button
            variant="danger"
            size="sm"
            className="mt-4"
            disabled={busy === "disable"}
            onClick={async () => {
              setBusy("disable");
              try {
                await disableTotp({});
                say("Authenticator 2FA turned off.");
              } finally {
                setBusy(null);
              }
            }}
          >
            Turn off
          </Button>
        ) : qr ? (
          <div className="mt-4 flex flex-col gap-4 sm:flex-row">
            <div className="shrink-0">
              <img src={qr} alt="Scan this QR in your authenticator app" className="rounded-lg bg-white p-2" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-white/50">
                Scan the QR, or enter this key by hand:
              </p>
              <code className="mt-1 block break-all rounded-lg bg-black/30 px-2 py-1.5 text-[11px] text-emerald-200">
                {secret}
              </code>
              <p className="mt-3 text-xs text-white/50">Then enter the 6-digit code it shows:</p>
              <div className="mt-1.5 flex gap-2">
                <input
                  className="w-32 rounded-lg border border-white/15 bg-transparent px-3 py-1.5 text-center text-sm tracking-widest outline-none focus:border-emerald-400/60"
                  placeholder="000000"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                />
                <Button size="sm" disabled={busy === "totp-confirm" || code.length !== 6} onClick={verifyTotp}>
                  {busy === "totp-confirm" ? <Spinner /> : "Verify & enable"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Button size="sm" className="mt-4" disabled={busy === "totp-begin"} onClick={startTotp}>
            {busy === "totp-begin" ? <Spinner /> : "Set up authenticator"}
          </Button>
        )}
      </Card>

      {/* Passkeys */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Icon.Bolt className="h-4 w-4 text-sky-300" /> Passkeys
            </h3>
            <p className="mt-1 text-sm text-white/45">
              Touch ID, Windows Hello, a phone or a security key. Reset your password by verifying one.
            </p>
          </div>
          <Button size="sm" disabled={busy === "passkey"} onClick={addPasskey}>
            {busy === "passkey" ? <Spinner /> : <><Icon.Plus className="h-4 w-4" /> Add passkey</>}
          </Button>
        </div>

        <div className="mt-4">
          {!status ? (
            <Spinner />
          ) : status.passkeys.length === 0 ? (
            <Empty icon={<Icon.Bolt className="h-7 w-7" />} title="No passkeys yet" body="Add one to use it as a reset factor." />
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {status.passkeys.map((p: { credentialId: string; label?: string; createdAt: number }) => (
                <li key={p.credentialId} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-sky-500/12 text-sky-300">
                      <Icon.Bolt className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm">{p.label ?? "Passkey"}</p>
                      <p className="text-[11px] text-white/40">added {ago(p.createdAt)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => void removePasskey({ credentialId: p.credentialId })}
                    className="text-xs text-white/40 hover:text-rose-300"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
