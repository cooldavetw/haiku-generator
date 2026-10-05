import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import HaikuApp from "./haiku-app";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HaikuApp />
  </StrictMode>,
);
