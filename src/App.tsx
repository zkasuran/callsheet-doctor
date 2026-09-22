import { useState } from "react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import SignIn from "./SignIn";
import Workspace from "./Workspace";
import Landing from "./Landing";
import { Spinner } from "./ui";

export default function App() {
  // Unauthenticated visitors see the marketing site first; "Open the app"
  // flips them to the sign-in screen without a route change.
  const [showAuth, setShowAuth] = useState(false);

  return (
    <>
      <AuthLoading>
        <div className="grid min-h-full place-items-center text-white/40">
          <Spinner className="h-6 w-6" />
        </div>
      </AuthLoading>

      <Unauthenticated>
        {showAuth ? <SignIn onBack={() => setShowAuth(false)} /> : <Landing onStart={() => setShowAuth(true)} />}
      </Unauthenticated>

      <Authenticated>
        <Workspace />
      </Authenticated>
    </>
  );
}
