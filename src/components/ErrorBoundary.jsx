import React from "react";
import { FaExclamationTriangle, FaCopy } from "react-icons/fa";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null, copied: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("Feature crashed:", error, info);
    this.setState({ info });
  }

  // Reset error state when the parent switches view/key
  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null, info: null, copied: false });
    }
  }

  copyDetails = () => {
    const { error, info } = this.state;
    const text = [
      `Section: ${this.props.label || "unknown"}`,
      `Error: ${error?.message || String(error)}`,
      error?.stack || "",
      info?.componentStack || "",
    ].filter(Boolean).join("\n");
    navigator.clipboard?.writeText(text).then(
      () => this.setState({ copied: true }),
      () => {}
    );
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="card" style={{ textAlign: "center", padding: "50px 24px", marginTop: 16, color: "#64748b" }}>
          <FaExclamationTriangle size={36} color="#f59e0b" style={{ marginBottom: 14 }} />
          <h3 style={{ margin: "0 0 8px", color: "#0f172a" }}>Something went wrong loading this section</h3>
          <p style={{ margin: "0 0 18px", fontSize: 14 }}>
            {this.props.label || "This feature"} couldn't be displayed. Please try again.
          </p>
          {this.state.error && (
            <div style={{ margin: "0 0 18px", fontSize: 12.5, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", textAlign: "left", maxWidth: 640, marginLeft: "auto", marginRight: "auto", fontFamily: "monospace", wordBreak: "break-word" }}>
              {this.state.error.message || String(this.state.error)}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button
              className="btn"
              onClick={() => this.setState({ hasError: false, error: null, info: null, copied: false })}
            >
              Retry
            </button>
            {this.state.error && (
              <button className="btn ghost" onClick={this.copyDetails} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <FaCopy size={11} /> {this.state.copied ? "Copied!" : "Copy error details"}
              </button>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
