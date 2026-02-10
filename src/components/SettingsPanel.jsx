import { useState, useEffect, useRef } from 'react';
import {
  X,
  Keyboard,
  RotateCcw,
  Timer,
  Volume2,
  CheckSquare,
  StickyNote,
  Calendar,
  Link,
  Unlink,
  Loader2,
  ChevronDown,
  Music,
  HardDrive,
  Upload,
  Download,
  Save,
  Copy,
  Trash2,
  LayoutGrid,
} from 'lucide-react';
import { validateToken, getProjects, FILTER_OPTIONS } from '../services/todoistApi';
import { googleDriveAdapter } from '../services/googleDrive';
import { storage, LocalStorageAdapter } from '../services/storage';
import { localFileAdapter } from '../services/localFile';
import { APP_STORAGE_KEYS, LEGACY_KEY_MIGRATIONS } from '../services/appKeys';

// Available widgets configuration
const WIDGET_CONFIG = [
  { id: 'pomodoro', label: 'Focus Timer', icon: Timer, shortcut: '1' },
  { id: 'sounds', label: 'Ambient Sounds', icon: Volume2, shortcut: '2' },
  { id: 'todos', label: 'Tasks', icon: CheckSquare, shortcut: '3' },
  { id: 'notes', label: 'Notes', icon: StickyNote, shortcut: '4' },
  { id: 'planner', label: 'Daily Planner', icon: Calendar, shortcut: '5' },
  { id: 'music', label: 'Music Player', icon: Music, shortcut: '6' },
  { id: 'focusprep', label: 'Focus Prep', icon: Timer, shortcut: '7' },
];

export default function SettingsPanel({
  settings,
  enabledWidgets,
  todoistConfig,
  onUpdateSettings,
  onUpdateTodoistConfig,
  onToggleWidgetEnabled,
  onClose,
  onResetPositions,
  storageType,
  onStorageModeChange,
  onRequestDataSnapshot,
  layouts,
  activeLayoutId,
  layoutPresets,
  onActivateLayout,
  onSaveCurrentLayout,
  onSaveLayoutAs,
  onRenameLayout,
  onDeleteLayout,
  onApplyLayoutPreset,
}) {
  const [tokenInput, setTokenInput] = useState(todoistConfig?.token || '');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [layoutInfo, setLayoutInfo] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState(layoutPresets?.[1]?.id || layoutPresets?.[0]?.id || 'balanced');

  const [projects, setProjects] = useState([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLocalFileBusy, setIsLocalFileBusy] = useState(false);
  const [localFileError, setLocalFileError] = useState('');
  const [localFileInfo, setLocalFileInfo] = useState('');
  const [pendingFileSync, setPendingFileSync] = useState(null);
  const importFileRef = useRef(null);
  const [localFileStatus, setLocalFileStatus] = useState({
    supported: false,
    connected: false,
    hasStoredHandle: false,
    fileName: null,
  });

  const activeLayout = layouts.find((layout) => layout.id === activeLayoutId) || layouts[0] || null;

  const handleConnect = async () => {
    if (!tokenInput.trim()) return;

    setIsConnecting(true);
    setConnectionError('');

    const result = await validateToken(tokenInput.trim());

    if (result.valid) {
      onUpdateTodoistConfig({ token: tokenInput.trim(), isConnected: true, selectedFilter: 'today' });
    } else {
      setConnectionError('Invalid API token. Please check and try again.');
    }

    setIsConnecting(false);
  };

  const handleDisconnect = () => {
    onUpdateTodoistConfig({ token: '', isConnected: false, selectedFilter: 'today' });
    setTokenInput('');
    setConnectionError('');
    setProjects([]);
  };

  useEffect(() => {
    if (todoistConfig?.isConnected && todoistConfig?.token) {
      setIsLoadingProjects(true);
      getProjects(todoistConfig.token)
        .then(setProjects)
        .catch(console.error)
        .finally(() => setIsLoadingProjects(false));
    }
  }, [todoistConfig?.isConnected, todoistConfig?.token]);

  useEffect(() => {
    const refreshLocalFileStatus = async () => {
      try {
        const status = await localFileAdapter.getStatus();
        setLocalFileStatus(status);
      } catch (err) {
        console.error('Failed to check local file status:', err);
      }
    };

    refreshLocalFileStatus();
  }, []);

  const shortcuts = [
    { keys: ['Space'], action: 'Play/Pause Timer' },
    { keys: ['R'], action: 'Reset Timer' },
    { keys: ['1-7'], action: 'Toggle Widgets' },
    { keys: ['S'], action: 'Open Spaces' },
    { keys: ['F'], action: 'Toggle Fullscreen' },
    { keys: ['Esc'], action: 'Close Modals' },
  ];

  const getCurrentDataSnapshot = async () => {
    if (onRequestDataSnapshot) {
      return onRequestDataSnapshot();
    }
    return storage.getAll(APP_STORAGE_KEYS);
  };

  const refreshLocalFileStatus = async () => {
    const status = await localFileAdapter.getStatus().catch(() => null);
    if (status) setLocalFileStatus(status);
  };

  const connectLocalFile = async (opts = {}) => {
    const relink = Boolean(opts.relink);
    setIsLocalFileBusy(true);
    setLocalFileError('');
    setLocalFileInfo('');

    try {
      const currentData = await getCurrentDataSnapshot();
      const result = relink ? await localFileAdapter.relink() : await localFileAdapter.connect();

      if (result.isEmpty) {
        await localFileAdapter.replaceAllData(currentData || {}, { save: true });
        storage.setAdapter(localFileAdapter);
        if (onStorageModeChange) {
          await onStorageModeChange('localfile');
        }
        setLocalFileInfo(`Connected and initialized ${result.fileName}.`);
        return;
      }

      setPendingFileSync({
        fileName: result.fileName,
        fileData: result.data || {},
        currentData: currentData || {},
      });
    } catch (err) {
      if (err?.name === 'AbortError') {
        return;
      }
      const msg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      setLocalFileError(msg);
    } finally {
      setIsLocalFileBusy(false);
      await refreshLocalFileStatus();
    }
  };

  const applyLocalFileStrategy = async (strategy) => {
    if (!pendingFileSync) return;

    setIsLocalFileBusy(true);
    setLocalFileError('');
    setLocalFileInfo('');

    try {
      let resolvedData;
      if (strategy === 'use_file') {
        resolvedData = pendingFileSync.fileData;
      } else if (strategy === 'merge') {
        resolvedData = {
          ...pendingFileSync.currentData,
          ...pendingFileSync.fileData,
        };
      } else {
        resolvedData = pendingFileSync.currentData;
      }

      await localFileAdapter.replaceAllData(resolvedData || {}, { save: true });
      storage.setAdapter(localFileAdapter);

      if (onStorageModeChange) {
        await onStorageModeChange('localfile');
      }

      setLocalFileInfo(`Connected to ${pendingFileSync.fileName}.`);
      setPendingFileSync(null);
    } catch (err) {
      const msg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      setLocalFileError(msg);
    } finally {
      setIsLocalFileBusy(false);
      await refreshLocalFileStatus();
    }
  };

  const disconnectLocalFile = async () => {
    setIsLocalFileBusy(true);
    setLocalFileError('');
    setLocalFileInfo('');

    try {
      await localFileAdapter.disconnect();
      storage.setAdapter(new LocalStorageAdapter());
      if (onStorageModeChange) {
        await onStorageModeChange('local');
      }
      setPendingFileSync(null);
      setLocalFileInfo('Switched to browser storage.');
    } catch (err) {
      const msg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      setLocalFileError(msg);
    } finally {
      setIsLocalFileBusy(false);
      await refreshLocalFileStatus();
    }
  };

  const exportBackup = async () => {
    setIsLocalFileBusy(true);
    setLocalFileError('');
    setLocalFileInfo('');

    try {
      const data = await storage.getAll(APP_STORAGE_KEYS);

      const payload = {
        version: 2,
        exportedAt: new Date().toISOString(),
        data,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `focusnook-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setLocalFileInfo('Backup exported.');
    } catch (err) {
      const msg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      setLocalFileError(msg);
    } finally {
      setIsLocalFileBusy(false);
    }
  };

  const importBackupFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsLocalFileBusy(true);
    setLocalFileError('');
    setLocalFileInfo('');

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const importedData = parsed?.data && typeof parsed.data === 'object' ? parsed.data : parsed;

      if (!importedData || typeof importedData !== 'object') {
        throw new Error('Backup file format is invalid.');
      }

      const normalizedData = { ...importedData };
      Object.entries(LEGACY_KEY_MIGRATIONS).forEach(([legacyKey, nextKey]) => {
        if ((normalizedData[nextKey] === null || normalizedData[nextKey] === undefined)
          && normalizedData[legacyKey] !== undefined) {
          normalizedData[nextKey] = normalizedData[legacyKey];
        }
      });

      for (const key of APP_STORAGE_KEYS) {
        if (normalizedData[key] !== undefined) {
          await storage.set(key, normalizedData[key]);
        }
      }

      setLocalFileInfo('Backup imported. Reloading...');
      window.location.reload();
    } catch (err) {
      const msg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      setLocalFileError(msg);
    } finally {
      setIsLocalFileBusy(false);
    }
  };

  const runLayoutAction = async (callback) => {
    try {
      await callback();
      setLayoutInfo('Layout updated.');
      setTimeout(() => setLayoutInfo(''), 1800);
    } catch (error) {
      const msg = error?.message || 'Layout update failed.';
      setLayoutInfo(msg);
      setTimeout(() => setLayoutInfo(''), 2600);
    }
  };

  const handleSaveAs = () => {
    const nextName = window.prompt('Name for the new layout', `${activeLayout?.name || 'Layout'} Copy`);
    if (!nextName || !nextName.trim()) return;
    onSaveLayoutAs(nextName.trim());
    setLayoutInfo('New layout created.');
    setTimeout(() => setLayoutInfo(''), 1800);
  };

  const handleRenameLayout = () => {
    if (!activeLayout) return;
    const nextName = window.prompt('Rename active layout', activeLayout.name);
    if (!nextName || !nextName.trim()) return;
    onRenameLayout(activeLayout.id, nextName.trim());
    setLayoutInfo('Layout renamed.');
    setTimeout(() => setLayoutInfo(''), 1800);
  };

  const handleDeleteLayout = () => {
    if (!activeLayout || layouts.length <= 1) return;
    const ok = window.confirm(`Delete layout "${activeLayout.name}"?`);
    if (!ok) return;
    onDeleteLayout(activeLayout.id);
    setLayoutInfo('Layout deleted.');
    setTimeout(() => setLayoutInfo(''), 1800);
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel glass-panel animate-scaleIn" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="icon-btn close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="settings-content">
          <section className="settings-section">
            <h3>Widgets</h3>
            <p className="section-description">Enable widgets to add them to the dock</p>
            <div className="widget-toggles">
              {WIDGET_CONFIG.map((widget) => {
                const Icon = widget.icon;
                const isEnabled = enabledWidgets[widget.id];
                return (
                  <label
                    key={widget.id}
                    className={`widget-toggle ${isEnabled ? 'active' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => onToggleWidgetEnabled(widget.id)}
                    />
                    <Icon size={20} />
                    <span className="widget-label">{widget.label}</span>
                    <kbd>{widget.shortcut}</kbd>
                  </label>
                );
              })}
            </div>
          </section>

          <section className="settings-section">
            <h3>Appearance</h3>

            <div className="setting-item">
              <label>Widget Opacity</label>
              <input
                type="range"
                min="0.5"
                max="1"
                step="0.05"
                value={settings.widgetOpacity}
                onChange={(e) => onUpdateSettings({ widgetOpacity: parseFloat(e.target.value) })}
              />
              <span className="value">{Math.round(settings.widgetOpacity * 100)}%</span>
            </div>

            <div className="setting-item">
              <label>Show Clock</label>
              <button
                className={`toggle-btn ${settings.showClock ? 'active' : ''}`}
                onClick={() => onUpdateSettings({ showClock: !settings.showClock })}
              >
                {settings.showClock ? 'On' : 'Off'}
              </button>
            </div>

            <div className="setting-item">
              <label>12-Hour Format</label>
              <button
                className={`toggle-btn ${settings.use12Hour ? 'active' : ''}`}
                onClick={() => onUpdateSettings({ use12Hour: !settings.use12Hour })}
              >
                {settings.use12Hour ? 'On' : 'Off'}
              </button>
            </div>
          </section>

          <section className="settings-section">
            <h3>
              <Calendar size={18} />
              Daily Planner
            </h3>
            <p className="section-description">Set your work day start and end times</p>

            <div className="setting-item">
              <label>Work Day Start</label>
              <div className="select-wrapper time-select">
                <select
                  value={settings.plannerStartHour || 9}
                  onChange={(e) => {
                    const newStart = parseInt(e.target.value, 10);
                    const newEnd = settings.plannerEndHour <= newStart ? newStart + 1 : settings.plannerEndHour;
                    onUpdateSettings({ plannerStartHour: newStart, plannerEndHour: newEnd });
                  }}
                >
                  {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                    <option key={hour} value={hour}>
                      {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="select-arrow" />
              </div>
            </div>

            <div className="setting-item">
              <label>Work Day End</label>
              <div className="select-wrapper time-select">
                <select
                  value={settings.plannerEndHour || 17}
                  onChange={(e) => {
                    const newEnd = parseInt(e.target.value, 10);
                    onUpdateSettings({ plannerEndHour: newEnd });
                  }}
                >
                  {Array.from({ length: 24 - (settings.plannerStartHour || 9) }, (_, i) => (settings.plannerStartHour || 9) + 1 + i)
                    .filter((hour) => hour <= 24)
                    .map((hour) => (
                      <option key={hour} value={hour}>
                        {hour === 24 ? '12 AM (midnight)' : hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                      </option>
                    ))}
                </select>
                <ChevronDown size={14} className="select-arrow" />
              </div>
            </div>
          </section>

          <section className="settings-section">
            <h3>
              <LayoutGrid size={18} />
              Layouts
            </h3>
            <p className="section-description">Global widget layouts (shared across all spaces)</p>

            <div className="setting-item layout-row">
              <label>Active Layout</label>
              <div className="select-wrapper">
                <select
                  value={activeLayoutId || ''}
                  onChange={(e) => onActivateLayout(e.target.value)}
                >
                  {layouts.map((layout) => (
                    <option key={layout.id} value={layout.id}>{layout.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="select-arrow" />
              </div>
            </div>

            <div className="layout-actions">
              <button className="reset-btn" onClick={() => runLayoutAction(onSaveCurrentLayout)}>
                <Save size={16} />
                Save Current
              </button>
              <button className="reset-btn" onClick={handleSaveAs}>
                <Copy size={16} />
                Save As
              </button>
              <button className="reset-btn" onClick={handleRenameLayout} disabled={!activeLayout}>
                <Calendar size={16} />
                Rename
              </button>
              <button className="reset-btn" onClick={handleDeleteLayout} disabled={!activeLayout || layouts.length <= 1}>
                <Trash2 size={16} />
                Delete
              </button>
            </div>

            <div className="setting-item layout-row">
              <label>Preset</label>
              <div className="select-wrapper">
                <select
                  value={selectedPresetId}
                  onChange={(e) => setSelectedPresetId(e.target.value)}
                >
                  {(layoutPresets || []).map((preset) => (
                    <option key={preset.id} value={preset.id}>{preset.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="select-arrow" />
              </div>
            </div>

            <div className="layout-actions">
              <button className="reset-btn" onClick={() => onApplyLayoutPreset(selectedPresetId)}>
                <LayoutGrid size={16} />
                Apply Preset
              </button>
              <button className="reset-btn" onClick={onResetPositions}>
                <RotateCcw size={16} />
                Reset Layout
              </button>
            </div>

            {layoutInfo && <p className="connection-ok">{layoutInfo}</p>}
          </section>

          <section className="settings-section">
            <h3>
              <Link size={18} />
              Integrations
            </h3>

            <div className="integration-item">
              <div className="integration-header">
                <span className="integration-name">Local File</span>
                <span className={`connection-status ${storageType === 'localfile' ? 'connected' : ''}`}>
                  {!localFileStatus.supported
                    ? 'Unsupported'
                    : storageType === 'localfile'
                    ? 'Connected'
                    : localFileStatus.hasStoredHandle
                      ? 'Needs relink'
                      : 'Not connected'}
                </span>
              </div>

              {!localFileStatus.supported ? (
                <>
                  <p className="integration-description">
                    Automatic local-file linking is not available in this browser. Use JSON import/export backup mode.
                  </p>
                  <div className="integration-actions">
                    <button
                      className="connect-btn"
                      onClick={() => importFileRef.current?.click()}
                      disabled={isLocalFileBusy}
                    >
                      {isLocalFileBusy ? <Loader2 size={16} className="spinning" /> : <Upload size={16} />}
                      Import Backup
                    </button>
                    <button
                      className="disconnect-btn"
                      onClick={exportBackup}
                      disabled={isLocalFileBusy}
                    >
                      <Download size={16} />
                      Export Backup
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="integration-description">
                    {storageType === 'localfile'
                      ? `Your data is synced to ${localFileStatus.fileName || 'focusnook-data.json'} on this device.`
                      : localFileStatus.hasStoredHandle
                        ? 'A previously linked file was found. Relink to resume syncing.'
                        : 'Link a JSON file on this device for direct read/write sync without cloud OAuth.'}
                  </p>
                  <div className="integration-actions">
                    {storageType !== 'localfile' && (
                      <button
                        className="connect-btn"
                        onClick={() => connectLocalFile({ relink: localFileStatus.hasStoredHandle })}
                        disabled={isLocalFileBusy}
                      >
                        {isLocalFileBusy ? <Loader2 size={16} className="spinning" /> : <HardDrive size={16} />}
                        {localFileStatus.hasStoredHandle ? 'Relink File' : 'Connect File'}
                      </button>
                    )}

                    {storageType === 'localfile' && (
                      <>
                        <button
                          className="connect-btn"
                          onClick={() => connectLocalFile({ relink: true })}
                          disabled={isLocalFileBusy}
                        >
                          {isLocalFileBusy ? <Loader2 size={16} className="spinning" /> : <HardDrive size={16} />}
                          Relink File
                        </button>
                        <button
                          className="disconnect-btn"
                          onClick={disconnectLocalFile}
                          disabled={isLocalFileBusy}
                        >
                          <Unlink size={16} />
                          Disconnect
                        </button>
                      </>
                    )}
                  </div>
                  {localFileError && (
                    <p className="connection-error">{localFileError}</p>
                  )}
                </>
              )}
              {localFileInfo && (
                <p className="connection-ok">{localFileInfo}</p>
              )}
              <input
                ref={importFileRef}
                type="file"
                accept="application/json,.json"
                style={{ display: 'none' }}
                onChange={importBackupFile}
              />
            </div>

            <div className="integration-item">
              <div className="integration-header">
                <span className="integration-name">Google Drive</span>
                <span className={`connection-status ${storageType === 'gdrive' ? 'connected' : ''}`}>
                  {storageType === 'gdrive' ? 'Connected' : 'Not connected'}
                </span>
              </div>

              {storageType !== 'gdrive' ? (
                <>
                  <p className="integration-description">
                    Connect Google Drive to sync your settings and data across devices.
                  </p>
                  <button
                    className="connect-btn"
                    onClick={async () => {
                      try {
                        await googleDriveAdapter.connect();
                      } catch (err) {
                        console.error('Failed to connect Drive:', err);
                        const msg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
                        alert(`Failed to connect to Google Drive: ${msg}`);
                      }
                    }}
                  >
                    <Link size={16} />
                    Connect Drive
                  </button>
                </>
              ) : (
                <>
                  <p className="integration-description">
                    Your data is being saved to 'FocusNook/focusnook-data.json' in your Google Drive.
                  </p>
                  <button
                    className="disconnect-btn"
                    onClick={() => {
                      googleDriveAdapter.disconnect().finally(() => {
                        storage.setAdapter(new LocalStorageAdapter());
                        window.location.reload();
                      });
                    }}
                  >
                    <Unlink size={16} />
                    Disconnect
                  </button>
                </>
              )}
            </div>

            <div className="integration-item">
              <div className="integration-header">
                <span className="integration-name">Todoist</span>
                <span className={`connection-status ${todoistConfig?.isConnected ? 'connected' : ''}`}>
                  {todoistConfig?.isConnected ? 'Connected' : 'Not connected'}
                </span>
              </div>

              {!todoistConfig?.isConnected ? (
                <>
                  <p className="integration-description">
                    Connect to sync your tasks with Todoist.
                    <a href="https://todoist.com/help/articles/find-your-api-token-Jpzx9IIlB" target="_blank" rel="noopener noreferrer"> Get your API token →</a>
                  </p>
                  <div className="token-input-group">
                    <input
                      type="password"
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      placeholder="Paste your Todoist API token"
                      className="token-input"
                    />
                    <button
                      className="connect-btn"
                      onClick={handleConnect}
                      disabled={isConnecting || !tokenInput.trim()}
                    >
                      {isConnecting ? <Loader2 size={16} className="spinning" /> : <Link size={16} />}
                      {isConnecting ? 'Connecting...' : 'Connect'}
                    </button>
                  </div>
                  {connectionError && (
                    <p className="connection-error">{connectionError}</p>
                  )}
                </>
              ) : (
                <>
                  <div className="filter-selector">
                    <label>Show tasks from:</label>
                    <div className="select-wrapper">
                      <select
                        value={todoistConfig?.selectedFilter || 'today'}
                        onChange={(e) => onUpdateTodoistConfig({ selectedFilter: e.target.value })}
                        disabled={isLoadingProjects}
                      >
                        <optgroup label="Filters">
                          {FILTER_OPTIONS.map((opt) => (
                            <option key={opt.id} value={opt.id}>{opt.name}</option>
                          ))}
                        </optgroup>
                        {projects.length > 0 && (
                          <optgroup label="Projects">
                            {projects.map((project) => (
                              <option key={project.id} value={project.id}>{project.name}</option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                      <ChevronDown size={14} className="select-arrow" />
                    </div>
                  </div>
                  <button className="disconnect-btn" onClick={handleDisconnect}>
                    <Unlink size={16} />
                    Disconnect
                  </button>
                </>
              )}
            </div>
          </section>

          <section className="settings-section">
            <h3>
              <Keyboard size={18} />
              Keyboard Shortcuts
            </h3>
            <div className="shortcuts-list">
              {shortcuts.map((shortcut, index) => (
                <div key={index} className="shortcut-item">
                  <div className="shortcut-keys">
                    {shortcut.keys.map((key, keyIndex) => (
                      <kbd key={keyIndex}>{key}</kbd>
                    ))}
                  </div>
                  <span className="shortcut-action">{shortcut.action}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {pendingFileSync && (
          <div className="decision-overlay">
            <div className="decision-modal glass-panel" onClick={(e) => e.stopPropagation()}>
              <h3>Local File Data Found</h3>
              <p>
                <strong>{pendingFileSync.fileName}</strong> already contains data.
                Choose how to continue.
              </p>
              <div className="decision-actions">
                <button className="connect-btn" onClick={() => applyLocalFileStrategy('use_file')}>
                  Use File
                </button>
                <button className="connect-btn" onClick={() => applyLocalFileStrategy('merge')}>
                  Merge (File Wins)
                </button>
                <button className="disconnect-btn" onClick={() => applyLocalFileStrategy('keep_current')}>
                  Keep Current
                </button>
              </div>
              <button
                className="decision-cancel"
                onClick={() => setPendingFileSync(null)}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <style>{`
          .settings-overlay {
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

          .settings-panel {
            width: 100%;
            max-width: 560px;
            max-height: 85vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            position: relative;
          }

          .settings-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: var(--space-6);
            border-bottom: 1px solid var(--glass-border);
          }

          .settings-header h2 {
            font-size: var(--font-size-xl);
            font-weight: 600;
          }

          .close-btn {
            width: 36px;
            height: 36px;
          }

          .settings-content {
            flex: 1;
            overflow-y: auto;
            padding: var(--space-6);
          }

          .settings-section {
            margin-bottom: var(--space-8);
          }

          .settings-section:last-child {
            margin-bottom: 0;
          }

          .settings-section h3 {
            display: flex;
            align-items: center;
            gap: var(--space-2);
            font-size: var(--font-size-sm);
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--color-text-muted);
            margin-bottom: var(--space-4);
          }

          .section-description {
            font-size: var(--font-size-xs);
            color: var(--color-text-muted);
            margin-bottom: var(--space-3);
            margin-top: calc(-1 * var(--space-2));
          }

          .widget-toggles {
            display: flex;
            flex-direction: column;
            gap: var(--space-2);
          }

          .widget-toggle {
            display: flex;
            align-items: center;
            gap: var(--space-3);
            padding: var(--space-3) var(--space-4);
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-md);
            font-size: var(--font-size-sm);
            color: var(--color-text-secondary);
            transition: all var(--transition-fast);
            cursor: pointer;
          }

          .widget-toggle:hover {
            background: var(--color-surface-hover);
          }

          .widget-toggle.active {
            background: rgba(99, 102, 241, 0.15);
            border-color: var(--color-accent);
            color: var(--color-text);
          }

          .widget-toggle .widget-label {
            flex: 1;
            text-align: left;
          }

          .widget-toggle input[type='checkbox'] {
            width: 18px;
            height: 18px;
            accent-color: var(--color-accent);
            cursor: pointer;
          }

          .setting-item {
            display: flex;
            align-items: center;
            gap: var(--space-4);
            padding: var(--space-3) 0;
          }

          .setting-item label {
            flex: 1;
            font-size: var(--font-size-sm);
          }

          .setting-item input[type='range'] {
            width: 120px;
          }

          .setting-item .value {
            width: 40px;
            text-align: right;
            font-size: var(--font-size-sm);
            color: var(--color-text-secondary);
          }

          .toggle-btn {
            padding: var(--space-2) var(--space-4);
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-md);
            font-size: var(--font-size-sm);
            font-weight: 500;
            color: var(--color-text-secondary);
            transition: all var(--transition-fast);
          }

          .toggle-btn.active {
            background: var(--color-accent);
            border-color: var(--color-accent);
            color: white;
          }

          .layout-row {
            align-items: flex-start;
          }

          .layout-actions {
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-2);
            margin-bottom: var(--space-3);
          }

          .reset-btn {
            display: inline-flex;
            align-items: center;
            gap: var(--space-2);
            padding: var(--space-3) var(--space-4);
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-md);
            font-size: var(--font-size-sm);
            color: var(--color-text-secondary);
            transition: all var(--transition-fast);
          }

          .reset-btn:hover:not(:disabled) {
            background: var(--color-surface-hover);
            color: var(--color-text-primary);
          }

          .reset-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .shortcuts-list {
            display: flex;
            flex-direction: column;
            gap: var(--space-2);
          }

          .shortcut-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: var(--space-2) 0;
          }

          .shortcut-keys {
            display: flex;
            gap: var(--space-1);
          }

          kbd {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 28px;
            height: 24px;
            padding: 0 var(--space-2);
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-sm);
            font-size: var(--font-size-xs);
            font-family: inherit;
            font-weight: 500;
          }

          .shortcut-action {
            font-size: var(--font-size-sm);
            color: var(--color-text-secondary);
          }

          .integration-item {
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-md);
            padding: var(--space-4);
            margin-bottom: var(--space-3);
          }

          .integration-item:last-child {
            margin-bottom: 0;
          }

          .integration-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: var(--space-3);
          }

          .integration-name {
            font-weight: 600;
            font-size: var(--font-size-sm);
          }

          .connection-status {
            font-size: var(--font-size-xs);
            padding: var(--space-1) var(--space-2);
            border-radius: var(--radius-full);
            background: var(--color-surface-hover);
            color: var(--color-text-muted);
          }

          .connection-status.connected {
            background: rgba(34, 197, 94, 0.2);
            color: #22c55e;
          }

          .integration-description {
            font-size: var(--font-size-xs);
            color: var(--color-text-muted);
            margin-bottom: var(--space-3);
          }

          .integration-description a {
            color: var(--color-accent);
            text-decoration: none;
          }

          .integration-description a:hover {
            text-decoration: underline;
          }

          .token-input-group {
            display: flex;
            gap: var(--space-2);
          }

          .integration-actions {
            display: flex;
            gap: var(--space-2);
            flex-wrap: wrap;
          }

          .token-input {
            flex: 1;
            padding: var(--space-2) var(--space-3);
            font-size: var(--font-size-sm);
          }

          .connect-btn,
          .disconnect-btn {
            display: inline-flex;
            align-items: center;
            gap: var(--space-2);
            padding: var(--space-2) var(--space-3);
            border-radius: var(--radius-md);
            font-size: var(--font-size-sm);
            font-weight: 500;
            transition: all var(--transition-fast);
            white-space: nowrap;
          }

          .connect-btn {
            background: var(--color-accent);
            color: white;
            border: none;
          }

          .connect-btn:hover:not(:disabled) {
            background: var(--color-accent-hover);
          }

          .connect-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .disconnect-btn {
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            color: var(--color-text-secondary);
          }

          .disconnect-btn:hover {
            background: rgba(239, 68, 68, 0.1);
            border-color: #ef4444;
            color: #ef4444;
          }

          .connection-error {
            margin-top: var(--space-2);
            color: #f87171;
            font-size: var(--font-size-xs);
          }

          .connection-ok {
            margin-top: var(--space-2);
            color: #4ade80;
            font-size: var(--font-size-xs);
          }

          .select-wrapper {
            position: relative;
            min-width: 180px;
            flex: 1;
          }

          .select-wrapper select {
            width: 100%;
            appearance: none;
            border-radius: var(--radius-md);
            border: 1px solid var(--color-border);
            background: var(--color-surface);
            color: var(--color-text);
            padding: var(--space-2) var(--space-8) var(--space-2) var(--space-3);
          }

          .time-select {
            max-width: 200px;
          }

          .select-arrow {
            position: absolute;
            right: var(--space-2);
            top: 50%;
            transform: translateY(-50%);
            pointer-events: none;
            color: var(--color-text-muted);
          }

          .spinning {
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          .decision-overlay {
            position: absolute;
            inset: 0;
            background: rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: var(--space-6);
            z-index: 20;
          }

          .decision-modal {
            width: 100%;
            max-width: 380px;
            padding: var(--space-5);
            display: flex;
            flex-direction: column;
            gap: var(--space-3);
          }

          .decision-modal h3 {
            font-size: var(--font-size-lg);
            font-weight: 600;
          }

          .decision-modal p {
            font-size: var(--font-size-sm);
            color: var(--color-text-secondary);
          }

          .decision-actions {
            display: flex;
            flex-direction: column;
            gap: var(--space-2);
          }

          .decision-cancel {
            margin-top: var(--space-1);
            color: var(--color-text-muted);
            text-decoration: underline;
            font-size: var(--font-size-sm);
            align-self: flex-start;
          }
        `}</style>
      </div>
    </div>
  );
}
