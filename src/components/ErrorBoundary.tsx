import React from "react";
import { Button } from "@/components/ui/button";

interface State { hasError: boolean; error?: Error }

/**
 * App-level error boundary. Catches render/runtime errors in the React tree
 * so a single broken component cannot white-screen the whole app (graceful
 * degradation). Renders a small recovery UI with a reload action.
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Structured client-side log — no PII, safe for production.
    console.error("[ErrorBoundary]", { message: error.message, stack: error.stack, componentStack: info.componentStack });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-md w-full space-y-4 text-center">
            <h1 className="text-2xl font-bold text-primary">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              We hit an unexpected error. Your data is safe. Please try again.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={this.handleReset} variant="outline">Try again</Button>
              <Button onClick={() => window.location.reload()}>Reload page</Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
