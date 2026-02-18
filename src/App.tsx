import React, { useState } from 'react';
import JoinSession from './components/JoinSession';
import SongRequest from './components/SongRequest';

// Determine API base from environment or default
const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:5000/api';

export default function App() {
  const [sessionData, setSessionData] = useState<{
    id: string; name: string; code: string;
  } | null>(null);

  if (!sessionData) {
    return <JoinSession apiBase={API_BASE} onJoined={setSessionData} />;
  }

  return (
    <SongRequest
      apiBase={API_BASE}
      sessionId={sessionData.id}
      sessionName={sessionData.name}
      sessionCode={sessionData.code}
    />
  );
}
