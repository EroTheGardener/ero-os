import "./index.css";
import "./storage-shim.js";
import "./storage-shim.js";
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import EroOS from "./ero-os.jsx";
import QuoteStudio from "./gnws-quote-studio.jsx";
import DelegateBoard from "./delegate-board.jsx";
import WorkBoard from "./work-board.jsx";
import DebtPayoff from "./DebtPayoff.jsx";
import LocalAI from "./local-ai.jsx";

/* Crash catcher: if an app throws, show the error and recovery options
   instead of a blank white page. */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
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
    const mono = "ui-monospace, Menlo, monospace";
    const reset = (key, label) => {
      if (window.confirm(`This clears ${label}'s saved data on this computer so it restarts fresh with seed data. Your other app's data is untouched. Continue?`)) {
        localStorage.removeItem(key);
        window.location.reload();
      }
    };
    return (
      <div style={{ minHeight: "100vh", background: "#F6F3EC", color: "#221D19", padding: 24, fontFamily: "Helvetica, Arial, sans-serif" }}>
        <div style={{ maxWidth: 640, margin: "40px auto", background: "#fff", border: "1px solid #C9BDA3", borderLeft: "5px solid #7E2F21", borderRadius: 3, padding: 24 }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>The app hit an error</div>
          <p style={{ fontSize: 13, color: "#5a5245", lineHeight: 1.5 }}>
            Instead of a blank page, here's what actually broke. Copy the text below and paste it to Claude to get it fixed.
          </p>
          <pre style={{ fontFamily: mono, fontSize: 11, background: "#F6F3EC", padding: 12, borderRadius: 3, whiteSpace: "pre-wrap", overflowX: "auto" }}>
{String(err && (err.message || err))}
{this.state.stack ? "\n---" + this.state.stack.split("\n").slice(0, 8).join("\n") : ""}
          </pre>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <button onClick={() => window.location.reload()} style={{ fontFamily: mono, fontSize: 12, padding: "8px 14px", background: "#221D19", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}>
              Reload
            </button>
            <button onClick={() => reset("gnws-quote-studio-v1", "Quote Studio")} style={{ fontFamily: mono, fontSize: 12, padding: "8px 14px", background: "transparent", color: "#7E2F21", border: "1px solid #7E2F21", borderRadius: 3, cursor: "pointer" }}>
              Reset Quote Studio data
            </button>
            <button onClick={() => reset("ero-os-v1", "Ero OS")} style={{ fontFamily: mono, fontSize: 12, padding: "8px 14px", background: "transparent", color: "#7E2F21", border: "1px solid #7E2F21", borderRadius: 3, cursor: "pointer" }}>
              Reset Ero OS data
            </button>
            <button onClick={() => reset("gnws-delegate-v1", "Delegate")} style={{ fontFamily: mono, fontSize: 12, padding: "8px 14px", background: "transparent", color: "#7E2F21", border: "1px solid #7E2F21", borderRadius: 3, cursor: "pointer" }}>
              Reset Delegate data
            </button>
            <button onClick={() => reset("gnws-work-v1", "Work")} style={{ fontFamily: mono, fontSize: 12, padding: "8px 14px", background: "transparent", color: "#7E2F21", border: "1px solid #7E2F21", borderRadius: 3, cursor: "pointer" }}>
              Reset Work data
            </button>
            <button onClick={() => reset("debt-payoff-v1", "Debt Payoff")} style={{ fontFamily: mono, fontSize: 12, padding: "8px 14px", background: "transparent", color: "#7E2F21", border: "1px solid #7E2F21", borderRadius: 3, cursor: "pointer" }}>
              Reset Financials data
            </button>
          </div>
        </div>
      </div>
    );
  }
}

function Root() {
  const [app, setApp] = useState(
    () => localStorage.getItem("gnws-active-app") || "eroos"
  );
  const pick = (a) => {
    setApp(a);
    localStorage.setItem("gnws-active-app", a);
  };

  const pill = (id, label) => (
    <button
      onClick={() => pick(id)}
      style={{
        fontFamily: "ui-monospace, Menlo, monospace",
        fontSize: 11,
        letterSpacing: "0.05em",
        padding: "6px 12px",
        border: "none",
        cursor: "pointer",
        background: app === id ? "#7E2F21" : "transparent",
        color: app === id ? "#fff" : "#C9BDA3",
        borderRadius: 999,
      }}
    >
      {label}
    </button>
  );

  const renderApp = () => {
    if (app === "eroos") return <EroOS />;
    if (app === "quotes") return <QuoteStudio />;
    if (app === "delegate") return <DelegateBoard />;
    if (app === "work") return <WorkBoard />;
    if (app === "financials") return <DebtPayoff />;
    if (app === "localai") return <LocalAI />;
    return <EroOS />;
  };

  return (
    <>
      <ErrorBoundary key={app}>
        {renderApp()}
      </ErrorBoundary>
      <div
        style={{
          position: "fixed",
          bottom: 16,
          right: 16,
          zIndex: 40,
          background: "#221D19",
          borderRadius: 999,
          padding: 4,
          display: "flex",
          gap: 2,
          boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
        }}
        className="no-print"
      >
        {pill("eroos", "ERO OS")}
        {pill("quotes", "QUOTES")}
        {pill("delegate", "DELEGATE")}
        {pill("work", "WORK")}
        {pill("financials", "FINANCIALS")}
        {pill("localai", "LOCAL AI")}
      </div>
    </>
  );
}

createRoot(document.getElementById("root")).render(<Root />);
