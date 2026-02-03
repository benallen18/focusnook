import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Plus, X, Music, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { defaultMusicStreams } from '../data/spaces';

import { storage } from '../services/storage';

export default function MusicPlayer({ musicState, onMusicStateChange }) {
  // Use props if provided (for persistent playback), otherwise use local state
  const isControlled = musicState !== undefined;
  const [isStorageLoading, setIsStorageLoading] = useState(true);

  // Local state fallback (for backward compatibility)
  const [localCustomStreams, setLocalCustomStreams] = useState([]);

  useEffect(() => {
    if (!isControlled) {
      storage.get('chillspace-custom-streams').then(saved => {
        if (saved) setLocalCustomStreams(saved);
        setIsStorageLoading(false);
      });
    } else {
      setIsStorageLoading(false); // Controlled mode, no local load needed
    }
  }, [isControlled]);

  const customStreams = isControlled ? (musicState.customStreams || []) : localCustomStreams;
  const setCustomStreams = isControlled
    ? (streams) => onMusicStateChange(prev => ({
      ...prev,
      customStreams: typeof streams === 'function' ? streams(prev.customStreams || []) : streams
    }))
    : setLocalCustomStreams;

  const allStreams = [...defaultMusicStreams, ...customStreams];

  const [localSelectedStream, setLocalSelectedStream] = useState(allStreams[0]);
  const [localIsPlaying, setLocalIsPlaying] = useState(false);

  const selectedStream = isControlled ? (musicState.selectedStream || allStreams[0]) : localSelectedStream;
  const isPlaying = isControlled ? musicState.isPlaying : localIsPlaying;

  const setSelectedStream = isControlled
    ? (stream) => onMusicStateChange(prev => ({ ...prev, selectedStream: stream }))
    : setLocalSelectedStream;

  const setIsPlaying = isControlled
    ? (playing) => onMusicStateChange(prev => ({ ...prev, isPlaying: typeof playing === 'function' ? playing(prev.isPlaying) : playing }))
    : setLocalIsPlaying;

  const [volume, setLocalVolume] = useState(50);
  const [isMuted, setLocalIsMuted] = useState(false);

  // Controlled or local state
  const currentVolume = isControlled ? (musicState.volume ?? 50) : volume;
  const currentIsMuted = isControlled ? (musicState.isMuted ?? false) : isMuted;

  const updateVolume = isControlled
    ? (vol) => onMusicStateChange(prev => ({ ...prev, volume: vol }))
    : setLocalVolume;

  const updateMute = isControlled
    ? (muted) => onMusicStateChange(prev => ({ ...prev, isMuted: muted }))
    : setLocalIsMuted;

  const [showStreamList, setShowStreamList] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStreamUrl, setNewStreamUrl] = useState('');
  const [newStreamName, setNewStreamName] = useState('');

  const dropdownRef = useRef(null);

  // Save custom streams to storage
  useEffect(() => {
    if (!isControlled && !isStorageLoading) {
      storage.set('chillspace-custom-streams', localCustomStreams);
    }
  }, [localCustomStreams, isControlled, isStorageLoading]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowStreamList(false);
      }
    };

    if (showStreamList) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showStreamList]);

  // Extract video ID from YouTube URL
  const extractVideoId = (url) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const handleAddStream = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const videoId = extractVideoId(newStreamUrl.trim());
    if (!videoId || !newStreamName.trim()) return;

    const newStream = {
      id: `custom-${Date.now()}`,
      name: newStreamName.trim(),
      category: 'custom',
      videoId,
      channelIcon: `https://img.youtube.com/vi/${videoId}/default.jpg`,
      isCustom: true,
    };

    setCustomStreams(prev => [...prev, newStream]);
    setNewStreamUrl('');
    setNewStreamName('');
    setShowAddForm(false);
  };

  const handleRemoveStream = (e, streamId) => {
    e.stopPropagation();
    e.preventDefault();
    setCustomStreams(prev => prev.filter(s => s.id !== streamId));
    if (selectedStream?.id === streamId) {
      setSelectedStream(allStreams[0]);
      setIsPlaying(false);
    }
  };

  const handleStreamSelect = (e, stream) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedStream(stream);
    setShowStreamList(false);
    setIsPlaying(true);
  };

  const togglePlay = (e) => {
    e.stopPropagation();
    setIsPlaying(!isPlaying);
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    updateMute(!currentIsMuted);
  };

  const handleDropdownToggle = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setShowStreamList(!showStreamList);
  };

  // YouTube embed URL with autoplay and controls
  const embedUrl = selectedStream
    ? `https://www.youtube.com/embed/${selectedStream.videoId}?autoplay=${isPlaying ? 1 : 0}&mute=${currentIsMuted ? 1 : 0}&loop=1&playlist=${selectedStream.videoId}&controls=0&showinfo=0&rel=0&modestbranding=1`
    : '';

  return (
    <div className="music-player glass-panel">
      <div className="player-header">
        <h3>
          <Music size={18} />
          Music
        </h3>
      </div>

      {/* Now Playing */}
      <div className="now-playing" ref={dropdownRef}>
        <button
          className="stream-selector"
          onClick={handleDropdownToggle}
          onMouseDown={(e) => e.stopPropagation()}
          type="button"
        >
          <img
            src={selectedStream?.channelIcon}
            alt={selectedStream?.name}
            className="channel-icon"
            onError={(e) => { e.target.src = `https://img.youtube.com/vi/${selectedStream?.videoId}/default.jpg`; }}
          />
          <div className="stream-info">
            <span className="stream-name">{selectedStream?.name}</span>
            <span className="stream-category">{selectedStream?.category}</span>
          </div>
          {showStreamList ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {/* Stream List Dropdown */}
        {showStreamList && (
          <div className="stream-list animate-fadeIn" onMouseDown={(e) => e.stopPropagation()}>
            {allStreams.map(stream => (
              <button
                key={stream.id}
                className={`stream-item ${selectedStream?.id === stream.id ? 'active' : ''}`}
                onClick={(e) => handleStreamSelect(e, stream)}
                onMouseDown={(e) => e.stopPropagation()}
                type="button"
              >
                <img
                  src={stream.channelIcon}
                  alt={stream.name}
                  className="channel-icon-small"
                  onError={(e) => { e.target.src = `https://img.youtube.com/vi/${stream.videoId}/default.jpg`; }}
                />
                <span className="stream-item-name">{stream.name}</span>
                {stream.isCustom && (
                  <button
                    className="remove-stream-btn"
                    onClick={(e) => handleRemoveStream(e, stream.id)}
                    onMouseDown={(e) => e.stopPropagation()}
                    type="button"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </button>
            ))}

            {/* Add Custom Stream */}
            {!showAddForm ? (
              <button
                className="add-stream-btn"
                onClick={(e) => { e.stopPropagation(); setShowAddForm(true); }}
                onMouseDown={(e) => e.stopPropagation()}
                type="button"
              >
                <Plus size={14} />
                Add Custom Stream
              </button>
            ) : (
              <form className="add-stream-form" onSubmit={handleAddStream} onMouseDown={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  placeholder="Stream name"
                  value={newStreamName}
                  onChange={(e) => setNewStreamName(e.target.value)}
                  className="add-stream-input"
                  onClick={(e) => e.stopPropagation()}
                />
                <input
                  type="text"
                  placeholder="YouTube URL or ID"
                  value={newStreamUrl}
                  onChange={(e) => setNewStreamUrl(e.target.value)}
                  className="add-stream-input"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="add-form-actions">
                  <button type="submit" className="add-confirm-btn">Add</button>
                  <button
                    type="button"
                    className="add-cancel-btn"
                    onClick={(e) => { e.stopPropagation(); setShowAddForm(false); }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="player-controls">
        <button
          className={`control-btn play-btn ${isPlaying ? 'playing' : ''}`}
          onClick={togglePlay}
          onMouseDown={(e) => e.stopPropagation()}
          type="button"
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>

        <div className="volume-control" onMouseDown={(e) => e.stopPropagation()}>
          <button className="control-btn" onClick={toggleMute} type="button">
            {currentIsMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={currentIsMuted ? 0 : currentVolume}
            onChange={(e) => {
              const newVol = parseInt(e.target.value);
              updateVolume(newVol);
              if (currentIsMuted && newVol > 0) updateMute(false);
            }}
            className="volume-slider"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>

      {/* Hidden YouTube Player - only render if NOT controlled (controlled mode renders in App.jsx) */}
      {!isControlled && isPlaying && selectedStream && (
        <div className="youtube-embed">
          <iframe
            src={embedUrl}
            allow="autoplay; encrypted-media"
            allowFullScreen
            title="Music Player"
          />
        </div>
      )}

      <style>{`
        .music-player {
          padding: var(--space-5);
          width: 100%;
          height: 100%;
          min-width: 260px;
          min-height: 200px;
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          box-sizing: border-box;
        }

        .player-header h3 {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-size: var(--font-size-lg);
          font-weight: 600;
        }

        .now-playing {
          position: relative;
          z-index: 100;
        }

        .stream-selector {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          width: 100%;
          padding: var(--space-3);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .stream-selector:hover {
          background: var(--color-surface-hover);
          border-color: var(--color-border-hover);
        }

        .channel-icon {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-full);
          object-fit: cover;
        }

        .stream-info {
          flex: 1;
          text-align: left;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .stream-name {
          font-size: var(--font-size-sm);
          font-weight: 600;
        }

        .stream-category {
          font-size: var(--font-size-xs);
          color: var(--color-text-muted);
          text-transform: capitalize;
        }

        .stream-list {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: var(--space-2);
          background: var(--glass-bg);
          backdrop-filter: blur(20px);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-md);
          max-height: 240px;
          overflow-y: auto;
          z-index: 1000;
        }

        .stream-item {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          width: 100%;
          padding: var(--space-3);
          border-bottom: 1px solid var(--color-border);
          transition: all var(--transition-fast);
          cursor: pointer;
        }

        .stream-item:last-child {
          border-bottom: none;
        }

        .stream-item:hover {
          background: var(--color-surface-hover);
        }

        .stream-item.active {
          background: rgba(99, 102, 241, 0.15);
        }

        .channel-icon-small {
          width: 28px;
          height: 28px;
          border-radius: var(--radius-full);
          object-fit: cover;
        }

        .stream-item-name {
          flex: 1;
          font-size: var(--font-size-sm);
          text-align: left;
        }

        .remove-stream-btn {
          padding: var(--space-1);
          color: var(--color-text-muted);
          opacity: 0;
          transition: all var(--transition-fast);
        }

        .stream-item:hover .remove-stream-btn {
          opacity: 1;
        }

        .remove-stream-btn:hover {
          color: var(--color-danger);
        }

        .add-stream-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
          width: 100%;
          padding: var(--space-3);
          color: var(--color-accent);
          font-size: var(--font-size-sm);
          font-weight: 500;
          transition: all var(--transition-fast);
          cursor: pointer;
        }

        .add-stream-btn:hover {
          background: var(--color-surface-hover);
        }

        .add-stream-form {
          padding: var(--space-3);
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .add-stream-input {
          padding: var(--space-2);
          font-size: var(--font-size-sm);
        }

        .add-form-actions {
          display: flex;
          gap: var(--space-2);
        }

        .add-confirm-btn, .add-cancel-btn {
          flex: 1;
          padding: var(--space-2);
          border-radius: var(--radius-md);
          font-size: var(--font-size-sm);
          font-weight: 500;
          cursor: pointer;
        }

        .add-confirm-btn {
          background: var(--color-accent);
          color: white;
        }

        .add-cancel-btn {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
        }

        .player-controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-4);
        }

        .control-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-2);
          color: var(--color-text-secondary);
          transition: all var(--transition-fast);
          cursor: pointer;
        }

        .control-btn:hover {
          color: var(--color-text);
        }

        .play-btn {
          width: 48px;
          height: 48px;
          background: var(--color-accent);
          color: white;
          border-radius: var(--radius-full);
        }

        .play-btn:hover {
          background: var(--color-accent-hover);
          transform: scale(1.05);
        }

        .play-btn.playing {
          background: var(--color-surface);
          color: var(--color-text);
          border: 2px solid var(--color-accent);
        }

        .volume-control {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }

        .volume-slider {
          width: 80px;
        }

        .youtube-embed {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          opacity: 0;
          pointer-events: none;
        }

        .youtube-embed iframe {
          width: 100%;
          height: 100%;
        }
      `}</style>
    </div>
  );
}
