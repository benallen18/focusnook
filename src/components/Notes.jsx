import { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { storage } from '../services/storage';

export default function Notes() {
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadNotes = async () => {
      const saved = await storage.get('focusnook-notes');
      if (saved) setNotes(saved);
      setIsLoading(false); // Keep this to ensure auto-save works after loading
    };
    loadNotes();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        storage.set('focusnook-notes', notes); // Updated storage key
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [notes, isLoading]);

  const wordCount = notes.trim() ? notes.trim().split(/\s+/).length : 0;

  return (
    <div className="notes glass-panel">
      <div className="notes-header">
        <FileText size={18} />
        <h3>Quick Notes</h3>
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Write your thoughts here..."
        className="notes-textarea"
      />

      <div className="notes-footer">
        <span className="word-count">{wordCount} words</span>
        <span className="auto-save">Auto-saved</span>
      </div>

      <style>{`
        .notes {
          padding: var(--space-6);
          width: 100%;
          height: 100%;
          min-width: 200px;
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }
        
        .notes-header {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }
        
        .notes-header h3 {
          font-size: var(--font-size-lg);
          font-weight: 600;
        }
        
        .notes-textarea {
          flex: 1;
          width: 100%;
          min-height: 100px;
          resize: none;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--space-4);
          font-size: var(--font-size-sm);
          line-height: 1.6;
          color: var(--color-text-primary);
          transition: all var(--transition-fast);
        }
        
        .notes-textarea:focus {
          border-color: var(--color-accent);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }
        
        .notes-textarea::placeholder {
          color: var(--color-text-muted);
        }
        
        .notes-footer {
          display: flex;
          justify-content: space-between;
          font-size: var(--font-size-xs);
          color: var(--color-text-muted);
        }
        
        .auto-save {
          color: var(--color-success);
        }
      `}</style>
    </div>
  );
}
