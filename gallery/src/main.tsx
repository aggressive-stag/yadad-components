import { createRoot } from "react-dom/client";
import App from "./App.js";

// Load the components' shipped stylesheets, the same content a host would
// load from dist/yadad-components.css (the engine showcase wires this in via
// YADAD_REGISTRY_CSS). Without it the page renders unstyled components and
// every browser check (focus rings, borders, spacing) measures the wrong
// thing. A glob keeps this in sync with the set automatically.
import.meta.glob("../../sets/**/*.css", { eager: true });

createRoot(document.getElementById("root")!).render(<App />);
