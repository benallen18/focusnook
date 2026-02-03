import { useState, useEffect } from 'react';

export default function Clock({ use12Hour = true }) {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => {
            setTime(new Date());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const formatTime = () => {
        if (use12Hour) {
            return time.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        }
        return time.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    const formatDate = () => {
        return time.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="clock">
            <div className="clock-time">{formatTime()}</div>
            <div className="clock-date">{formatDate()}</div>

            <style>{`
        .clock {
          text-align: center;
          user-select: none;
        }
        
        .clock-time {
          font-size: var(--font-size-4xl);
          font-weight: 300;
          letter-spacing: -0.02em;
          color: var(--color-text-primary);
          text-shadow: 0 2px 20px rgba(0, 0, 0, 0.5);
        }
        
        .clock-date {
          font-size: var(--font-size-lg);
          color: var(--color-text-secondary);
          margin-top: var(--space-1);
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
        }
      `}</style>
        </div>
    );
}
