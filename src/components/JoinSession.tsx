import React, { useState, useEffect, FormEvent } from 'react';

interface JoinSessionProps {
  apiBase: string;
  onJoined: (session: { id: string; name: string; code: string }) => void;
}

export default function JoinSession({ apiBase, onJoined }: JoinSessionProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check URL for code (from QR / shared link)
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/join\/([A-Z0-9]+)/i);
    if (match) {
      handleJoin(match[1]);
    }
    // Also check hash (for GitHub Pages SPA)
    const hash = window.location.hash;
    const hashMatch = hash.match(/#\/join\/([A-Z0-9]+)/i);
    if (hashMatch) {
      handleJoin(hashMatch[1]);
    }
  }, []);

  const handleJoin = async (sessionCode?: string) => {
    const c = (sessionCode || code).trim().toUpperCase();
    if (!c) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiBase}/fan/session/${c}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Session not found');
      }
      const data = await res.json();
      if (!data.isActive) throw new Error('This session has ended');
      onJoined({ id: data.id, name: data.name, code: data.shortCode });
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleJoin();
  };

  return (
    <div className="fan-container">
      <div className="join-container">
        <div style={{ marginBottom: 8, fontSize: '3rem' }}>🎵</div>
        <h1>Crowdplay</h1>
        <p>Enter the session code to request songs</p>
        <form onSubmit={handleSubmit}>
          <input
            className="code-input"
            type="text"
            maxLength={6}
            placeholder="CODE"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            autoComplete="off"
            autoFocus
          />
          <button className="join-btn" type="submit" disabled={loading || code.length < 4}>
            {loading ? 'Joining...' : 'Join Session'}
          </button>
        </form>
        {error && <div className="error-text">{error}</div>}
      </div>
    </div>
  );
}
