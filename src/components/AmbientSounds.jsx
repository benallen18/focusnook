import { useState, useRef, useEffect, useCallback } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { ambientSounds } from '../data/spaces';

export default function AmbientSounds() {
    const [activeSounds, setActiveSounds] = useState({});
    const [soundErrors, setSoundErrors] = useState({});
    const audioRefs = useRef({});

    const createAudio = useCallback((sound) => {
        const audio = new Audio(sound.url);
        audio.loop = true;
        audio.volume = 0.5;
        audio.preload = 'auto';
        audio.addEventListener('error', () => {
            setSoundErrors(prev => ({
                ...prev,
                [sound.id]: 'Failed to load audio. Please check the file path.'
            }));
        });
        return audio;
    }, []);

    const getAudio = useCallback((soundId) => {
        if (audioRefs.current[soundId]) return audioRefs.current[soundId];
        const sound = ambientSounds.find(s => s.id === soundId);
        if (!sound) return null;
        const audio = createAudio(sound);
        audioRefs.current[soundId] = audio;
        return audio;
    }, [createAudio]);

    useEffect(() => {
        return () => {
            // Cleanup audio on unmount
            Object.values(audioRefs.current).forEach(audio => {
                audio.pause();
                audio.src = '';
            });
        };
    }, []);

    const toggleSound = async (soundId) => {
        const audio = getAudio(soundId);
        if (!audio) return;

        setSoundErrors(prev => {
            if (!prev[soundId]) return prev;
            const next = { ...prev };
            delete next[soundId];
            return next;
        });

        if (activeSounds[soundId]) {
            audio.pause();
            setActiveSounds(prev => ({ ...prev, [soundId]: false }));
        } else {
            setActiveSounds(prev => ({ ...prev, [soundId]: true }));
            try {
                await audio.play();
            } catch (err) {
                console.warn('Ambient sound playback blocked or failed:', err);
                setSoundErrors(prev => ({
                    ...prev,
                    [soundId]: 'Playback was blocked. Try clicking again.'
                }));
                setActiveSounds(prev => ({ ...prev, [soundId]: false }));
            }
        }
    };

    const setVolume = (soundId, volume) => {
        const audio = audioRefs.current[soundId];
        if (audio) {
            audio.volume = volume;
        }
        // Force re-render to update slider
        setActiveSounds(prev => ({ ...prev }));
    };

    const getVolume = (soundId) => {
        const audio = audioRefs.current[soundId];
        return audio ? audio.volume : 0.5;
    };

    return (
        <div className="ambient-sounds glass-panel">
            <h3>Ambient Sounds</h3>

            <div className="sounds-list">
                {ambientSounds.map(sound => (
                    <div key={sound.id} className="sound-item">
                        <button
                            className={`sound-toggle ${activeSounds[sound.id] ? 'active' : ''}`}
                            onClick={() => toggleSound(sound.id)}
                        >
                            <span className="sound-icon">{sound.icon}</span>
                            <span className="sound-name">{sound.name}</span>
                            {activeSounds[sound.id] ? (
                                <Volume2 size={16} className="volume-icon" />
                            ) : (
                                <VolumeX size={16} className="volume-icon muted" />
                            )}
                        </button>

                        {activeSounds[sound.id] && (
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={getVolume(sound.id)}
                                onChange={(e) => setVolume(sound.id, parseFloat(e.target.value))}
                                className="volume-slider animate-fadeIn"
                            />
                        )}

                        {soundErrors[sound.id] && (
                            <div className="sound-error">{soundErrors[sound.id]}</div>
                        )}
                    </div>
                ))}
            </div>

            <style>{`
        .ambient-sounds {
          padding: var(--space-6);
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }
        
        .ambient-sounds h3 {
          font-size: var(--font-size-lg);
          font-weight: 600;
          margin-bottom: var(--space-5);
          flex-shrink: 0;
        }
        
        .sounds-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding-right: var(--space-1);
        }
        
        .sound-item {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        
        .sound-toggle {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3) var(--space-4);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          transition: all var(--transition-fast);
          width: 100%;
        }
        
        .sound-toggle:hover {
          background: var(--color-surface-hover);
          border-color: var(--color-border-hover);
        }
        
        .sound-toggle.active {
          background: rgba(99, 102, 241, 0.15);
          border-color: var(--color-accent);
        }
        
        .sound-icon {
          font-size: var(--font-size-lg);
        }
        
        .sound-name {
          flex: 1;
          text-align: left;
          font-size: var(--font-size-sm);
          font-weight: 500;
        }
        
        .volume-icon {
          color: var(--color-text-secondary);
        }
        
        .volume-icon.muted {
          opacity: 0.5;
        }
        
        .volume-slider {
          margin-left: var(--space-2);
          margin-right: var(--space-2);
        }

        .sound-error {
          font-size: var(--font-size-xs);
          color: #fca5a5;
          margin-left: var(--space-2);
        }
      `}</style>
        </div>
    );
}
