import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          fontFamily: 'Arial, sans-serif',
          backgroundColor: '#f5f5f5',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <h1 style={{ color: '#d32f2f', marginBottom: '20px' }}>
            Something went wrong
          </h1>
          <p style={{ marginBottom: '20px', maxWidth: '600px' }}>
            The Construction Tracker application encountered an error. Please refresh the page or contact support if the problem persists.
          </p>
          <details style={{ 
            backgroundColor: 'white', 
            padding: '10px', 
            borderRadius: '4px',
            border: '1px solid #ddd',
            maxWidth: '800px',
            textAlign: 'left'
          }}>
            <summary style={{ cursor: 'pointer', marginBottom: '10px' }}>
              Error Details (Click to expand)
            </summary>
            <pre style={{ 
              fontSize: '12px', 
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>
              {this.state.error && this.state.error.toString()}
              <br />
              {this.state.errorInfo.componentStack}
            </pre>
          </details>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
