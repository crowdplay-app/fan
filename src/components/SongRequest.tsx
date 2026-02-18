import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface Song {
  id: string; title: string; artist: string; album: string;
  albumCover: string; duration: number;
}

interface QueueItem {
  id: string; song: Song; requestedBy: string; status: string;
  duplicateCount: number;
}

interface SongRequestProps {
  apiBase: string;
  sessionId: string;
  sessionName: string;
  sessionCode: string;
}

export default function SongRequest({ apiBase, sessionId, sessionName, sessionCode }: SongRequestProps) {
  const [tab, setTab] = useState<'search' | 'queue'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [searching, setSearching] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentSong, setCurrentSong] = useState<QueueItem | null>(null);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'warning' } | null>(null);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [nickname, setNickname] = useState('');
  const [showNickname, setShowNickname] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  // Socket connection
  useEffect(() => {
    const serverUrl = apiBase.replace('/api', '');
    const socket = io(serverUrl);
    socketRef.current = socket;

    socket.emit('join-session', sessionId);

    socket.on('queue-updated', ({ queue: q, currentSongIndex }) => {
      setQueue(q);
      if (currentSongIndex >= 0 && q[currentSongIndex]) {
        setCurrentSong(q[currentSongIndex]);
      } else {
        setCurrentSong(null);
      }
    });

    socket.on('now-playing', ({ song }) => {
      // Queue update will handle current song
    });

    socket.on('duplicate-detected', ({ song, duplicateCount }) => {
      showToast(`"${song.title}" was already requested (${duplicateCount + 1} votes!)`, 'warning');
    });

    socket.on('session-ended', () => {
      setSessionEnded(true);
    });

    return () => { socket.disconnect(); };
  }, [sessionId, apiBase]);

  // Load initial queue
  useEffect(() => {
    fetch(`${apiBase}/fan/session/${sessionCode}`)
      .then(r => r.json())
      .then(data => {
        setQueue(data.queue || []);
        if (data.currentSongIndex >= 0 && data.queue?.[data.currentSongIndex]) {
          setCurrentSong(data.queue[data.currentSongIndex]);
        }
      });
  }, []);

  const showToast = (text: string, type: 'success' | 'warning' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`${apiBase}/songs/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data);
    } catch { setSearchResults([]); }
    setSearching(false);
  };

  const handleRequest = async (song: Song) => {
    const name = nickname || 'Anonymous';
    try {
      const res = await fetch(`${apiBase}/fan/session/${sessionCode}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song, requestedBy: name }),
      });
      const data = await res.json();
      if (data.duplicate) {
        showToast(`"${song.title}" upvoted! (${data.duplicateCount + 1} votes)`, 'warning');
      } else {
        showToast(`"${song.title}" added to queue!`, 'success');
      }
    } catch {
      showToast('Failed to add song', 'warning');
    }
  };

  const confirmNickname = () => {
    if (nickname.trim()) setShowNickname(false);
  };

  const pendingQueue = queue.filter(item => item.status === 'pending');

  if (sessionEnded) {
    return (
      <div className="fan-container">
        <div className="session-ended">
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🎧</div>
          <h2>Session Ended</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
            Thanks for listening! The DJ has ended this session.
          </p>
          <button
            className="join-btn"
            style={{ maxWidth: 200, marginTop: 24 }}
            onClick={() => window.location.reload()}
          >
            Join Another
          </button>
        </div>
      </div>
    );
  }

  if (showNickname) {
    return (
      <div className="fan-container">
        <div className="join-container">
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🎧</div>
          <h1 style={{ fontSize: '1.2rem' }}>{sessionName}</h1>
          <p>What's your name?</p>
          <input
            className="code-input"
            type="text"
            style={{ fontSize: '1rem', letterSpacing: 'normal', textTransform: 'none' }}
            placeholder="Your name"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            maxLength={20}
            autoFocus
          />
          <button className="join-btn" onClick={confirmNickname} disabled={!nickname.trim()}>
            Continue
          </button>
          <button
            className="join-btn"
            style={{ background: 'transparent', border: '1px solid var(--border)', marginTop: 8 }}
            onClick={() => { setNickname('Anonymous'); setShowNickname(false); }}
          >
            Skip (Anonymous)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fan-container">
      {/* Header */}
      <div className="fan-header">
        <span className="fan-brand">🎵 Crowdplay</span>
        <div className="fan-session-name">{sessionName}</div>
      </div>

      {/* Now Playing */}
      {currentSong && (
        <div className="fan-now-playing">
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 2, color: 'var(--accent)', marginBottom: 8 }}>
            Now Playing
          </div>
          <img src={currentSong.song.albumCover} alt="" />
          <div className="fan-np-title">{currentSong.song.title}</div>
          <div className="fan-np-artist">{currentSong.song.artist}</div>
        </div>
      )}

      {/* Tabs */}
      <div className="tab-bar">
        <button className={`tab ${tab === 'search' ? 'active' : ''}`} onClick={() => setTab('search')}>
          🔍 Search
        </button>
        <button className={`tab ${tab === 'queue' ? 'active' : ''}`} onClick={() => setTab('queue')}>
          📋 Queue ({pendingQueue.length})
        </button>
      </div>

      {/* Search Tab */}
      {tab === 'search' && (
        <>
          <div className="search-bar">
            <input
              className="search-input"
              placeholder="Search for a song..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <button className="search-btn" onClick={handleSearch}>
              {searching ? '...' : '🔍'}
            </button>
          </div>

          {searchResults.length === 0 && !searching && (
            <div className="empty-state">
              <div className="icon">🎶</div>
              <p>Search for songs to add to the queue</p>
            </div>
          )}

          {searchResults.map(song => (
            <div key={song.id} className="song-item">
              <img src={song.albumCover} alt="" className="song-cover" />
              <div className="song-info">
                <div className="song-title">{song.title}</div>
                <div className="song-artist">{song.artist}</div>
              </div>
              <button className="song-action" onClick={() => handleRequest(song)}>
                + Add
              </button>
            </div>
          ))}
        </>
      )}

      {/* Queue Tab */}
      {tab === 'queue' && (
        <>
          {pendingQueue.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📭</div>
              <p>Queue is empty. Be the first to request a song!</p>
            </div>
          ) : (
            pendingQueue.map((item, idx) => (
              <div key={item.id} className="song-item">
                <div className="queue-pos">{idx + 1}</div>
                <img src={item.song.albumCover} alt="" className="song-cover" />
                <div className="song-info">
                  <div className="song-title">{item.song.title}</div>
                  <div className="song-artist">
                    {item.song.artist}
                    <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: '0.75rem' }}>
                      by {item.requestedBy}
                    </span>
                    {item.duplicateCount > 0 && (
                      <span style={{ color: 'var(--warning)', marginLeft: 6, fontSize: '0.75rem' }}>
                        🔥 {item.duplicateCount + 1}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type === 'warning' ? 'warning' : ''}`}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
