import "./index.css";
import "./storage-shim.js";
import React from "react";
import { createRoot } from "react-dom/client";
import DebtPayoff from "./DebtPayoff.jsx";

const MONO = "ui-monospace, Menlo, monospace";

/* Financials keeps everything it knows under this one key, in the cloud
   and in a local copy. The four retired modules are in ../old. */
const STORAGE_KEY = "eroOS.debtPayoff.v2";

/* Crash catcher: if the app throws, show the error and a way out
   instead of a blank white page. */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, stack: "" };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    this.setState({ stack: (info && info.componentStack) || "" });
  }
  render() {
    if (!this.state.error) return this.props.children;
    const err = this.state.error;
    const reset = async () => {
      if (
        !window.confirm(
          "This erases your Financials data, in the cloud and on this device, so the app restarts fresh with seed data. There is no undo. Continue?"
        )
      )
        return;
      try {
        await window.storage.delete(STORAGE_KEY);
      } catch {
        /* nothing saved yet */
      }
      window.location.reload();
    };
    return (
      <div style={{ minHeight: "100vh", background: "#F6F3EC", color: "#221D19", padding: 24, fontFamily: "Helvetica, Arial, sans-serif" }}>
        <div style={{ maxWidth: 640, margin: "40px auto", background: "#fff", border: "1px solid #C9BDA3", borderLeft: "5px solid #7E2F21", borderRadius: 3, padding: 24 }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>The app hit an error</div>
          <p style={{ fontSize: 13, color: "#5a5245", lineHeight: 1.5 }}>
            Instead of a blank page, here's what actually broke. Copy the text below and paste it to Claude to get it fixed.
          </p>
          <pre style={{ fontFamily: MONO, fontSize: 11, background: "#F6F3EC", padding: 12, borderRadius: 3, whiteSpace: "pre-wrap", overflowX: "auto" }}>
{String(err && (err.message || err))}
{this.state.stack ? "\n---" + this.state.stack.split("\n").slice(0, 8).join("\n") : ""}
          </pre>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <button onClick={() => window.location.reload()} style={{ fontFamily: MONO, fontSize: 12, padding: "8px 14px", background: "#221D19", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}>
              Reload
            </button>
            <button onClick={reset} style={{ fontFamily: MONO, fontSize: 12, padding: "8px 14px", background: "transparent", color: "#7E2F21", border: "1px solid #7E2F21", borderRadius: 3, cursor: "pointer" }}>
              Erase Financials data and start over
            </button>
          </div>
        </div>
      </div>
    );
  }
}

createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <DebtPayoff />
  </ErrorBoundary>
);
