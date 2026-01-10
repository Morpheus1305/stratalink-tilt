import React from "react"; // 👈 ADD THIS
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <App />
);