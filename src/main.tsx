import React from "react";
import ReactDOM from "react-dom/client";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import App from "./App";
import "./index.css";
import { applyTheme, getInitialTheme } from "./theme";

// Apply the saved/OS theme before first paint to avoid a flash.
applyTheme(getInitialTheme());

// VITE_CONVEX_URL is written by `npx convex dev` into .env.local
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConvexAuthProvider client={convex}>
      <App />
    </ConvexAuthProvider>
  </React.StrictMode>,
);
