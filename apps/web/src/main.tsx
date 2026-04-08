import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./app/styles/globals.css";

function syncAppHeight() {
  document.documentElement.style.setProperty("--app-height", `${window.innerHeight}px`);
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found.");
}

syncAppHeight();
window.addEventListener("resize", syncAppHeight);

createRoot(rootElement).render(<App />);
