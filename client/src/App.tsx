import { useState, useEffect } from 'react';
import './styles/App.css';

interface HealthResponse {
  status: 'ok' | 'error';
  service: string;
  database: 'connected' | 'disconnected';
  timestamp: string;
}

function App() {
  const [healthStatus, setHealthStatus] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch('/api/health');
        if (!response.ok) {
          throw new Error('Failed to fetch health status');
        }
        const data: HealthResponse = await response.json();
        setHealthStatus(data);
      } catch (err) {
        setError('Failed to connect to API');
        console.error('API Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🟡 Yellow</h1>
        <p>Multi-tenant Project & Task Management Platform</p>
      </header>
      
      <main className="app-main">
        <div className="welcome-section">
          <h2>Welcome to Yellow</h2>
          <p>Your collaborative workspace for managing projects and tasks across teams.</p>
        </div>

        <div className="system-status">
          <h3>System Status</h3>
          {loading && <p>Checking system status...</p>}
          {error && <p className="error">❌ {error}</p>}
          {healthStatus && (
            <div className="status-grid">
              <div className="status-item">
                <span className="status-label">API Server:</span>
                <span className={`status-value ${healthStatus.status === 'ok' ? 'success' : 'error'}`}>
                  {healthStatus.status === 'ok' ? '✅ Online' : '❌ Offline'}
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">Database:</span>
                <span className={`status-value ${healthStatus.database === 'connected' ? 'success' : 'error'}`}>
                  {healthStatus.database === 'connected' ? '✅ Connected' : '❌ Disconnected'}
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">Service:</span>
                <span className="status-value">{healthStatus.service}</span>
              </div>
              <div className="status-item">
                <span className="status-label">Last Check:</span>
                <span className="status-value">{new Date(healthStatus.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          )}
        </div>

        <div className="features">
          <h3>Coming Soon</h3>
          <ul>
            <li>Multi-workspace support</li>
            <li>Project management</li>
            <li>Task tracking</li>
            <li>Team collaboration</li>
            <li>Activity feeds</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

export default App;