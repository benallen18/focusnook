import { Home, Timer, Volume2, CheckSquare, FileText, Calendar, Maximize, Minimize, Settings, Music, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';

// Widget configuration with icons
const WIDGET_CONFIG = {
  pomodoro: { icon: Timer, label: 'Timer' },
  // sounds: { icon: Volume2, label: 'Sounds' },
  todos: { icon: CheckSquare, label: 'Tasks' },
  notes: { icon: FileText, label: 'Notes' },
  planner: { icon: Calendar, label: 'Planner' },
  music: { icon: Music, label: 'Music' },
  focusprep: { icon: Zap, label: 'Focus' },
};

export default function NavigationDock({
  enabledWidgets,
  widgetVisibility,
  onToggleWidgetVisibility,
  onOpenSpaceBrowser,
  onOpenSettings
}) {
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

  // Listen for fullscreen changes (e.g., when user presses ESC to exit)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        // Request fullscreen on the document element
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          // Safari support
          await elem.webkitRequestFullscreen();
        }
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          // Safari support
          await document.webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  // Filter widgets to only show enabled ones in dock
  const widgetIds = Object.keys(enabledWidgets).filter(id => WIDGET_CONFIG[id] && enabledWidgets[id]);

  return (
    <nav className="navigation-dock">
      <div className="dock-container glass-panel">
        {/* Spaces button always visible */}
        <button
          className="dock-item"
          onClick={onOpenSpaceBrowser}
          title="Spaces"
        >
          <Home size={20} />
          <span className="dock-label">Spaces</span>
        </button>

        {/* Dynamic widget buttons */}
        {widgetIds.map(id => {
          const config = WIDGET_CONFIG[id];
          const Icon = config.icon;
          const isActive = widgetVisibility[id];

          return (
            <button
              key={id}
              className={`dock-item ${isActive ? 'active' : ''}`}
              onClick={() => onToggleWidgetVisibility(id)}
              title={config.label}
            >
              <Icon size={20} />
              <span className="dock-label">{config.label}</span>
            </button>
          );
        })}

        <div className="dock-divider" />

        <button
          className="dock-item"
          onClick={onOpenSettings}
          title="Settings"
        >
          <Settings size={20} />
        </button>

        <button
          className="dock-item"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
        </button>
      </div>

      <style>{`
        .navigation-dock {
          position: fixed;
          bottom: var(--space-6);
          left: 50%;
          transform: translateX(-50%);
          z-index: var(--z-dock);
        }
        
        .dock-container {
          display: flex;
          align-items: center;
          gap: var(--space-1);
          padding: var(--space-2);
        }
        
        .dock-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-1);
          padding: var(--space-3) var(--space-4);
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          transition: all var(--transition-fast);
          min-width: 60px;
        }
        
        .dock-item:hover {
          background: var(--color-surface-hover);
          color: var(--color-text-primary);
        }
        
        .dock-item.active {
          background: rgba(99, 102, 241, 0.2);
          color: var(--color-accent);
        }
        
        .dock-label {
          font-size: var(--font-size-xs);
          font-weight: 500;
        }
        
        .dock-divider {
          width: 1px;
          height: 32px;
          background: var(--color-border);
          margin: 0 var(--space-2);
        }
        
        @media (max-width: 600px) {
          .dock-label {
            display: none;
          }
          
          .dock-item {
            min-width: auto;
            padding: var(--space-3);
          }
        }
      `}</style>
    </nav>
  );
}
