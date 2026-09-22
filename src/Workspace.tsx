import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { Button, Card } from "./ui";
import Dashboard from "./Dashboard";

export default function Workspace() {
  const productions = useQuery(api.productions.list);
  const createProduction = useMutation(api.productions.create);
  const [selected, setSelected] = useState<Id<"productions"> | null>(null);
  const [name, setName] = useState("");
  const [logline, setLogline] = useState("");

  const active = selected ?? productions?.[0]?._id ?? null;

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const id = await createProduction({ name, logline: logline || undefined });
    setName("");
    setLogline("");
    setSelected(id);
  }

  return (
    <div className="flex-1 flex min-h-0">
      <aside className="w-64 shrink-0 border-r border-white/10 p-4 flex flex-col gap-4 overflow-y-auto">
        <div>
          <h3 className="text-xs uppercase tracking-wide text-white/40">Productions</h3>
          <div className="mt-2 space-y-1">
            {productions?.map((p) => (
              <button
                key={p._id}
                onClick={() => setSelected(p._id)}
                className={`w-full truncate rounded-lg px-3 py-2 text-left text-sm ${
                  active === p._id ? "bg-emerald-500/15 text-emerald-200" : "hover:bg-white/5 text-white/70"
                }`}
              >
                {p.name}
              </button>
            ))}
            {productions?.length === 0 && (
              <p className="text-xs text-white/40">No productions yet. Create one below.</p>
            )}
          </div>
        </div>

        <Card className="p-3">
          <form onSubmit={create} className="space-y-2">
            <input
              className="w-full rounded-lg border border-white/15 bg-transparent px-2.5 py-1.5 text-sm outline-none focus:border-emerald-400/60"
              placeholder="New production name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="w-full rounded-lg border border-white/15 bg-transparent px-2.5 py-1.5 text-sm outline-none focus:border-emerald-400/60"
              placeholder="Logline (optional)"
              value={logline}
              onChange={(e) => setLogline(e.target.value)}
            />
            <Button type="submit" className="w-full">
              Add production
            </Button>
          </form>
        </Card>
      </aside>

      <main className="flex-1 min-w-0 overflow-y-auto">
        {active ? (
          <Dashboard productionId={active} />
        ) : (
          <div className="grid h-full place-items-center text-white/40 text-sm">
            Create a production to begin the diagnosis.
          </div>
        )}
      </main>
    </div>
  );
}
