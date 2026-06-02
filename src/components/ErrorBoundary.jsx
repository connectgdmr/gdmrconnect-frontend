import React from "react";
import { FaExclamationTriangle } from "react-icons/fa";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("Feature crashed:", error, info);
  }

  // Reset error state when the parent switches view/key
  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card" style={{ textAlign: "center", padding: "50px 24px", marginTop: 16, color: "#64748b" }}>
          <FaExclamationTriangle size={36} color="#f59e0b" style={{ marginBottom: 14 }} />
          <h3 style={{ margin: "0 0 8px", color: "#0f172a" }}>Something went wrong loading this section</h3>
          <p style={{ margin: "0 0 18px", fontSize: 14 }}>
            {this.props.label || "This feature"} couldn't be displayed. Please try again.
          </p>
          <button
            className="btn"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
