import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import DesignPreview from "./DesignPreview.jsx";
import "./styles/tokens.css";

const showDesignPreview =
  window.location.hash === "#design-preview" ||
  new URLSearchParams(window.location.search).has("design-preview");

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {showDesignPreview ? <DesignPreview /> : <App />}
  </React.StrictMode>
);
