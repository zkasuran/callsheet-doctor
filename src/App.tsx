import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import SignIn from "./SignIn";
import Workspace from "./Workspace";
import { Spinner } from "./ui";

export default function App() {
  const { signOut } = useAuthActions();
  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-white/10 px-6 py-3 flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300 font-bold">
          Rx
        </span>
        <div className="flex-1">
          <h1 className="text-base font-semibold tracking-tight">Asura Callsheet Doctor</h1>
          <p className="text-xs text-white/45">Diagnose the production. Cure the gaps over email.</p>
        </div>
        <Authenticated>
          <button
            onClick={() => void signOut()}
            className="text-xs text-white/50 hover:text-white/80"
          >
            Sign out
          </button>
        </Authenticated>
      </header>

      <AuthLoading>
        <div className="flex-1 grid place-items-center text-white/40 text-sm gap-2">
          <Spinner />
        </div>
      </AuthLoading>
      <Unauthenticated>
        <SignIn />
      </Unauthenticated>
      <Authenticated>
        <Workspace />
      </Authenticated>
    </div>
  );
}
