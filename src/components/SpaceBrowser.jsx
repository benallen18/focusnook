import { useState } from 'react';
import { X, Plus, Edit2, Trash2, Check, ExternalLink, RotateCcw, EyeOff } from 'lucide-react';

export default function SpaceBrowser({
  spaces,
  currentSpaceId,
  onSelectSpace,
  onClose,
  onAddSpace,
  onUpdateSpace,
  onDeleteSpace,
  hasVisibleDefaultSpaces = false,
  hasHiddenDefaultSpaces = false,
  onHideAllDefaultSpaces,
  onResetDefaultSpaces,
}) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryRename, setCategoryRename] = useState('');

  // Delete Confirmation State
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);

  // Space Form State
  const [showSpaceForm, setShowSpaceForm] = useState(false);
  const [spaceFormMode, setSpaceFormMode] = useState('add'); // 'add' or 'edit'
  const [spaceformData, setSpaceFormData] = useState({
    id: '',
    name: '',
    category: '',
    description: '',
    youtubeUrl: ''
  });

  // Get unique categories
  const categories = [...new Set(spaces.map(s => s.category))];

  const getYouTubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleSpaceSubmit = (e) => {
    e.preventDefault();

    const videoId = getYouTubeId(spaceformData.youtubeUrl) || spaceformData.youtubeUrl;
    const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    const spaceData = {
      id: spaceFormMode === 'edit' ? spaceformData.id : Date.now().toString(),
      name: spaceformData.name,
      category: spaceformData.category,
      description: spaceformData.description,
      youtubeId: videoId,
      thumbnail: thumbnail,
      defaultSounds: [] // Default to no sounds for now
    };

    if (spaceFormMode === 'add') {
      onAddSpace(spaceData);
    } else {
      onUpdateSpace({ ...spaceData, isCustom: true });
    }

    setShowSpaceForm(false);
  };

  const openAddSpace = (category) => {
    setSpaceFormMode('add');
    setSpaceFormData({
      id: '',
      name: '',
      category: category,
      description: '',
      youtubeUrl: ''
    });
    setShowSpaceForm(true);
  };

  const openEditSpace = (e, space) => {
    e.stopPropagation();
    setSpaceFormMode('edit');
    setSpaceFormData({
      id: space.id,
      name: space.name,
      category: space.category,
      description: space.description,
      youtubeUrl: `https://www.youtube.com/watch?v=${space.youtubeId}`
    });
    setShowSpaceForm(true);
  };

  const handleDeleteSpace = (e, space) => {
    e.stopPropagation();
    setDeleteConfirmation(space);
  };

  const confirmDelete = () => {
    if (deleteConfirmation) {
      onDeleteSpace(deleteConfirmation.id);
      setDeleteConfirmation(null);
    }
  };

  const startRenamingCategory = (category) => {
    setEditingCategory(category);
    setCategoryRename(category);
  };

  const saveCategoryRename = (oldCategory) => {
    if (categoryRename && categoryRename !== oldCategory) {
      spaces.filter(s => s.category === oldCategory).forEach(space => {
        onUpdateSpace({ ...space, category: categoryRename });
      });
    }
    setEditingCategory(null);
  };

  return (
    <div className="space-browser-overlay" onClick={onClose}>
      <div className="space-browser glass-panel animate-scaleIn" onClick={(e) => e.stopPropagation()}>
        <div className="browser-header">
          <div className="header-titles">
            <h2>Choose Your Space</h2>
          </div>
          <div className="header-actions">
            {isEditMode && hasVisibleDefaultSpaces && (
              <button
                className="btn-secondary header-action-btn"
                onClick={() => onHideAllDefaultSpaces?.()}
                type="button"
              >
                <EyeOff size={14} />
                Hide Defaults
              </button>
            )}
            {isEditMode && hasHiddenDefaultSpaces && (
              <button
                className="btn-secondary header-action-btn"
                onClick={() => onResetDefaultSpaces?.()}
                type="button"
              >
                <RotateCcw size={14} />
                Reset Defaults
              </button>
            )}
            <button
              className={`btn-secondary edit-mode-btn ${isEditMode ? 'active' : ''}`}
              onClick={() => setIsEditMode(!isEditMode)}
            >
              {isEditMode ? <Check size={16} /> : <Edit2 size={16} />}
              {isEditMode ? 'Done' : 'Customize'}
            </button>
            <button className="icon-btn close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="browser-content">
          {categories.map(category => (
            <div key={category} className="category-section">
              <div className="category-header">
                {isEditMode && editingCategory === category ? (
                  <div className="category-rename">
                    <input
                      type="text"
                      value={categoryRename}
                      onChange={(e) => setCategoryRename(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && saveCategoryRename(category)}
                    />
                    <button className="icon-btn" onClick={() => saveCategoryRename(category)}>
                      <Check size={16} />
                    </button>
                  </div>
                ) : (
                  <h3
                    className={`category-title ${isEditMode ? 'editable' : ''}`}
                    onClick={() => isEditMode && startRenamingCategory(category)}
                    title={isEditMode ? "Click to rename" : ""}
                  >
                    {category}
                    {isEditMode && <Edit2 size={12} className="edit-icon" />}
                  </h3>
                )}
              </div>

              <div className="spaces-grid">
                {spaces.filter(s => s.category === category).map(space => (
                  <div
                    key={space.id}
                    role="button"
                    tabIndex={0}
                    className={`space-card ${currentSpaceId === space.id ? 'active' : ''} ${isEditMode && space.isCustom ? 'is-custom' : ''}`}
                    onClick={() => {
                      if (!isEditMode) {
                        onSelectSpace(space);
                        onClose();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (!isEditMode && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        onSelectSpace(space);
                        onClose();
                      }
                    }}
                  >
                    <div className="space-thumbnail">
                      <img src={space.thumbnail} alt={space.name} loading="lazy" />
                      {currentSpaceId === space.id && !isEditMode && (
                        <div className="now-playing">
                          <span>Now Playing</span>
                        </div>
                      )}
                      {isEditMode && space.isCustom && (
                        <div className="card-actions">
                          <button
                            className="action-btn edit"
                            onClick={(e) => openEditSpace(e, space)}
                            title="Edit Space"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="action-btn delete"
                            onClick={(e) => handleDeleteSpace(e, space)}
                            title="Delete Space"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="space-info">
                      <h4>{space.name}</h4>
                      <p>{space.description}</p>
                    </div>
                  </div>
                ))}
                {isEditMode && (
                  <button className="add-space-card" onClick={() => openAddSpace(category)}>
                    <div className="add-icon">
                      <Plus size={24} />
                    </div>
                    <span>Add Space</span>
                  </button>
                )}
              </div>
            </div>
          ))}

          {isEditMode && (
            <div className="add-category-section">
              <button className="btn-secondary" onClick={() => openAddSpace('New Category')}>
                <Plus size={16} />
                Add New Category
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-scaleIn" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Space</h3>
              <button className="icon-btn" onClick={() => setDeleteConfirmation(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete <strong>{deleteConfirmation.name}</strong>? This action cannot be undone.</p>
            </div>
            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setDeleteConfirmation(null)}>Cancel</button>
              <button className="btn-primary" style={{ background: '#ef4444' }} onClick={confirmDelete}>
                Delete Space
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Space Modal */}
      {showSpaceForm && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-scaleIn" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{spaceFormMode === 'add' ? 'Add New Space' : 'Edit Space'}</h3>
              <button className="icon-btn" onClick={() => setShowSpaceForm(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSpaceSubmit}>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  required
                  value={spaceformData.name}
                  onChange={e => setSpaceFormData({ ...spaceformData, name: e.target.value })}
                  placeholder="e.g., Lofi Chill"
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <input
                  type="text"
                  required
                  value={spaceformData.category} // TODO: make this a datalist/select
                  onChange={e => setSpaceFormData({ ...spaceformData, category: e.target.value })}
                  placeholder="e.g., Favorites"
                  list="category-list"
                />
                <datalist id="category-list">
                  {categories.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="form-group">
                <label>YouTube URL or ID</label>
                <div className="input-with-icon">
                  <input
                    type="text"
                    required
                    value={spaceformData.youtubeUrl}
                    onChange={e => setSpaceFormData({ ...spaceformData, youtubeUrl: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                  {spaceformData.youtubeUrl && (
                    <a
                      href={`https://www.youtube.com/watch?v=${getYouTubeId(spaceformData.youtubeUrl) || spaceformData.youtubeUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="preview-link"
                      title="Preview Video"
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
                <small className="form-hint">Paste any YouTube video URL. We'll automatically get the thumbnail.</small>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={spaceformData.description}
                  onChange={e => setSpaceFormData({ ...spaceformData, description: e.target.value })}
                  placeholder="Short description of the vibe..."
                  rows={2}
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowSpaceForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary">
                  {spaceFormMode === 'add' ? 'Add Space' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .space-browser-overlay, .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          z-index: var(--z-modal);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-8);
          animation: fadeIn var(--transition-fast) ease-out;
        }

        .modal-overlay {
            z-index: calc(var(--z-modal) + 10);
        }
        
        .space-browser {
          width: 100%;
          max-width: 900px;
          max-height: 80vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .modal-content {
            width: 100%;
            max-width: 500px;
            padding: var(--space-6);
        }
        
        .browser-header, .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-6);
          border-bottom: 1px solid var(--glass-border);
        }

        .modal-header {
            padding: 0 0 var(--space-4) 0;
        }
        
        .browser-header h2, .modal-header h3 {
          font-size: var(--font-size-xl);
          font-weight: 600;
        }

        .header-actions {
            display: flex;
            align-items: center;
            gap: var(--space-4);
        }

        .header-action-btn {
            display: inline-flex;
            align-items: center;
            gap: var(--space-2);
        }
        
        .close-btn {
          width: 36px;
          height: 36px;
        }
        
        .browser-content {
          flex: 1;
          overflow-y: auto;
          padding: var(--space-6);
        }
        
        .category-section {
          margin-bottom: var(--space-8);
        }
        
        .category-section:last-child {
            margin-bottom: 0;
        }

        .category-header {
            display: flex;
            align-items: center;
            margin-bottom: var(--space-4);
            min-height: 28px;
        }
        
        .category-title {
          font-size: var(--font-size-sm);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted);
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }

        .category-title.editable {
            cursor: pointer;
            padding: 4px 8px;
            border-radius: var(--radius-sm);
            margin-left: -8px;
        }

        .category-title.editable:hover {
            background: var(--color-surface-hover);
            color: var(--color-text);
        }

        .category-rename {
            display: flex;
            align-items: center;
            gap: var(--space-2);
        }

        .category-rename input {
            background: var(--color-surface);
            border: 1px solid var(--color-accent);
            border-radius: var(--radius-sm);
            padding: 4px 8px;
            font-size: var(--font-size-sm);
            color: var(--color-text);
        }
        
        .spaces-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: var(--space-4);
        }
        
        .space-card, .add-space-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          overflow: hidden;
          text-align: left;
          transition: all var(--transition-fast);
          position: relative;
        }
        
        .space-card:hover {
          background: var(--color-surface-hover);
          border-color: var(--color-border-hover);
          transform: translateY(-2px);
        }
        
        .space-card.active {
          border-color: var(--color-accent);
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
        }

        .add-space-card {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 200px;
            cursor: pointer;
            border-style: dashed;
            color: var(--color-text-muted);
            gap: var(--space-3);
        }

        .add-space-card:hover {
            border-color: var(--color-accent);
            color: var(--color-accent);
            background: rgba(99, 102, 241, 0.05);
        }

        .add-icon {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: var(--color-surface-hover);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all var(--transition-fast);
        }

        .add-space-card:hover .add-icon {
            background: var(--color-accent);
            color: white;
        }
        
        .space-thumbnail {
          position: relative;
          aspect-ratio: 16 / 9;
          overflow: hidden;
        }
        
        .space-thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform var(--transition-slow);
        }
        
        .space-card:hover .space-thumbnail img {
          transform: scale(1.05);
        }
        
        .now-playing {
          position: absolute;
          top: var(--space-2);
          left: var(--space-2);
          background: var(--color-accent);
          color: white;
          font-size: var(--font-size-xs);
          font-weight: 600;
          padding: var(--space-1) var(--space-2);
          border-radius: var(--radius-sm);
        }

        .card-actions {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: var(--space-3);
            opacity: 0;
            transition: opacity var(--transition-fast);
        }

        .space-card:hover .card-actions {
            opacity: 1;
        }

        .action-btn {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: white;
            color: #333;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform var(--transition-fast);
        }

        .action-btn:hover {
            transform: scale(1.1);
        }

        .action-btn.delete {
            background: #ef4444;
            color: white;
        }
        
        .space-info {
          padding: var(--space-4);
        }
        
        .space-info h4 {
          font-size: var(--font-size-base);
          font-weight: 600;
          margin-bottom: var(--space-1);
        }
        
        .space-info p {
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
          line-height: 1.4;
        }

        .btn-secondary, .btn-primary {
            display: flex;
            align-items: center;
            gap: var(--space-2);
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
            color: var(--color-text);
        }

        .btn-secondary:hover {
            background: var(--color-surface-hover);
        }

        .btn-secondary.active {
            background: var(--color-accent);
            border-color: var(--color-accent);
            color: white;
        }
        
        .edit-mode-btn {
            padding: var(--space-2) var(--space-3);
        }

        .btn-primary {
            background: var(--color-accent);
            color: white;
            border: none;
        }

        .btn-primary:hover {
            background: var(--color-accent-hover);
        }

        .form-group {
            margin-bottom: var(--space-4);
        }

        .form-group label {
            display: block;
            margin-bottom: var(--space-2);
            font-size: var(--font-size-sm);
            font-weight: 500;
        }

        .form-group input, .form-group textarea {
            width: 100%;
            padding: var(--space-3);
            background: var(--color-surface-hover);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-md);
            color: var(--color-text);
            font-size: var(--font-size-sm);
        }

        .form-group input:focus, .form-group textarea:focus {
            outline: none;
            border-color: var(--color-accent);
        }

        .form-hint {
            display: block;
            margin-top: var(--space-1);
            font-size: var(--font-size-xs);
            color: var(--color-text-muted);
        }

        .input-with-icon {
            position: relative;
        }

        .preview-link {
            position: absolute;
            right: var(--space-3);
            top: 50%;
            transform: translateY(-50%);
            color: var(--color-text-muted);
        }

        .preview-link:hover {
            color: var(--color-accent);
        }

        .form-actions {
            display: flex;
            justify-content: flex-end;
            gap: var(--space-3);
            margin-top: var(--space-6);
        }

        .add-category-section {
            margin-top: var(--space-8);
            display: flex;
            justify-content: center;
        }

        .modal-body {
          margin-bottom: var(--space-6);
          color: var(--color-text-secondary);
          line-height: 1.5;
        }

        .modal-body strong {
            color: var(--color-text);
        }
      `}</style>
    </div>
  );
}
