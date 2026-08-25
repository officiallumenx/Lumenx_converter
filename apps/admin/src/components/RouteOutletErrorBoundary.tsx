import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@lumenx/ui-admin";

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Keeps Admin chrome (sidebar/header) mounted when a child route crashes.
 * Root `errorComponent` still covers full-app failures outside this boundary.
 */
export class RouteOutletErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("Route outlet error:", error, info.componentStack);
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-lg rounded-xl border border-border bg-card p-6 text-center shadow-soft">
          <h2 className="text-base font-semibold">This page failed to load</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {this.state.error.message || "An unexpected error occurred."}
          </p>
          <Button className="mt-4" onClick={() => this.setState({ error: null })}>
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
