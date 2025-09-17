import { useState, useEffect } from 'react';
import './styles/App.css';

interface ApiResponse {
  message: string;
  timestamp: string;
}

function App() {
  const [apiMessage, setApiMessage] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchHello = async () => {
      try {
        const response = await fetch('/api/hello');
        if (!response.ok) {
          throw new Error('Failed to fetch');
        }
        const data: ApiResponse = await response.json();
        setApiMessage(data.message);
      } catch (err) {
        setError('Failed to connect to API');
        console.error('API Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHello();
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

        <div className="api-test">
          <h3>API Connection Test</h3>
          {loading && <p>Connecting to API...</p>}
          {error && <p className="error">❌ {error}</p>}
          {apiMessage && <p className="success">✅ {apiMessage}</p>}
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