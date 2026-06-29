import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Dashboard error boundary caught an error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#e2e8f0', background: '#0f1117' }}>
          <div style={{ maxWidth: 420, padding: 24, border: '1px solid #2d3148', borderRadius: 14, background: '#1a1d2e' }}>
            <h2 style={{ marginTop: 0 }}>Something went wrong</h2>
            <p style={{ color: '#94a3b8' }}>The dashboard could not render correctly. Please refresh the page or try again shortly.</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
