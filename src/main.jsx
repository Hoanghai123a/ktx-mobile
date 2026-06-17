import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./contexts/AuthContext";
import { installPwaPromptListeners } from "./lib/pwa-install";

installPwaPromptListeners();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);


if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => null);
}
