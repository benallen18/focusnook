import { useState, useEffect } from 'react';
import { Check, Plus, Trash2, Zap, RotateCcw } from 'lucide-react';
import { storage } from '../services/storage';

const defaultChecklist = [
  { id: 1, text: 'Add your Pre-Focus Routine items here', completed: false },
];

export default function FocusPrep() {
  const [items, setItems] = useState(defaultChecklist);
  const [isLoading, setIsLoading] = useState(true);
  const [newItem, setNewItem] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const loadItems = async () => {
      const saved = await storage.get('focusnook-focus-prep');
      if (Array.isArray(saved)) {
        setItems(saved);
      }
      setIsLoading(false);
    };
    loadItems();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      storage.set('focusnook-focus-prep', items);
    }
  }, [isLoading, items]);

  const toggleItem = (id) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const addItem = (e) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    setItems(prev => [...prev, {
      id: Date.now(),
      text: newItem.trim(),
      completed: false
    }]);
    setNewItem('');
  };

  const deleteItem = (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const resetChecklist = () => {
    setItems(prev => prev.map(item => ({ ...item, completed: false })));
  };

  const completedCount = items.filter(i => i.completed).length;
  const allComplete = items.length > 0 && completedCount === items.length;

  return (
    <div className="focus-prep glass-panel">
      <div className="focus-prep-header">
        <div className="focus-prep-title">
          <Zap size={18} className={allComplete ? 'ready' : ''} />
          <h3>Focus Prep</h3>
        </div>
        <div className="focus-prep-actions">
          <button
            className="reset-btn"
            onClick={resetChecklist}
            title="Reset all items"
          >
            <RotateCcw size={14} />
          </button>
          <span className="focus-count">{completedCount}/{items.length}</span>
        </div>
      </div>

      {allComplete && (
        <div className="ready-banner">
          <Zap size={16} />
          <span>Ready for deep focus!</span>
        </div>
      )}

      <div className="focus-items">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`focus-item ${item.completed ? 'completed' : ''}`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <button
              className={`checkbox ${item.completed ? 'checked' : ''}`}
              onClick={() => toggleItem(item.id)}
            >
              {item.completed && <Check size={14} />}
            </button>
            <span className="focus-item-text">{item.text}</span>
            {isEditing && (
              <button
                className="delete-btn"
                onClick={() => deleteItem(item.id)}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {isEditing ? (
        <form onSubmit={addItem} className="add-item-form">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Add prep step..."
            className="add-item-input"
          />
          <button type="submit" className="add-btn">
            <Plus size={16} />
          </button>
        </form>
      ) : null}

      <button
        className={`edit-toggle ${isEditing ? 'active' : ''}`}
        onClick={() => setIsEditing(!isEditing)}
      >
        {isEditing ? 'Done editing' : 'Edit checklist'}
      </button>

      <style>{`
        .focus-prep {
          padding: var(--space-5);
          width: 100%;
          height: 100%;
          min-width: 240px;
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        
        .focus-prep-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .focus-prep-title {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        
        .focus-prep-title svg {
          color: var(--color-text-muted);
          transition: all var(--transition-normal);
        }
        
        .focus-prep-title svg.ready {
          color: #fbbf24;
          filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.6));
          animation: pulse 1.5s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        
        .focus-prep-title h3 {
          font-size: var(--font-size-lg);
          font-weight: 600;
        }
        
        .focus-prep-actions {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        
        .reset-btn {
          padding: var(--space-1);
          color: var(--color-text-muted);
          transition: all var(--transition-fast);
        }
        
        .reset-btn:hover {
          color: var(--color-text);
        }
        
        .focus-count {
          font-size: var(--font-size-sm);
          color: var(--color-text-muted);
          background: var(--color-surface);
          padding: var(--space-1) var(--space-3);
          border-radius: var(--radius-full);
        }
        
        .ready-banner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
          padding: var(--space-3);
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.15));
          border: 1px solid rgba(251, 191, 36, 0.4);
          border-radius: var(--radius-md);
          color: #fbbf24;
          font-weight: 600;
          font-size: var(--font-size-sm);
          animation: fadeIn 0.3s ease-out;
        }
        
        .ready-banner svg {
          animation: pulse 1.5s ease-in-out infinite;
        }
        
        .focus-items {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          overflow-y: auto;
        }
        
        .focus-item {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3);
          background: var(--color-surface);
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
          transition: all var(--transition-fast);
          animation: slideUp 0.3s ease-out both;
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .focus-item:hover {
          background: var(--color-surface-hover);
        }
        
        .focus-item.completed {
          opacity: 0.6;
        }
        
        .focus-item.completed .focus-item-text {
          text-decoration: line-through;
          color: var(--color-text-muted);
        }
        
        .focus-item-text {
          flex: 1;
          font-size: var(--font-size-sm);
        }
        
        .focus-item .delete-btn {
          color: var(--color-text-muted);
          padding: var(--space-1);
          transition: all var(--transition-fast);
        }
        
        .focus-item .delete-btn:hover {
          color: var(--color-danger);
        }
        
        .add-item-form {
          display: flex;
          gap: var(--space-2);
        }
        
        .add-item-input {
          flex: 1;
          padding: var(--space-2) var(--space-3);
          font-size: var(--font-size-sm);
        }
        
        .add-item-form .add-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-accent);
          color: white;
          border-radius: var(--radius-md);
          transition: all var(--transition-fast);
        }
        
        .add-item-form .add-btn:hover {
          background: var(--color-accent-hover);
          transform: scale(1.05);
        }
        
        .edit-toggle {
          padding: var(--space-2);
          font-size: var(--font-size-xs);
          color: var(--color-text-muted);
          text-align: center;
          border-radius: var(--radius-md);
          transition: all var(--transition-fast);
        }
        
        .edit-toggle:hover {
          background: var(--color-surface);
          color: var(--color-text);
        }
        
        .edit-toggle.active {
          background: var(--color-surface);
          color: var(--color-accent);
        }
      `}</style>
    </div>
  );
}
