import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const root = document.getElementById("root");
if (!root) {
  console.error("Root element not found!");
  document.body.innerHTML = "<h1>ERROR: Root element not found</h1>";
  throw new Error("Root element #root not found in HTML");
}

console.log("✓ React mounting...");

try {
  createRoot(root).render(<App />);
  console.log("✓ React mounted!");
} catch (error) {
  console.error("✗ React mount error:", error);
  root.innerHTML = `<div style="color: red; font-size: 18px; padding: 20px;"><h1>Error loading app</h1><pre>${(error as Error).message}</pre></div>`;
}
