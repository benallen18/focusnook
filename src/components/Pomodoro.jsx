import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Settings, Volume2, VolumeX } from 'lucide-react';

export default function Pomodoro({ isMuted = false, onMuteChange }) {
    const [mode, setMode] = useState('work'); // 'work' or 'break'
    const [isRunning, setIsRunning] = useState(false);
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [showSettings, setShowSettings] = useState(false);
    const [settings, setSettings] = useState({
        workDuration: 25,
        breakDuration: 5,
    });

    const intervalRef = useRef(null);
    const audioContextRef = useRef(null);

    // Create a synthesized notification sound using Web Audio API
    const playNotificationSound = useCallback(() => {
        if (isMuted) {
            return;
        }
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
            const ctx = audioContextRef.current;

            // Resume context if suspended (browser autoplay policy)
            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            const playTone = (frequency, startTime, duration) => {
                const oscillator = ctx.createOscillator();
                const gainNode = ctx.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(ctx.destination);

                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(frequency, startTime);

                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
                gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

                oscillator.start(startTime);
                oscillator.stop(startTime + duration);
            };

            const now = ctx.currentTime;
            // Play a pleasant two-tone notification
            playTone(523.25, now, 0.2);        // C5
            playTone(659.25, now + 0.2, 0.3);  // E5
        } catch {
            console.log('Audio notification not available');
        }
    }, [isMuted]);

    const totalTime = mode === 'work'
        ? settings.workDuration * 60
        : settings.breakDuration * 60;

    const progress = ((totalTime - timeLeft) / totalTime) * 100;
    const circumference = 2 * Math.PI * 90;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };



    useEffect(() => {
        if (isRunning && timeLeft > 0) {
            intervalRef.current = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            playNotificationSound();
            // Auto switch mode
            const newMode = mode === 'work' ? 'break' : 'work';
            setMode(newMode);
            setTimeLeft(newMode === 'work' ? settings.workDuration * 60 : settings.breakDuration * 60);
            setIsRunning(false);
        }

        return () => clearInterval(intervalRef.current);
    }, [isRunning, timeLeft, mode, settings, playNotificationSound]);

    // Listen for keyboard shortcut events
    useEffect(() => {
        const handleToggle = () => setIsRunning(prev => !prev);
        const handleReset = () => {
            setIsRunning(false);
            setTimeLeft(mode === 'work' ? settings.workDuration * 60 : settings.breakDuration * 60);
        };

        window.addEventListener('pomodoro-toggle', handleToggle);
        window.addEventListener('pomodoro-reset', handleReset);

        return () => {
            window.removeEventListener('pomodoro-toggle', handleToggle);
            window.removeEventListener('pomodoro-reset', handleReset);
        };
    }, [mode, settings]);

    const toggleTimer = () => setIsRunning(!isRunning);

    const resetTimer = () => {
        setIsRunning(false);
        setTimeLeft(mode === 'work' ? settings.workDuration * 60 : settings.breakDuration * 60);
    };

    const switchMode = (newMode) => {
        setMode(newMode);
        setIsRunning(false);
        setTimeLeft(newMode === 'work' ? settings.workDuration * 60 : settings.breakDuration * 60);
    };

    const updateSetting = (key, value) => {
        const numValue = Math.max(1, Math.min(60, parseInt(value) || 1));
        setSettings(prev => ({ ...prev, [key]: numValue }));
        if (!isRunning) {
            if (key === 'workDuration' && mode === 'work') {
                setTimeLeft(numValue * 60);
            } else if (key === 'breakDuration' && mode === 'break') {
                setTimeLeft(numValue * 60);
            }
        }
    };

    const accentColor = mode === 'work' ? 'var(--color-work)' : 'var(--color-break)';

    return (
        <div className="pomodoro glass-panel">
            <div className="pomodoro-header">
                <h3>Focus Timer</h3>
                <button
                    className="icon-btn settings-btn"
                    onClick={() => setShowSettings(!showSettings)}
                    title="Settings"
                >
                    <Settings size={18} />
                </button>
            </div>

            {showSettings ? (
                <div className="pomodoro-settings animate-fadeIn">
                    <div className="setting-row">
                        <label>Work (min)</label>
                        <input
                            type="number"
                            value={settings.workDuration}
                            onChange={(e) => updateSetting('workDuration', e.target.value)}
                            min="1"
                            max="60"
                        />
                    </div>
                    <div className="setting-row">
                        <label>Break (min)</label>
                        <input
                            type="number"
                            value={settings.breakDuration}
                            onChange={(e) => updateSetting('breakDuration', e.target.value)}
                            min="1"
                            max="60"
                        />
                    </div>
                    <div className="setting-row">
                        <label>Notification Sound</label>
                        <button
                            className={`sound-toggle-btn ${isMuted ? 'muted' : ''}`}
                            onClick={() => onMuteChange?.(!isMuted)}
                            type="button"
                        >
                            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                            {isMuted ? 'Muted' : 'On'}
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="mode-toggle">
                        <button
                            className={`mode-btn ${mode === 'work' ? 'active' : ''}`}
                            onClick={() => switchMode('work')}
                        >
                            Work
                        </button>
                        <button
                            className={`mode-btn ${mode === 'break' ? 'active' : ''}`}
                            onClick={() => switchMode('break')}
                        >
                            Break
                        </button>
                    </div>

                    <div className="timer-ring">
                        <svg viewBox="0 0 200 200">
                            {/* Background circle */}
                            <circle
                                cx="100"
                                cy="100"
                                r="90"
                                fill="none"
                                stroke="var(--color-surface)"
                                strokeWidth="6"
                            />
                            {/* Progress circle */}
                            <circle
                                cx="100"
                                cy="100"
                                r="90"
                                fill="none"
                                stroke={accentColor}
                                strokeWidth="6"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                transform="rotate(-90 100 100)"
                                style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                            />
                        </svg>
                        <div className="timer-display">
                            <span className="time" style={{ color: accentColor }}>
                                {formatTime(timeLeft)}
                            </span>
                            <span className="mode-label">{mode === 'work' ? 'Focus' : 'Rest'}</span>
                        </div>
                    </div>

                    <div className="timer-controls">
                        <button className="icon-btn" onClick={resetTimer} title="Reset">
                            <RotateCcw size={18} />
                        </button>
                        <button
                            className="play-btn"
                            onClick={toggleTimer}
                            style={{ background: accentColor }}
                        >
                            {isRunning ? <Pause size={24} /> : <Play size={24} />}
                        </button>
                    </div>
                </>
            )}

            <style>{`
        .pomodoro {
          padding: var(--space-6);
          width: 280px;
          display: flex;
          flex-direction: column;
          gap: var(--space-5);
        }
        
        .pomodoro-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .pomodoro-header h3 {
          font-size: var(--font-size-lg);
          font-weight: 600;
        }
        
        .settings-btn {
          width: 32px;
          height: 32px;
        }
        
        .mode-toggle {
          display: flex;
          gap: var(--space-2);
          background: var(--color-surface);
          padding: var(--space-1);
          border-radius: var(--radius-md);
        }
        
        .mode-btn {
          flex: 1;
          padding: var(--space-2) var(--space-4);
          border-radius: var(--radius-sm);
          font-size: var(--font-size-sm);
          font-weight: 500;
          color: var(--color-text-secondary);
          transition: all var(--transition-fast);
        }
        
        .mode-btn:hover {
          color: var(--color-text-primary);
        }
        
        .mode-btn.active {
          background: var(--color-surface-hover);
          color: var(--color-text-primary);
        }
        
        .timer-ring {
          position: relative;
          width: 200px;
          height: 200px;
          margin: 0 auto;
        }
        
        .timer-ring svg {
          width: 100%;
          height: 100%;
        }
        
        .timer-display {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }
        
        .timer-display .time {
          display: block;
          font-size: var(--font-size-3xl);
          font-weight: 600;
          font-variant-numeric: tabular-nums;
        }
        
        .timer-display .mode-label {
          font-size: var(--font-size-sm);
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .timer-controls {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: var(--space-4);
        }
        
        .play-btn {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: var(--shadow-md);
          transition: all var(--transition-fast);
        }
        
        .play-btn:hover {
          transform: scale(1.05);
          box-shadow: var(--shadow-lg);
        }
        
        .play-btn:active {
          transform: scale(0.95);
        }
        
        .pomodoro-settings {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          padding: var(--space-4) 0;
        }
        
        .setting-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .setting-row label {
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
        }
        
        .setting-row input {
          width: 80px;
          text-align: center;
          padding: var(--space-2);
        }

        .sound-toggle-btn {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-3);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text);
          background: var(--color-surface);
          font-size: var(--font-size-sm);
        }

        .sound-toggle-btn.muted {
          color: var(--color-text-muted);
          border-color: var(--color-border-hover);
        }
      `}</style>
        </div>
    );
}
