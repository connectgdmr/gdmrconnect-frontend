import React from "react";
import { FaExclamationTriangle, FaCopy, FaSyncAlt } from "react-icons/fa";

// After a new deploy, an already-open tab's index.html still points at the
// previous build's hashed chunk filenames (e.g. AdminCareer-<oldhash>.js),
// which no longer exist on the server once the new build overwrites them.
// The local "Retry" (just re-rendering the same failed lazy() promise) can
// never fix that — only a hard reload (fetching the new index.html with the
// new hashes) can. Detect that specific failure and reload automatically,
// once per session, instead of leaving the user stuck on a dead retry loop.
const CHUNK_ERROR_RE = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Loading chunk [\w-]+ failed/i;
const RELOAD_GUARD_KEY = "gdmr_chunk_reload_at";

function isChunkLoadError(error) {
  return CHUNK_ERROR_RE.test(error?.message || String(error || ""));
}

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null, copied: false, autoReloading: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("Feature crashed:", error, info);
    this.setState({ info });

    if (isChunkLoadError(error)) {
      // Rate-limit to once per 10s so a genuinely missing/broken chunk (not
      // just a stale cache) can't reload-loop the page forever.
      const lastReload = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || 0);
      if (Date.now() - lastReload > 10000) {
        sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
        this.setState({ autoReloading: true });
        window.location.reload();
      }
    }
  }

  // Reset error state when the parent switches view/key
  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null, info: null, copied: false, autoReloading: false });
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
      const chunkError = isChunkLoadError(this.state.error);

      if (this.state.autoReloading) {
        // Reload is already in flight — show a calm "updating" message
        // instead of the alarming error card while it happens.
        return (
          <div className="card" style={{ textAlign: "center", padding: "50px 24px", marginTop: 16, color: "#64748b" }}>
            <FaSyncAlt size={30} color="#34a06a" style={{ marginBottom: 14 }} className="spin-icon" />
            <h3 style={{ margin: "0 0 8px", color: "#0f172a" }}>Updating…</h3>
            <p style={{ margin: 0, fontSize: 14 }}>A new version of GDMR Connect is available. Reloading the page.</p>
            <style>{`.spin-icon { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        );
      }

      return (
        <div className="card" style={{ textAlign: "center", padding: "50px 24px", marginTop: 16, color: "#64748b" }}>
          <FaExclamationTriangle size={36} color="#f59e0b" style={{ marginBottom: 14 }} />
          <h3 style={{ margin: "0 0 8px", color: "#0f172a" }}>
            {chunkError ? "This section needs a page reload" : "Something went wrong loading this section"}
          </h3>
          <p style={{ margin: "0 0 18px", fontSize: 14 }}>
            {chunkError
              ? "The app was updated since this page was opened. Reload to get the latest version."
              : `${this.props.label || "This feature"} couldn't be displayed. Please try again.`}
          </p>
          {this.state.error && !chunkError && (
            <div style={{ margin: "0 0 18px", fontSize: 12.5, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", textAlign: "left", maxWidth: 640, marginLeft: "auto", marginRight: "auto", fontFamily: "monospace", wordBreak: "break-word" }}>
              {this.state.error.message || String(this.state.error)}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button
              className="btn"
              onClick={() => chunkError
                ? window.location.reload()
                : this.setState({ hasError: false, error: null, info: null, copied: false, autoReloading: false })}
            >
              {chunkError ? "Reload Page" : "Retry"}
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
