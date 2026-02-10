import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, X, Calendar } from 'lucide-react';
import { storage } from '../services/storage';

// Parse duration string like "1h30m", "45m", "2h" into minutes
function parseDuration(durationStr) {
  const hours = durationStr.match(/(\d+)h/);
  const minutes = durationStr.match(/(\d+)m/);
  let total = 0;
  if (hours) total += parseInt(hours[1]) * 60;
  if (minutes) total += parseInt(minutes[1]);
  return total || 30; // Default to 30 minutes
}

// Parse time string like "9am", "12pm", "2:30pm" into minutes from midnight
function parseTime(timeStr) {
  const match = timeStr.toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return null;

  let hours = parseInt(match[1]);
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const period = match[3];

  if (period === 'pm' && hours !== 12) hours += 12;
  if (period === 'am' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

// Format minutes from midnight to time string
function formatTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return mins > 0 ? `${displayHours}:${mins.toString().padStart(2, '0')} ${period}` : `${displayHours} ${period}`;
}

const MIN_HOUR_HEIGHT = 56;

export default function DailyPlanner({ startHour = 9, endHour = 17 }) {
  // Calculate total hours based on props
  const totalHours = endHour - startHour;
  const dayStartMinutes = startHour * 60;
  const dayEndMinutes = endHour * 60;

  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState([]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newEvent, setNewEvent] = useState({ name: '', time: '', duration: '' });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hourHeight, setHourHeight] = useState(60);
  const timelineContainerRef = useRef(null);

  // Load saved events
  useEffect(() => {
    const loadEvents = async () => {
      const saved = await storage.get('focusnook-events');
      if (Array.isArray(saved)) {
        setEvents(saved);
      }
      setIsLoading(false); // Keep isLoading logic
    };
    loadEvents();
  }, []);

  useEffect(() => {
    const element = timelineContainerRef.current;
    if (!element || totalHours <= 0) return undefined;

    const recalculateHourHeight = () => {
      const styles = window.getComputedStyle(element);
      const paddingTop = Number.parseFloat(styles.paddingTop || '0') || 0;
      const paddingBottom = Number.parseFloat(styles.paddingBottom || '0') || 0;
      const availableHeight = element.clientHeight - paddingTop - paddingBottom;
      if (!availableHeight) return;
      const proposed = availableHeight / totalHours;
      setHourHeight(Math.max(MIN_HOUR_HEIGHT, proposed));
    };

    recalculateHourHeight();
    const observer = new ResizeObserver(recalculateHourHeight);
    observer.observe(element);

    return () => observer.disconnect();
  }, [totalHours]);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Save events to storage
  useEffect(() => {
    if (!isLoading) { // Keep isLoading condition
      storage.set('focusnook-events', events);
    }
  }, [events, isLoading]); // Keep isLoading in dependency array

  const addEvent = useCallback(() => {
    if (!newEvent.name || !newEvent.time) return;

    const startMinutes = parseTime(newEvent.time);
    if (startMinutes === null) return;

    const durationMinutes = parseDuration(newEvent.duration || '30m');

    setEvents(prev => [...prev, {
      id: Date.now(),
      name: newEvent.name,
      startMinutes,
      durationMinutes,
      date: new Date().toDateString()
    }]);

    setNewEvent({ name: '', time: '', duration: '' });
    setShowAddForm(false);
  }, [newEvent]);

  const deleteEvent = useCallback((id) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  // Current time in minutes from midnight
  const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

  // Check event status
  const getEventStatus = (event) => {
    const eventStart = event.startMinutes;
    const eventEnd = event.startMinutes + event.durationMinutes;

    if (nowMinutes >= eventStart && nowMinutes < eventEnd) {
      return 'active'; // Currently happening
    }
    if (nowMinutes >= eventStart - 10 && nowMinutes < eventStart) {
      return 'upcoming'; // Within 10 minutes
    }
    if (nowMinutes >= eventEnd) {
      return 'past';
    }
    return 'future';
  };

  // Calculate position for current time indicator
  const currentTimeOffset = ((nowMinutes - dayStartMinutes) / 60) * hourHeight;
  const showTimeIndicator = nowMinutes >= dayStartMinutes && nowMinutes <= dayEndMinutes;

  // Hour labels
  const hours = Array.from({ length: totalHours + 1 }, (_, i) => startHour + i);

  return (
    <div className="daily-planner glass-panel">
      <div className="planner-header">
        <div className="planner-title">
          <Calendar size={16} />
          <span>Daily Planner</span>
        </div>
        <button
          className="icon-btn add-event-btn"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Add Event Form */}
      {showAddForm && (
        <div className="add-event-form">
          <input
            type="text"
            placeholder="Event name..."
            value={newEvent.name}
            onChange={(e) => setNewEvent(prev => ({ ...prev, name: e.target.value }))}
            autoFocus
          />
          <div className="time-inputs">
            <input
              type="text"
              placeholder="Time (e.g. 2pm)"
              value={newEvent.time}
              onChange={(e) => setNewEvent(prev => ({ ...prev, time: e.target.value }))}
            />
            <input
              type="text"
              placeholder="Duration (e.g. 1h)"
              value={newEvent.duration}
              onChange={(e) => setNewEvent(prev => ({ ...prev, duration: e.target.value }))}
            />
          </div>
          <div className="form-actions">
            <button className="btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
            <button className="btn-primary" onClick={addEvent}>Add</button>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="timeline-container" ref={timelineContainerRef}>
        <div className="timeline" style={{ height: totalHours * hourHeight }}>
          {/* Hour lines */}
          {hours.map((hour, i) => (
            <div
              key={hour}
              className="hour-line"
              style={{ top: i * hourHeight }}
            >
              <span className="hour-label">{formatTime(hour * 60)}</span>
              <div className="hour-divider" />
            </div>
          ))}

          {/* Events */}
          {events
            .filter(event => {
              // Only show events that overlap with 9am-5pm
              return !(event.startMinutes + event.durationMinutes < dayStartMinutes ||
                event.startMinutes > dayEndMinutes);
            })
            .sort((a, b) => a.startMinutes - b.startMinutes) // Sort by start time
            .map((event) => {
              const status = getEventStatus(event);

              // Calculate position based on start time (exact position)
              const top = ((event.startMinutes - dayStartMinutes) / 60) * hourHeight;

              // Calculate height based on duration (exact height)
              const height = (event.durationMinutes / 60) * hourHeight;

              // Short events get compact layout
              const isCompact = event.durationMinutes < 45;

              return (
                <div
                  key={event.id}
                  className={`event-block ${status} ${isCompact ? 'compact' : ''}`}
                  style={{
                    top: `${top}px`,
                    height: `${height}px`
                  }}
                >
                  <div className="event-content">
                    <span className="event-name">{event.name}</span>
                    {!isCompact && (
                      <span className="event-time">
                        {formatTime(event.startMinutes)} · {event.durationMinutes}m
                      </span>
                    )}
                  </div>
                  {isCompact && (
                    <span className="event-time-compact">
                      {event.durationMinutes}m
                    </span>
                  )}
                  <button
                    className="event-delete"
                    onClick={() => deleteEvent(event.id)}
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}

          {/* Current time indicator */}
          {showTimeIndicator && (
            <div
              className="current-time-indicator"
              style={{ top: currentTimeOffset }}
            >
              <div className="time-dot" />
              <div className="time-line" />
            </div>
          )}
        </div>
      </div>

      <style>{`
        .daily-planner {
          width: 100%;
          height: 100%;
          min-width: 200px;
          display: flex;
          flex-direction: column;
        }
        
        .planner-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-4);
          border-bottom: 1px solid var(--glass-border);
        }
        
        .planner-title {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-weight: 600;
          font-size: var(--font-size-sm);
        }
        
        .add-event-btn {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-full);
          background: var(--color-accent);
          color: white;
        }
        
        .add-event-btn:hover {
          background: var(--color-accent-hover);
        }
        
        .add-event-form {
          padding: var(--space-4);
          border-bottom: 1px solid var(--glass-border);
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        
        .add-event-form input {
          width: 100%;
          padding: var(--space-3);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text);
          font-size: var(--font-size-sm);
        }
        
        .add-event-form input:focus {
          outline: none;
          border-color: var(--color-accent);
        }
        
        .time-inputs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-2);
        }
        
        .form-actions {
          display: flex;
          gap: var(--space-2);
          justify-content: flex-end;
        }
        
        .btn-secondary,
        .btn-primary {
          padding: var(--space-2) var(--space-4);
          border-radius: var(--radius-md);
          font-size: var(--font-size-sm);
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        
        .btn-secondary {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          color: var(--color-text-secondary);
        }
        
        .btn-secondary:hover {
          background: var(--color-surface-hover);
        }
        
        .btn-primary {
          background: var(--color-accent);
          border: none;
          color: white;
        }
        
        .btn-primary:hover {
          background: var(--color-accent-hover);
        }
        
        .timeline-container {
          flex: 1;
          overflow-y: auto;
          padding: var(--space-3) var(--space-4);
          min-height: 0; /* Allows flex child to shrink below content size */
        }
        
        .timeline-container::-webkit-scrollbar {
          width: 6px;
        }
        
        .timeline-container::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .timeline-container::-webkit-scrollbar-thumb {
          background: var(--color-border);
          border-radius: 3px;
        }
        
        .timeline-container::-webkit-scrollbar-thumb:hover {
          background: var(--color-text-muted);
        }
        
        .timeline {
          position: relative;
          margin-left: 56px;
        }
        
        .hour-line {
          position: absolute;
          left: 0;
          right: 0;
          display: flex;
          align-items: center;
        }
        
        .hour-label {
          position: absolute;
          right: 100%;
          margin-right: var(--space-3);
          font-size: var(--font-size-xs);
          color: var(--color-text-muted);
          white-space: nowrap;
        }
        
        .hour-divider {
          flex: 1;
          height: 1px;
          background: var(--color-border);
        }
        
        .event-block {
          position: absolute;
          left: var(--space-2);
          right: var(--space-2);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 4px var(--space-3);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--space-2);
          overflow: hidden;
          transition: all var(--transition-fast);
          min-height: 24px;
          box-sizing: border-box;
        }
        
        .event-block.future {
          border-left: 3px solid var(--color-border);
        }
        
        .event-block.upcoming {
          background: rgba(251, 191, 36, 0.15);
          border-color: rgba(251, 191, 36, 0.5);
          border-left: 3px solid #fbbf24;
          animation: pulse-glow 2s ease-in-out infinite;
        }
        
        .event-block.active {
          background: rgba(34, 197, 94, 0.15);
          border-color: rgba(34, 197, 94, 0.5);
          border-left: 3px solid #22c55e;
        }
        
        .event-block.past {
          opacity: 0.5;
          border-left: 3px solid var(--color-text-muted);
        }
        
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.3); }
          50% { box-shadow: 0 0 12px 2px rgba(251, 191, 36, 0.3); }
        }
        
        .event-content {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .event-name {
          font-size: var(--font-size-sm);
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .event-time {
          font-size: var(--font-size-xs);
          color: var(--color-text-muted);
        }
        
        .event-time-compact {
          font-size: 10px;
          color: var(--color-text-muted);
          flex-shrink: 0;
        }
        
        .event-block.compact {
          padding: 2px 8px;
        }
        
        .event-block.compact .event-content {
          flex-direction: row;
          align-items: center;
          gap: 0;
        }
        
        .event-block.compact .event-name {
          font-size: 11px;
        }
        
        .event-delete {
          opacity: 0;
          padding: 4px;
          background: transparent;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
          flex-shrink: 0;
        }
        
        .event-block:hover .event-delete {
          opacity: 1;
        }
        
        .event-delete:hover {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }
        
        .current-time-indicator {
          position: absolute;
          left: 0;
          right: 0;
          display: flex;
          align-items: center;
          z-index: 10;
          pointer-events: none;
        }
        
        .time-dot {
          width: 10px;
          height: 10px;
          background: #ef4444;
          border-radius: 50%;
          margin-left: -5px;
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
        }
        
        .time-line {
          flex: 1;
          height: 2px;
          background: #ef4444;
        }
      `}</style>
    </div>
  );
}
