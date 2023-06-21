import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { reportWebVitals, sendToGoogleAnalytics } from "./reportWebVitals";
import App from "./app";

const root = createRoot(document.getElementById("root"));
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

reportWebVitals(sendToGoogleAnalytics, console.debug);
