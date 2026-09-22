import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Avatar, Button, Card, Empty, Icon, Skeleton, Spinner } from "../ui";
import PageHeader from "./PageHeader";

export default function Contacts({ productionId }: { productionId: Id<"productions"> }) {
  const contacts = useQuery(api.contacts.list, { productionId });
  const createContact = useMutation(api.contacts.create);

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");

  const filtered = (contacts ?? []).filter((c) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      c.name.toLowerCase().includes(s) ||
      c.email.toLowerCase().includes(s) ||
      (c.company ?? "").toLowerCase().includes(s)
    );
  });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setBusy(true);
    try {
      await createContact({ productionId, name, email, company: company || undefined });
      setName("");
      setEmail("");
      setCompany("");
      setAdding(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Contacts"
        subtitle="Vendors and venues sourced by Firecrawl, plus anyone you add by hand."
        actions={
          <Button size="sm" onClick={() => setAdding((a) => !a)}>
            <Icon.Plus className="h-4 w-4" /> Add contact
          </Button>
        }
      />

      {adding && (
        <Card className="mb-4 p-4">
          <form onSubmit={add} className="grid gap-2 sm:grid-cols-4">
            <input
              className="rounded-lg border border-white/15 bg-transparent px-2.5 py-1.5 text-sm outline-none focus:border-emerald-400/60"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="rounded-lg border border-white/15 bg-transparent px-2.5 py-1.5 text-sm outline-none focus:border-emerald-400/60"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="rounded-lg border border-white/15 bg-transparent px-2.5 py-1.5 text-sm outline-none focus:border-emerald-400/60"
              placeholder="Company (optional)"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
            <Button type="submit" disabled={busy}>
              {busy ? <Spinner /> : "Save"}
            </Button>
          </form>
        </Card>
      )}

      {contacts !== undefined && contacts.length > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
          <Icon.Search className="h-4 w-4 text-white/40" />
          <input
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-white/30"
            placeholder="Search contacts"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      )}

      {contacts === undefined ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <Empty
          icon={<Icon.Contacts className="h-8 w-8" />}
          title="No contacts yet"
          body="Source vendors from the Diagnosis page with Firecrawl, or add one by hand."
        />
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {filtered.map((c) => (
            <Card key={c._id} className="flex items-center gap-3 p-3">
              <Avatar name={c.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{c.name}</p>
                <p className="truncate text-xs text-white/45">{c.email}</p>
                {(c.company || c.role) && (
                  <p className="truncate text-[11px] text-white/35">
                    {[c.role, c.company].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              {c.sourceUrl && (
                <a
                  href={c.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-white/30 hover:text-white/70"
                  title="Source page (found by Firecrawl)"
                >
                  <Icon.Globe className="h-4 w-4" />
                </a>
              )}
            </Card>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full py-6 text-center text-sm text-white/40">
              No contacts match "{q}".
            </p>
          )}
        </div>
      )}
    </div>
  );
}
