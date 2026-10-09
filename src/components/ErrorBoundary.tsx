import React, { Component } from 'react';

import { logger } from '../utils/logger';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * App-wide safety net. If any descendant throws during render/lifecycle, React
 * would normally unmount the whole tree and leave a blank white screen. This
 * boundary catches that, logs it (so it reaches the error-tracking sink once
 * `logger` is wired to Sentry), and shows a friendly recover screen instead.
 *
 * Purely additive: on the happy path it renders `children` untouched — it does
 * not change any existing UI, state, or behaviour. Styles are inline on purpose
 * so the fallback still renders even if the crash was CSS/asset related.
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    logger.error('Unhandled UI error caught by ErrorBoundary', error, {
      componentStack: info.componentStack,
    });
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 24,
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          color: '#21295A',
          background: '#f7f8fc',
        }}
      >
        <div aria-hidden="true" style={{ fontSize: 44 }}>
          ⚠️
        </div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Something went wrong</h1>
        <p style={{ margin: 0, maxWidth: 420, fontSize: 14, color: '#5b6079', lineHeight: 1.5 }}>
          The page hit an unexpected error. Your data is safe — reloading usually fixes it. If it keeps happening,
          please contact support.
        </p>
        <button
          style={{
            cursor: 'pointer',
            border: 'none',
            borderRadius: 8,
            background: '#21295A',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            padding: '10px 20px',
          }}
          type="button"
          onClick={this.handleReload}
        >
          Reload page
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
