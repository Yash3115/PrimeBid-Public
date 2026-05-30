import { Component } from "react";

/* eslint-disable react/prop-types */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("UI render failed", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="app-page flex items-center justify-center">
          <div className="max-w-xl rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="app-kicker">
              PrimeBid
            </p>
            <h1 className="mt-3 text-3xl font-bold text-slate-950">
              Something went wrong
            </h1>
            <p className="mt-3 text-slate-600">
              Refresh the page or return home to continue.
            </p>
            <button
              type="button"
              onClick={() => window.location.assign("/")}
              className="mt-5 rounded-md bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700"
            >
              Go Home
            </button>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
