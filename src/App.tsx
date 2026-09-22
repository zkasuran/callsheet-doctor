import { useState } from "react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import SignIn from "./SignIn";
import Workspace from "./Workspace";
import Landing from "./Landing";
import { Spinner } from "./ui";

export default function App() {
  const { signIn } = useAuthActions();
  // Unauthenticated visitors see the marketing site first; "Sign in" flips to the auth
  // screen, "Try it as a guest" signs in anonymously so they land in a populated workspace.
  const [showAuth, setShowAuth] = useState(false);
  const [guestBusy, setGuestBusy] = useState(false);

  async function continueAsGuest() {
    setGuestBusy(true);
    try {
      await signIn("anonymous");
    } finally {
      setGuestBusy(false);
    }
  }

  return (
    <>
      <AuthLoading>
        <div className="grid min-h-full place-items-center text-white/40">
          <Spinner className="h-6 w-6" />
        </div>
      </AuthLoading>

      <Unauthenticated>
        {guestBusy ? (
          <div className="grid min-h-full place-items-center text-white/40">
            <div className="text-center">
              <Spinner className="mx-auto h-6 w-6" />
              <p className="mt-4 text-sm text-white/60">Opening a guest workspace...</p>
            </div>
          </div>
        ) : showAuth ? (
          <SignIn onBack={() => setShowAuth(false)} onGuest={continueAsGuest} />
        ) : (
          <Landing onStart={() => setShowAuth(true)} onGuest={continueAsGuest} />
        )}
      </Unauthenticated>

      <Authenticated>
        <Workspace />
      </Authenticated>
    </>
  );
}
