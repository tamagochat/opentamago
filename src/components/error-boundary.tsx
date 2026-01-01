"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "~/components/ui/button";

interface ErrorBoundaryTranslations {
  title: string;
  description: string;
  refreshPage: string;
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  translations?: ErrorBoundaryTranslations;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const defaultTranslations: ErrorBoundaryTranslations = {
  title: "Something went wrong",
  description: "An unexpected error occurred. Please try refreshing the page.",
  refreshPage: "Refresh Page",
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    const t = this.props.translations ?? defaultTranslations;

    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold mb-2">{t.title}</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            {t.description}
          </p>
          <Button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            {t.refreshPage}
          </Button>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <pre className="mt-6 p-4 bg-muted rounded-lg text-left text-xs overflow-auto max-w-full">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
