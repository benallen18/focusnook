import { useState, useEffect, useCallback } from 'react';
import { Plus, Check, Trash2, GripVertical, RefreshCw, Cloud, Target } from 'lucide-react';
import * as todoistApi from '../services/todoistApi';
import { storage } from '../services/storage';

export default function TodoList({ todoistConfig }) {
  const isConnected = todoistConfig?.isConnected && todoistConfig?.token;

  // Local todos (used when not connected to Todoist)
  const [localTodos, setLocalTodos] = useState([
    { id: 1, text: 'Welcome to FocusNook! ✨', completed: false },
    { id: 2, text: 'Add your tasks here', completed: false },
  ]);

  // Todoist todos (used when connected)
  const [todoistTodos, setTodoistTodos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStorageLoading, setIsStorageLoading] = useState(true);
  const [error, setError] = useState('');
  const [newTodo, setNewTodo] = useState('');

  // Drag and drop state
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  // Local task order for Todoist tasks (persisted in storage)
  const [localTaskOrder, setLocalTaskOrder] = useState([]);

  // Focus task - the ONE task to concentrate on
  const [focusTaskId, setFocusTaskId] = useState(null);

  // Load persisted data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [savedTodos, savedOrder, savedFocus] = await Promise.all([
          storage.get('focusnook-todos'),
          storage.get('focusnook-todoist-order'),
          storage.get('focusnook-focus-task')
        ]);

        if (savedTodos) setLocalTodos(savedTodos);
        if (savedOrder) setLocalTaskOrder(savedOrder);
        if (savedFocus) setFocusTaskId(savedFocus);
      } catch (err) {
        console.error('Failed to load todo data', err);
      } finally {
        setIsStorageLoading(false);
      }
    };
    loadData();
  }, []);

  // Save local todos
  useEffect(() => {
    if (!isConnected && !isStorageLoading) {
      storage.set('focusnook-todos', localTodos);
    }
  }, [localTodos, isConnected, isStorageLoading]);

  // Save focus task to localStorage
  // Save focus task
  useEffect(() => {
    if (!isStorageLoading) {
      storage.set('focusnook-focus-task', focusTaskId);
    }
  }, [focusTaskId, isStorageLoading]);

  // Save local task order to localStorage
  // Save local task order
  useEffect(() => {
    if (localTaskOrder.length > 0 && !isStorageLoading) {
      storage.set('focusnook-todoist-order', localTaskOrder);
    }
  }, [localTaskOrder, isStorageLoading]);

  // Toggle focus on a task (click to set, click again to clear)
  const toggleFocus = (id) => {
    setFocusTaskId(prev => prev === id ? null : id);
  };

  // Drag and drop handlers
  const handleDragStart = (e, id) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    // Add a slight delay to allow the drag image to be captured
    setTimeout(() => {
      e.target.classList.add('dragging');
    }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove('dragging');
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragOver = (e, id) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id !== draggedId) {
      setDragOverId(id);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    if (isConnected) {
      // For Todoist: update local order only (not synced to Todoist)
      // Always rebuild currentOrder from todoistTodos to include any new tasks
      const existingOrder = localTaskOrder.length > 0 ? localTaskOrder : [];
      const allTaskIds = todoistTodos.map(t => t.id);

      // Build order: existing ordered tasks first, then any new tasks at the end
      const currentOrder = [
        ...existingOrder.filter(id => allTaskIds.includes(id)),
        ...allTaskIds.filter(id => !existingOrder.includes(id))
      ];

      const draggedIndex = currentOrder.indexOf(draggedId);
      const targetIndex = currentOrder.indexOf(targetId);

      // Debug logging (can be removed later)
      console.log('Drag drop:', { draggedId, targetId, draggedIndex, targetIndex, currentOrder });

      if (draggedIndex !== -1 && targetIndex !== -1) {
        const newOrder = [...currentOrder];
        const [removed] = newOrder.splice(draggedIndex, 1);
        newOrder.splice(targetIndex, 0, removed);
        console.log('New order:', newOrder);
        setLocalTaskOrder(newOrder);
      }
    } else {
      // For local todos: update the actual array order
      setLocalTodos(prev => {
        const draggedIndex = prev.findIndex(t => t.id === draggedId);
        const targetIndex = prev.findIndex(t => t.id === targetId);

        if (draggedIndex === -1 || targetIndex === -1) return prev;

        const newTodos = [...prev];
        const [removed] = newTodos.splice(draggedIndex, 1);
        newTodos.splice(targetIndex, 0, removed);

        return newTodos;
      });
    }

    setDraggedId(null);
    setDragOverId(null);
  };

  // Fetch Todoist tasks when connected
  const fetchTodoistTasks = useCallback(async () => {
    if (!isConnected) return;

    setIsLoading(true);
    setError('');

    try {
      const filter = todoistConfig?.selectedFilter || 'today';
      const tasks = await todoistApi.getTasks(todoistConfig.token, { filter });
      setTodoistTodos(tasks);
    } catch (err) {
      setError('Failed to fetch tasks');
      console.error('Todoist fetch error:', err);
    }

    setIsLoading(false);
  }, [isConnected, todoistConfig?.token, todoistConfig?.selectedFilter]);

  // Fetch tasks when connection status or filter changes
  useEffect(() => {
    if (isConnected) {
      fetchTodoistTasks();
    }
  }, [isConnected, fetchTodoistTasks, todoistConfig?.selectedFilter]);

  // Get current todos based on connection status, with local ordering applied
  const todos = isConnected
    ? (localTaskOrder.length > 0
      ? [...todoistTodos].sort((a, b) => {
        const aIndex = localTaskOrder.indexOf(a.id);
        const bIndex = localTaskOrder.indexOf(b.id);
        // Tasks not in the order array go to the end
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      })
      : todoistTodos)
    : localTodos;
  const addTodo = async (e) => {
    e.preventDefault();
    if (!newTodo.trim()) return;

    if (isConnected) {
      setIsLoading(true);
      try {
        const filter = todoistConfig?.selectedFilter || 'today';
        const options = {
          dueToday: filter === 'today',
          projectId: filter !== 'today' && filter !== 'all' ? filter : undefined,
        };
        const task = await todoistApi.createTask(todoistConfig.token, newTodo.trim(), options);
        setTodoistTodos(prev => [...prev, task]);
      } catch {
        setError('Failed to add task');
      }
      setIsLoading(false);
    } else {
      setLocalTodos(prev => [
        ...prev,
        { id: Date.now(), text: newTodo.trim(), completed: false }
      ]);
    }
    setNewTodo('');
  };

  const toggleTodo = async (id) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    if (isConnected) {
      // Optimistic update
      setTodoistTodos(prev => prev.map(t =>
        t.id === id ? { ...t, completed: !t.completed } : t
      ));

      try {
        if (todo.completed) {
          await todoistApi.reopenTask(todoistConfig.token, id);
        } else {
          await todoistApi.closeTask(todoistConfig.token, id);
        }
      } catch {
        // Revert on error
        setTodoistTodos(prev => prev.map(t =>
          t.id === id ? { ...t, completed: todo.completed } : t
        ));
        setError('Failed to update task');
      }
    } else {
      setLocalTodos(prev => prev.map(t =>
        t.id === id ? { ...t, completed: !t.completed } : t
      ));
    }
  };

  const deleteTodo = async (id) => {
    if (isConnected) {
      // Optimistic update
      const prevTodos = todoistTodos;
      setTodoistTodos(prev => prev.filter(t => t.id !== id));

      try {
        await todoistApi.deleteTask(todoistConfig.token, id);
      } catch {
        // Revert on error
        setTodoistTodos(prevTodos);
        setError('Failed to delete task');
      }
    } else {
      setLocalTodos(prev => prev.filter(t => t.id !== id));
    }
  };

  const completedCount = todos.filter(t => t.completed).length;

  return (
    <div className="todo-list glass-panel">
      <div className="todo-header">
        <h3>
          Tasks
          {isConnected && (
            <span className="todoist-badge" title="Connected to Todoist">
              <Cloud size={14} />
            </span>
          )}
        </h3>
        <div className="todo-header-right">
          {isConnected && (
            <button
              className="refresh-btn"
              onClick={fetchTodoistTasks}
              disabled={isLoading}
              title="Refresh tasks"
            >
              <RefreshCw size={14} className={isLoading ? 'spinning' : ''} />
            </button>
          )}
          <span className="todo-count">{completedCount}/{todos.length}</span>
        </div>
      </div>

      {error && (
        <div className="todo-error">{error}</div>
      )}

      <div className="todos-container">
        {isLoading && todos.length === 0 ? (
          <div className="todo-loading">Loading tasks...</div>
        ) : todos.length === 0 ? (
          <div className="todo-empty">
            {isConnected ? 'No tasks in Todoist' : 'No tasks yet'}
          </div>
        ) : (
          todos.map((todo, index) => {
            const isFocused = focusTaskId === todo.id;
            const isDragging = draggedId === todo.id;
            const isDragOver = dragOverId === todo.id;
            return (
              <div
                key={todo.id}
                className={`todo-item ${todo.completed ? 'completed' : ''} ${isFocused ? 'focused' : ''} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''} animate-slideUp`}
                style={{ animationDelay: `${index * 50}ms` }}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, todo.id)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, todo.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, todo.id)}
              >
                {isFocused && (
                  <div className="focus-badge">
                    <Target size={10} />
                    FOCUS
                  </div>
                )}

                <div className="drag-handle" style={{ cursor: 'grab' }}>
                  <GripVertical size={14} />
                </div>

                <button
                  className={`checkbox ${todo.completed ? 'checked' : ''}`}
                  onClick={() => toggleTodo(todo.id)}
                >
                  {todo.completed && <Check size={14} />}
                </button>

                <span className="todo-text">{todo.text}</span>

                <button
                  className={`focus-btn ${isFocused ? 'active' : ''}`}
                  onClick={() => toggleFocus(todo.id)}
                  title={isFocused ? 'Remove focus' : 'Set as focus task'}
                >
                  <Target size={14} />
                </button>

                <button
                  className="delete-btn"
                  onClick={() => deleteTodo(todo.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={addTodo} className="add-todo-form">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder={isConnected ? "Add task to Todoist..." : "Add a task..."}
          className="add-todo-input"
          disabled={isLoading}
        />
        <button type="submit" className="add-btn" disabled={isLoading}>
          <Plus size={18} />
        </button>
      </form>

      <style>{`
        .todo-list {
          padding: var(--space-6);
          width: 100%;
          height: 100%;
          min-width: 200px;
          display: flex;
          flex-direction: column;
        }
        
        .todo-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-4);
        }
        
        .todo-header h3 {
          font-size: var(--font-size-lg);
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        
        .todoist-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #e44332;
        }
        
        .todo-header-right {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        
        .refresh-btn {
          padding: var(--space-1);
          color: var(--color-text-muted);
          transition: all var(--transition-fast);
        }
        
        .refresh-btn:hover {
          color: var(--color-text);
        }
        
        .refresh-btn:disabled {
          opacity: 0.5;
        }
        
        .spinning {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .todo-count {
          font-size: var(--font-size-sm);
          color: var(--color-text-muted);
          background: var(--color-surface);
          padding: var(--space-1) var(--space-3);
          border-radius: var(--radius-full);
        }
        
        .todo-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
          padding: var(--space-2) var(--space-3);
          border-radius: var(--radius-md);
          font-size: var(--font-size-xs);
          margin-bottom: var(--space-3);
        }
        
        .todo-loading, .todo-empty {
          text-align: center;
          padding: var(--space-6);
          color: var(--color-text-muted);
          font-size: var(--font-size-sm);
        }
        
        .todos-container {
          flex: 1;
          overflow-y: auto;
          overflow-x: visible;
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          margin-bottom: var(--space-4);
          /* Extra padding to prevent clipping of focus badge and glow */
          padding-top: 14px;
          padding-left: 8px;
          padding-right: 8px;
          margin-top: -6px;
          margin-left: -8px;
          margin-right: -8px;
        }
        
        .todo-item {
          position: relative;
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3);
          background: var(--color-surface);
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
          transition: all var(--transition-fast);
        }
        
        .todo-item:hover {
          background: var(--color-surface-hover);
        }
        
        .todo-item.completed {
          opacity: 0.6;
        }
        
        .todo-item.completed .todo-text {
          text-decoration: line-through;
          color: var(--color-text-muted);
        }
        
        /* Drag and drop styles */
        .todo-item.dragging {
          opacity: 0.5;
          background: var(--color-surface-hover);
          transform: scale(1.02);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .todo-item.drag-over {
          border-color: var(--color-accent);
          background: rgba(99, 102, 241, 0.1);
          transform: scale(1.01);
        }
        
        .todo-item.drag-over::before {
          content: '';
          position: absolute;
          top: -2px;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--color-accent);
          border-radius: 2px;
        }
        
        .drag-handle {
          color: var(--color-text-muted);
          cursor: grab;
          padding: 0;
          opacity: 0;
          transition: opacity var(--transition-fast);
        }
        
        .todo-item:hover .drag-handle {
          opacity: 1;
        }
        
        .todo-text {
          flex: 1;
          font-size: var(--font-size-sm);
          word-break: break-word;
        }
        
        .delete-btn {
          color: var(--color-text-muted);
          padding: var(--space-1);
          opacity: 0;
          transition: all var(--transition-fast);
        }
        
        .todo-item:hover .delete-btn {
          opacity: 1;
        }
        
        .delete-btn:hover {
          color: var(--color-danger);
        }
        
        /* Focus button */
        .focus-btn {
          color: var(--color-text-muted);
          padding: var(--space-1);
          opacity: 0;
          transition: all var(--transition-fast);
        }
        
        .todo-item:hover .focus-btn {
          opacity: 1;
        }
        
        .focus-btn:hover {
          color: #f59e0b;
        }
        
        .focus-btn.active {
          color: #f59e0b;
          opacity: 1;
        }
        
        /* FOCUSED TASK - The ONE thing to work on */
        .todo-item.focused {
          position: relative;
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(251, 191, 36, 0.1));
          border: 2px solid #f59e0b;
          box-shadow: 
            0 0 20px rgba(245, 158, 11, 0.3),
            0 0 40px rgba(245, 158, 11, 0.1),
            inset 0 0 20px rgba(245, 158, 11, 0.05);
          animation: focusPulse 2s ease-in-out infinite;
          transform: scale(1.02);
          z-index: 10;
        }
        
        .todo-item.focused:hover {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(251, 191, 36, 0.15));
        }
        
        .todo-item.focused .todo-text {
          font-weight: 600;
          color: var(--color-text);
        }
        
        .todo-item.focused .drag-handle {
          opacity: 0.5;
        }
        
        @keyframes focusPulse {
          0%, 100% {
            box-shadow: 
              0 0 20px rgba(245, 158, 11, 0.3),
              0 0 40px rgba(245, 158, 11, 0.1);
          }
          50% {
            box-shadow: 
              0 0 30px rgba(245, 158, 11, 0.5),
              0 0 60px rgba(245, 158, 11, 0.2);
          }
        }
        
        /* Focus badge - "THIS IS IT" indicator */
        .focus-badge {
          position: absolute;
          top: -10px;
          left: 12px;
          display: flex;
          align-items: center;
          gap: 4px;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.5px;
          padding: 3px 8px;
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4);
          text-transform: uppercase;
        }
        
        .add-todo-form {
          display: flex;
          gap: var(--space-2);
        }
        
        .add-todo-input {
          flex: 1;
          padding: var(--space-3);
        }
        
        .add-todo-input:disabled {
          opacity: 0.5;
        }
        
        .add-btn {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-accent);
          color: white;
          border-radius: var(--radius-md);
          transition: all var(--transition-fast);
        }
        
        .add-btn:hover:not(:disabled) {
          background: var(--color-accent-hover);
          transform: scale(1.05);
        }
        
        .add-btn:disabled {
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}
