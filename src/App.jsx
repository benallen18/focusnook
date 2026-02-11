import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import VideoBackground from './components/VideoBackground';
import Pomodoro from './components/Pomodoro';
import AmbientSounds from './components/AmbientSounds';
import TodoList from './components/TodoList';
import Notes from './components/Notes';
import DailyPlanner from './components/DailyPlanner';
import MusicPlayer from './components/MusicPlayer';
import FocusPrep from './components/FocusPrep';
import SpaceBrowser from './components/SpaceBrowser';
import NavigationDock from './components/NavigationDock';
import DraggableWidget from './components/DraggableWidget';
import SettingsPanel from './components/SettingsPanel';
import Clock from './components/Clock';
import { defaultSpaces, defaultMusicStreams } from './data/spaces';
import { Music, Loader } from 'lucide-react';
import YouTubePlayer from './components/YouTubePlayer';
import { storage, LocalStorageAdapter } from './services/storage';
import {
  googleDriveAdapter,
  loadGoogleScripts,
  DRIVE_AUTH_REQUIRED_EVENT,
} from './services/googleDrive';
import { localFileAdapter } from './services/localFile';
import { APP_STORAGE_KEYS, LEGACY_KEY_MIGRATIONS, WIDGET_IDS } from './services/appKeys';
import {
  createPresetLayout,
  normalizeLayoutForViewport,
  getDefaultWidgetVisibility,
  getDefaultWidgetSize,
  LAYOUT_PRESETS,
} from './services/layouts';

const DEFAULT_ENABLED_WIDGETS = {
  pomodoro: true,
  sounds: true,
  todos: true,
  notes: true,
  planner: true,
  music: true,
  focusprep: true,
};

const DEFAULT_SETTINGS = {
  widgetOpacity: 1,
  showClock: true,
  use12Hour: true,
  plannerStartHour: 9,
  plannerEndHour: 17,
  pomodoroMuted: false,
};

const DEFAULT_TODOIST_CONFIG = {
  token: '',
  isConnected: false,
  selectedFilter: 'today',
};

const DEFAULT_MUSIC_STATE = {
  selectedStream: defaultMusicStreams[0],
  isPlaying: false,
  volume: 50,
  isMuted: false,
  customStreams: [],
};

const shallowEqual = (a = {}, b = {}) => {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  return keysA.every((key) => a[key] === b[key]);
};

const getViewport = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
});

const parseLegacyValue = (rawValue) => {
  if (!rawValue) return null;
  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
};

const getLegacyWidgetGeometry = () => {
  const legacy = {};

  WIDGET_IDS.forEach((widgetId) => {
    const posRaw = localStorage.getItem(`chillspace-widget-pos-${widgetId}`);
    const sizeRaw = localStorage.getItem(`chillspace-widget-size-${widgetId}`);

    const position = parseLegacyValue(posRaw);
    const size = parseLegacyValue(sizeRaw);

    if (position || size) {
      legacy[widgetId] = {
        ...(position || {}),
        ...(size || {}),
      };
    }
  });

  return legacy;
};

const getLayoutVisibility = (layout) => {
  const visibility = getDefaultWidgetVisibility();
  if (!layout?.widgets) return visibility;

  WIDGET_IDS.forEach((widgetId) => {
    const widget = layout.widgets[widgetId];
    if (widget && typeof widget.visible === 'boolean') {
      visibility[widgetId] = widget.visible;
    }
  });

  return visibility;
};

const getWidgetFrame = (layout, widgetId) => {
  const fallbackSize = getDefaultWidgetSize(widgetId);
  const widget = layout?.widgets?.[widgetId];

  return {
    position: {
      x: Number(widget?.x) || 24,
      y: Number(widget?.y) || 80,
    },
    size: {
      width: Number(widget?.width) || fallbackSize.width,
      height: Number(widget?.height) || fallbackSize.height,
    },
  };
};

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [needsDriveAuth, setNeedsDriveAuth] = useState(false);
  const [storageType, setStorageType] = useState('local');
  const [requiresFilePermission, setRequiresFilePermission] = useState(false);

  const [customSpaces, setCustomSpaces] = useState([]);
  const [hiddenDefaultSpaceIds, setHiddenDefaultSpaceIds] = useState([]);

  const visibleDefaultSpaces = useMemo(
    () => defaultSpaces.filter((space) => !hiddenDefaultSpaceIds.includes(space.id)),
    [hiddenDefaultSpaceIds]
  );
  const allSpaces = useMemo(
    () => [...visibleDefaultSpaces, ...customSpaces],
    [visibleDefaultSpaces, customSpaces]
  );

  const [currentSpace, setCurrentSpace] = useState(defaultSpaces[0]);
  const [showSpaceBrowser, setShowSpaceBrowser] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [enabledWidgets, setEnabledWidgets] = useState(DEFAULT_ENABLED_WIDGETS);
  const [widgetVisibility, setWidgetVisibility] = useState(getDefaultWidgetVisibility());

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [todoistConfig, setTodoistConfig] = useState(DEFAULT_TODOIST_CONFIG);
  const [musicState, setMusicState] = useState(DEFAULT_MUSIC_STATE);

  const [layouts, setLayouts] = useState([]);
  const [activeLayoutId, setActiveLayoutId] = useState('');
  const hasHydratedRef = useRef(false);

  const activeLayout = useMemo(
    () => layouts.find((layout) => layout.id === activeLayoutId) || null,
    [layouts, activeLayoutId]
  );

  const [widgetZIndices, setWidgetZIndices] = useState({});
  const zIndexCounter = useRef(10);

  const bringWidgetToFront = useCallback((widgetId) => {
    zIndexCounter.current += 1;
    setWidgetZIndices((prev) => ({
      ...prev,
      [widgetId]: zIndexCounter.current,
    }));
  }, []);

  const migrateLegacyStorageData = useCallback(async () => {
    for (const [legacyKey, nextKey] of Object.entries(LEGACY_KEY_MIGRATIONS)) {
      const currentValue = await storage.get(nextKey);
      if (currentValue !== null && currentValue !== undefined) {
        continue;
      }

      const legacyValue = await storage.get(legacyKey);
      if (legacyValue !== null && legacyValue !== undefined) {
        await storage.set(nextKey, legacyValue);
      }
    }

    const legacyFocusPrepRaw = localStorage.getItem('chillspace-focus-prep');
    if (legacyFocusPrepRaw) {
      const currentValue = await storage.get('focusnook-focus-prep');
      if (currentValue === null || currentValue === undefined) {
        const parsed = parseLegacyValue(legacyFocusPrepRaw);
        if (Array.isArray(parsed)) {
          await storage.set('focusnook-focus-prep', parsed);
        }
      }
    }
  }, []);

  const buildInitialLayoutState = useCallback((savedLayouts, savedActiveLayoutId, savedWidgetVisibility) => {
    const viewport = getViewport();

    if (Array.isArray(savedLayouts) && savedLayouts.length > 0) {
      const normalizedLayouts = savedLayouts.map((layout) => normalizeLayoutForViewport(layout, viewport));
      const activeId = normalizedLayouts.some((layout) => layout.id === savedActiveLayoutId)
        ? savedActiveLayoutId
        : normalizedLayouts[0].id;

      return { layouts: normalizedLayouts, activeLayoutId: activeId };
    }

    const defaultLayout = createPresetLayout('balanced', {
      id: 'layout-balanced-default',
      name: 'Balanced',
      viewport,
    });

    if (savedWidgetVisibility && typeof savedWidgetVisibility === 'object') {
      WIDGET_IDS.forEach((widgetId) => {
        if (typeof savedWidgetVisibility[widgetId] === 'boolean') {
          defaultLayout.widgets[widgetId].visible = savedWidgetVisibility[widgetId];
        }
      });
    }

    const legacyGeometry = getLegacyWidgetGeometry();
    WIDGET_IDS.forEach((widgetId) => {
      const legacyWidget = legacyGeometry[widgetId];
      if (!legacyWidget) return;

      defaultLayout.widgets[widgetId] = {
        ...defaultLayout.widgets[widgetId],
        x: Number(legacyWidget.x) || defaultLayout.widgets[widgetId].x,
        y: Number(legacyWidget.y) || defaultLayout.widgets[widgetId].y,
        width: Number(legacyWidget.width) || defaultLayout.widgets[widgetId].width,
        height: Number(legacyWidget.height) || defaultLayout.widgets[widgetId].height,
      };
    });

    return {
      layouts: [normalizeLayoutForViewport(defaultLayout, viewport)],
      activeLayoutId: defaultLayout.id,
    };
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);

    try {
      loadGoogleScripts().catch(console.error);
      await migrateLegacyStorageData();

      const data = await storage.getAll(APP_STORAGE_KEYS);

      const savedCustomSpaces = Array.isArray(data['focusnook-custom-spaces']) ? data['focusnook-custom-spaces'] : [];
      const savedHiddenDefaultSpaceIds = Array.isArray(data['focusnook-hidden-default-space-ids'])
        ? data['focusnook-hidden-default-space-ids']
        : [];
      const savedEnabledWidgets = data['focusnook-enabled-widgets'];
      const savedWidgetVisibility = data['focusnook-widget-visibility'];
      const savedSettings = data['focusnook-settings'];
      const savedTodoist = data['focusnook-todoist'];
      const savedMusic = data['focusnook-music'];
      const savedCustomStreams = Array.isArray(data['focusnook-custom-streams'])
        ? data['focusnook-custom-streams']
        : [];
      const savedLayouts = data['focusnook-layouts'];
      const savedActiveLayoutId = data['focusnook-active-layout'];

      const { layouts: nextLayouts, activeLayoutId: nextActiveLayoutId } = buildInitialLayoutState(
        savedLayouts,
        savedActiveLayoutId,
        savedWidgetVisibility
      );

      const nextActiveLayout = nextLayouts.find((layout) => layout.id === nextActiveLayoutId) || nextLayouts[0];

      setLayouts(nextLayouts);
      setActiveLayoutId(nextActiveLayoutId);
      setWidgetVisibility(getLayoutVisibility(nextActiveLayout));

      setCustomSpaces(savedCustomSpaces);
      setHiddenDefaultSpaceIds(savedHiddenDefaultSpaceIds);

      if (savedEnabledWidgets && typeof savedEnabledWidgets === 'object') {
        setEnabledWidgets((prev) => ({ ...prev, ...savedEnabledWidgets }));
      }

      if (savedSettings && typeof savedSettings === 'object') {
        setSettings((prev) => ({ ...prev, ...savedSettings }));
      } else {
        setSettings(DEFAULT_SETTINGS);
      }

      if (savedTodoist && typeof savedTodoist === 'object') {
        setTodoistConfig((prev) => ({ ...prev, ...savedTodoist }));
      }

      const allStreams = [...defaultMusicStreams, ...savedCustomStreams];
      if (savedMusic && typeof savedMusic === 'object') {
        setMusicState((prev) => ({
          ...prev,
          ...savedMusic,
          customStreams: savedCustomStreams,
          selectedStream: savedMusic.selectedStream || allStreams[0],
        }));
      } else {
        setMusicState((prev) => ({
          ...prev,
          customStreams: savedCustomStreams,
          selectedStream: allStreams[0],
        }));
      }

      const loadedDefaultSpaces = defaultSpaces.filter((space) => !savedHiddenDefaultSpaceIds.includes(space.id));
      const loadedAllSpaces = [...loadedDefaultSpaces, ...savedCustomSpaces];
      const savedSpaceId = data['focusnook-current-space'];
      const nextCurrentSpace = loadedAllSpaces.find((space) => space.id === savedSpaceId) || loadedAllSpaces[0] || defaultSpaces[0];
      setCurrentSpace(nextCurrentSpace);

      hasHydratedRef.current = true;
    } catch (error) {
      if (error?.code === 'AUTH_REQUIRED' || String(error?.message || '').includes('Drive auth required')) {
        setNeedsDriveAuth(true);
      } else {
        console.error('Failed to load application data:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [buildInitialLayoutState, migrateLegacyStorageData]);

  const persistLayoutsNow = useCallback(async (nextLayouts, nextActiveLayoutId) => {
    await Promise.all([
      storage.set('focusnook-layouts', nextLayouts),
      storage.set('focusnook-active-layout', nextActiveLayoutId),
    ]);
  }, []);

  useEffect(() => {
    const handler = () => {
      setNeedsDriveAuth(true);
      setIsLoading(false);
    };

    window.addEventListener(DRIVE_AUTH_REQUIRED_EVENT, handler);
    return () => window.removeEventListener(DRIVE_AUTH_REQUIRED_EVENT, handler);
  }, []);

  useEffect(() => {
    const init = async () => {
      const preferredStorageType = localStorage.getItem('focusnook-storage-type');

      if (preferredStorageType === 'gdrive') {
        try {
          await googleDriveAdapter.initialize();
          const restored = await googleDriveAdapter.restoreSession();

          if (restored) {
            storage.setAdapter(googleDriveAdapter);
            setStorageType('gdrive');
            await loadData();
          } else {
            setNeedsDriveAuth(true);
            setIsLoading(false);
          }
        } catch (error) {
          console.error('Failed to init Drive scripts, falling back to local', error);
          storage.setAdapter(new LocalStorageAdapter());
          setStorageType('local');
          await loadData();
        }
        return;
      }

      if (preferredStorageType === 'localfile') {
        try {
          await localFileAdapter.initialize();
          const result = await localFileAdapter.restoreSession();

          if (result.success) {
            storage.setAdapter(localFileAdapter);
            setStorageType('localfile');
            await loadData();
            return;
          }

          if (result.reason === 'permission_required') {
            setStorageType('localfile');
            setRequiresFilePermission(result.fileName);
            setIsLoading(false);
            return;
          }

          storage.setAdapter(new LocalStorageAdapter());
          setStorageType('local');
          await loadData();
          return;
        } catch (error) {
          console.error('Failed to restore local file session, falling back to local storage', error);
          storage.setAdapter(new LocalStorageAdapter());
          setStorageType('local');
          await loadData();
          return;
        }
      }

      try {
        await googleDriveAdapter.initialize();
        const restored = await googleDriveAdapter.restoreSession();
        if (restored) {
          storage.setAdapter(googleDriveAdapter);
          setStorageType('gdrive');
          await loadData();
          return;
        }
      } catch (error) {
        console.warn('Drive session check failed, continuing with local storage', error);
      }

      setStorageType('local');
      await loadData();
    };

    init();
  }, [loadData]);

  useEffect(() => {
    if (!allSpaces.length) return;

    setCurrentSpace((prev) => {
      const stillExists = allSpaces.some((space) => space.id === prev?.id);
      if (stillExists) return prev;
      return allSpaces[0];
    });
  }, [allSpaces]);

  useEffect(() => {
    if (!hasHydratedRef.current || !layouts.length || isLoading) return;

    const timeout = setTimeout(() => {
      storage.set('focusnook-layouts', layouts);
      storage.set('focusnook-active-layout', activeLayoutId);
    }, 600);

    return () => clearTimeout(timeout);
  }, [layouts, activeLayoutId, isLoading]);

  useEffect(() => {
    if (!activeLayout) return;
    const nextVisibility = getLayoutVisibility(activeLayout);
    setWidgetVisibility((prev) => (shallowEqual(prev, nextVisibility) ? prev : nextVisibility));
  }, [activeLayout]);

  const updateLayoutById = useCallback((layoutId, updater) => {
    if (!layoutId) return;

    setLayouts((prev) => {
      const index = prev.findIndex((layout) => layout.id === layoutId);
      if (index === -1) return prev;

      const current = prev[index];
      const updated = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
      const normalized = normalizeLayoutForViewport(
        {
          ...updated,
          updatedAt: Date.now(),
        },
        getViewport()
      );

      const next = [...prev];
      next[index] = normalized;
      return next;
    });
  }, []);

  const handleWidgetLayoutChange = useCallback(({ widgetId, position, size }) => {
    if (!activeLayoutId || !widgetId) return;

    updateLayoutById(activeLayoutId, (layout) => {
      const currentWidget = layout.widgets?.[widgetId] || {};
      return {
        ...layout,
        widgets: {
          ...layout.widgets,
          [widgetId]: {
            ...currentWidget,
            x: Number(position?.x) || currentWidget.x || 24,
            y: Number(position?.y) || currentWidget.y || 80,
            width: Number(size?.width) || currentWidget.width || getDefaultWidgetSize(widgetId).width,
            height: Number(size?.height) || currentWidget.height || getDefaultWidgetSize(widgetId).height,
            visible: typeof currentWidget.visible === 'boolean' ? currentWidget.visible : true,
          },
        },
      };
    });
  }, [activeLayoutId, updateLayoutById]);

  const toggleWidgetVisibility = useCallback((widgetId) => {
    setWidgetVisibility((prev) => {
      const next = {
        ...prev,
        [widgetId]: !prev[widgetId],
      };

      if (activeLayoutId) {
        updateLayoutById(activeLayoutId, (layout) => {
          const currentWidget = layout.widgets?.[widgetId] || {};
          return {
            ...layout,
            widgets: {
              ...layout.widgets,
              [widgetId]: {
                ...currentWidget,
                visible: next[widgetId],
              },
            },
          };
        });
      }

      return next;
    });
  }, [activeLayoutId, updateLayoutById]);

  const activateLayout = useCallback((layoutId) => {
    const nextLayout = layouts.find((layout) => layout.id === layoutId);
    if (!nextLayout) return;

    setActiveLayoutId(layoutId);
    setWidgetVisibility(getLayoutVisibility(nextLayout));
  }, [layouts]);

  const saveCurrentLayout = useCallback(async () => {
    if (!activeLayoutId) return false;

    const nextLayouts = layouts.map((layout) => (layout.id === activeLayoutId
      ? {
        ...layout,
        updatedAt: Date.now(),
        viewport: getViewport(),
      }
      : layout));

    setLayouts(nextLayouts);
    await persistLayoutsNow(nextLayouts, activeLayoutId);
    return true;
  }, [activeLayoutId, layouts, persistLayoutsNow]);

  const saveLayoutAs = useCallback((name) => {
    if (!activeLayout) return;

    const now = Date.now();
    const duplicated = normalizeLayoutForViewport(
      {
        ...activeLayout,
        id: `layout-${now}`,
        name,
        createdAt: now,
        updatedAt: now,
      },
      getViewport()
    );

    setLayouts((prev) => [...prev, duplicated]);
    setActiveLayoutId(duplicated.id);
    setWidgetVisibility(getLayoutVisibility(duplicated));
  }, [activeLayout]);

  const renameLayout = useCallback((layoutId, name) => {
    updateLayoutById(layoutId, (layout) => ({
      ...layout,
      name,
    }));
  }, [updateLayoutById]);

  const deleteLayout = useCallback((layoutId) => {
    if (layouts.length <= 1) return;

    const remaining = layouts.filter((layout) => layout.id !== layoutId);
    if (!remaining.length) return;

    const nextActive = remaining.some((layout) => layout.id === activeLayoutId)
      ? activeLayoutId
      : remaining[0].id;

    setLayouts(remaining);
    setActiveLayoutId(nextActive);
    const nextLayout = remaining.find((layout) => layout.id === nextActive) || remaining[0];
    setWidgetVisibility(getLayoutVisibility(nextLayout));
  }, [activeLayoutId, layouts]);

  const applyLayoutPreset = useCallback((presetId) => {
    if (!activeLayoutId) return;

    const current = layouts.find((layout) => layout.id === activeLayoutId);
    if (!current) return;

    const preset = createPresetLayout(presetId, {
      id: current.id,
      name: current.name,
      createdAt: current.createdAt,
      viewport: getViewport(),
    });

    setLayouts((prev) => prev.map((layout) => (layout.id === current.id ? preset : layout)));
    setWidgetVisibility(getLayoutVisibility(preset));
  }, [activeLayoutId, layouts]);

  const resetActiveLayout = useCallback(() => {
    const current = layouts.find((layout) => layout.id === activeLayoutId);
    const presetId = current?.presetId || 'balanced';
    applyLayoutPreset(presetId);
  }, [activeLayoutId, applyLayoutPreset, layouts]);

  const handleDriveConnect = async () => {
    await googleDriveAdapter.connect();
  };

  const handleFilePermission = async () => {
    const granted = await localFileAdapter.verifyPermission();
    if (granted) {
      storage.setAdapter(localFileAdapter);
      setStorageType('localfile');
      setRequiresFilePermission(false);
      await loadData();
    }
  };

  const handleStorageModeChange = useCallback(async (mode, options = {}) => {
    if (mode === 'localfile') {
      storage.setAdapter(localFileAdapter);
      setStorageType('localfile');
      setNeedsDriveAuth(false);
      if (!options.skipLoad) {
        await loadData();
      }
      return;
    }

    storage.setAdapter(new LocalStorageAdapter());
    setStorageType('local');
    setNeedsDriveAuth(false);
    if (!options.skipLoad) {
      await loadData();
    }
  }, [loadData]);

  const snapshotAppData = useCallback(async () => storage.getAll(APP_STORAGE_KEYS), []);

  useEffect(() => {
    if (!isLoading) {
      storage.set('focusnook-enabled-widgets', enabledWidgets);
    }
  }, [enabledWidgets, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      storage.set('focusnook-widget-visibility', widgetVisibility);
    }
  }, [widgetVisibility, isLoading]);

  useEffect(() => {
    if (!isLoading && currentSpace) {
      storage.set('focusnook-current-space', currentSpace.id);
    }
  }, [currentSpace, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      storage.set('focusnook-settings', settings);
    }
  }, [settings, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      storage.set('focusnook-todoist', todoistConfig);
    }
  }, [todoistConfig, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      storage.set('focusnook-music', musicState);
      if (musicState.customStreams) {
        storage.set('focusnook-custom-streams', musicState.customStreams);
      }
    }
  }, [musicState, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      storage.set('focusnook-custom-spaces', customSpaces);
    }
  }, [customSpaces, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      storage.set('focusnook-hidden-default-space-ids', hiddenDefaultSpaceIds);
    }
  }, [hiddenDefaultSpaceIds, isLoading]);

  const updateMusicState = useCallback((updates) => {
    if (typeof updates === 'function') {
      setMusicState(updates);
      return;
    }
    setMusicState((prev) => ({ ...prev, ...updates }));
  }, []);

  const toggleWidgetEnabled = useCallback((widgetId) => {
    setEnabledWidgets((prev) => ({
      ...prev,
      [widgetId]: !prev[widgetId],
    }));
  }, []);

  const updateSettings = useCallback((updates) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateTodoistConfig = useCallback((updates) => {
    setTodoistConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const addSpace = useCallback((newSpace) => {
    setCustomSpaces((prev) => [...prev, { ...newSpace, isCustom: true }]);
  }, []);

  const updateSpace = useCallback((updatedSpace) => {
    setCustomSpaces((prev) => prev.map((space) => (space.id === updatedSpace.id ? updatedSpace : space)));
    if (currentSpace?.id === updatedSpace.id) {
      setCurrentSpace(updatedSpace);
    }
  }, [currentSpace?.id]);

  const deleteSpace = useCallback((spaceId) => {
    setCustomSpaces((prev) => prev.filter((space) => space.id !== spaceId));
    if (currentSpace?.id === spaceId) {
      const fallback = visibleDefaultSpaces[0] || defaultSpaces[0];
      setCurrentSpace(fallback);
    }
  }, [currentSpace?.id, visibleDefaultSpaces]);

  const hideAllDefaultSpaces = useCallback(() => {
    setHiddenDefaultSpaceIds(defaultSpaces.map((space) => space.id));
  }, []);

  const resetDefaultSpaces = useCallback(() => {
    setHiddenDefaultSpaceIds([]);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      switch (event.key.toLowerCase()) {
        case ' ':
          event.preventDefault();
          window.dispatchEvent(new CustomEvent('pomodoro-toggle'));
          break;
        case 'r':
          if (!event.metaKey && !event.ctrlKey) {
            window.dispatchEvent(new CustomEvent('pomodoro-reset'));
          }
          break;
        case '1':
          toggleWidgetVisibility('pomodoro');
          break;
        case '2':
          toggleWidgetVisibility('sounds');
          break;
        case '3':
          toggleWidgetVisibility('todos');
          break;
        case '4':
          toggleWidgetVisibility('notes');
          break;
        case '5':
          toggleWidgetVisibility('planner');
          break;
        case '6':
          toggleWidgetVisibility('music');
          break;
        case '7':
          toggleWidgetVisibility('focusprep');
          break;
        case 's':
          if (!event.metaKey && !event.ctrlKey) {
            setShowSpaceBrowser(true);
          }
          break;
        case 'f':
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
          } else {
            document.exitFullscreen();
          }
          break;
        case 'escape':
          setShowSpaceBrowser(false);
          setShowSettings(false);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleWidgetVisibility]);

  const layoutOptions = useMemo(
    () => layouts.map((layout) => ({ id: layout.id, name: layout.name })),
    [layouts]
  );

  if (isLoading) {
    return (
      <div className="app-loading">
        <Loader size={48} className="animate-spin" />
        <p>Loading your space...</p>
        <style>{`
          .app-loading {
            height: 100vh;
            width: 100vw;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #111;
            color: #fff;
            gap: 20px;
          }
          .animate-spin {
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (needsDriveAuth) {
    return (
      <div className="app-loading">
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <Music size={48} />
          <h2>Welcome back!</h2>
          <p>Please reconnect to Google Drive to load your space.</p>
          <button
            className="connect-btn"
            style={{
              background: '#22c55e',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500',
            }}
            onClick={handleDriveConnect}
          >
            Connect to Drive
          </button>

          <button
            style={{
              background: 'transparent',
              color: '#888',
              border: 'none',
              marginTop: '10px',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
            onClick={() => {
              storage.setAdapter(new LocalStorageAdapter());
              localStorage.removeItem('focusnook-storage-type');
              setStorageType('local');
              setNeedsDriveAuth(false);
            }}
          >
            Continue with Local Storage
          </button>
        </div>
        <style>{`
          .app-loading {
            height: 100vh;
            width: 100vw;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #111;
            color: #fff;
          }
        `}</style>
      </div>
    );
  }

  if (requiresFilePermission) {
    return (
      <div className="app-loading">
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <Music size={48} />
          <h2>Welcome back!</h2>
          <p>Please reconnect to <strong>{requiresFilePermission}</strong> to load your space.</p>
          <button
            className="connect-btn"
            style={{
              background: '#22c55e',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500',
            }}
            onClick={handleFilePermission}
          >
            Reconnect File
          </button>

          <button
            style={{
              background: 'transparent',
              color: '#888',
              border: 'none',
              marginTop: '10px',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
            onClick={() => {
              storage.setAdapter(new LocalStorageAdapter());
              localStorage.removeItem('focusnook-storage-type');
              setStorageType('local');
              setRequiresFilePermission(false);
              loadData();
            }}
          >
            Continue with Local Storage
          </button>
        </div>
        <style>{`
          .app-loading {
            height: 100vh;
            width: 100vw;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #111;
            color: #fff;
          }
        `}</style>
      </div>
    );
  }

  const pomodoroFrame = getWidgetFrame(activeLayout, 'pomodoro');
  const soundsFrame = getWidgetFrame(activeLayout, 'sounds');
  const todosFrame = getWidgetFrame(activeLayout, 'todos');
  const notesFrame = getWidgetFrame(activeLayout, 'notes');
  const plannerFrame = getWidgetFrame(activeLayout, 'planner');
  const musicFrame = getWidgetFrame(activeLayout, 'music');
  const focusPrepFrame = getWidgetFrame(activeLayout, 'focusprep');

  return (
    <div className="app">
      <VideoBackground youtubeId={currentSpace.youtubeId} />

      <div className="current-space">
        <span className="space-name">{currentSpace.name}</span>
      </div>

      {settings.showClock && (
        <div className="clock-container">
          <Clock use12Hour={settings.use12Hour} />
          {musicState.isPlaying && musicState.selectedStream && (
            <div className="now-playing-indicator">
              <Music size={14} />
              <span>Now Playing: {musicState.selectedStream.name}</span>
            </div>
          )}
        </div>
      )}

      {widgetVisibility.pomodoro && (
        <DraggableWidget
          widgetId="pomodoro"
          position={pomodoroFrame.position}
          size={pomodoroFrame.size}
          defaultPosition={pomodoroFrame.position}
          defaultSize={pomodoroFrame.size}
          minWidth={300}
          minHeight={430}
          zIndex={widgetZIndices.pomodoro || 10}
          onBringToFront={bringWidgetToFront}
          onLayoutChange={handleWidgetLayoutChange}
          disableResize
        >
          <div style={{ opacity: settings.widgetOpacity }}>
            <Pomodoro
              isMuted={Boolean(settings.pomodoroMuted)}
              onMuteChange={(muted) => updateSettings({ pomodoroMuted: muted })}
            />
          </div>
        </DraggableWidget>
      )}

      {widgetVisibility.sounds && (
        <DraggableWidget
          widgetId="sounds"
          position={soundsFrame.position}
          size={soundsFrame.size}
          defaultPosition={soundsFrame.position}
          defaultSize={soundsFrame.size}
          zIndex={widgetZIndices.sounds || 10}
          onBringToFront={bringWidgetToFront}
          onLayoutChange={handleWidgetLayoutChange}
        >
          <div style={{ opacity: settings.widgetOpacity }}>
            <AmbientSounds />
          </div>
        </DraggableWidget>
      )}

      {widgetVisibility.todos && (
        <DraggableWidget
          widgetId="todos"
          position={todosFrame.position}
          size={todosFrame.size}
          defaultPosition={todosFrame.position}
          defaultSize={todosFrame.size}
          zIndex={widgetZIndices.todos || 10}
          onBringToFront={bringWidgetToFront}
          onLayoutChange={handleWidgetLayoutChange}
        >
          <div style={{ opacity: settings.widgetOpacity }}>
            <TodoList todoistConfig={todoistConfig} />
          </div>
        </DraggableWidget>
      )}

      {widgetVisibility.notes && (
        <DraggableWidget
          widgetId="notes"
          position={notesFrame.position}
          size={notesFrame.size}
          defaultPosition={notesFrame.position}
          defaultSize={notesFrame.size}
          zIndex={widgetZIndices.notes || 10}
          onBringToFront={bringWidgetToFront}
          onLayoutChange={handleWidgetLayoutChange}
        >
          <div style={{ opacity: settings.widgetOpacity }}>
            <Notes />
          </div>
        </DraggableWidget>
      )}

      {widgetVisibility.planner && (
        <DraggableWidget
          widgetId="planner"
          position={plannerFrame.position}
          size={plannerFrame.size}
          defaultPosition={plannerFrame.position}
          defaultSize={plannerFrame.size}
          zIndex={widgetZIndices.planner || 10}
          onBringToFront={bringWidgetToFront}
          onLayoutChange={handleWidgetLayoutChange}
        >
          <div style={{ opacity: settings.widgetOpacity }}>
            <DailyPlanner
              startHour={settings.plannerStartHour}
              endHour={settings.plannerEndHour}
            />
          </div>
        </DraggableWidget>
      )}

      {widgetVisibility.music && (
        <DraggableWidget
          widgetId="music"
          position={musicFrame.position}
          size={musicFrame.size}
          defaultPosition={musicFrame.position}
          defaultSize={musicFrame.size}
          minWidth={320}
          minHeight={250}
          allowOverflow
          disableResize
          zIndex={widgetZIndices.music || 10}
          onBringToFront={bringWidgetToFront}
          onLayoutChange={handleWidgetLayoutChange}
        >
          <div style={{ opacity: settings.widgetOpacity }}>
            <MusicPlayer musicState={musicState} onMusicStateChange={updateMusicState} />
          </div>
        </DraggableWidget>
      )}

      {widgetVisibility.focusprep && (
        <DraggableWidget
          widgetId="focusprep"
          position={focusPrepFrame.position}
          size={focusPrepFrame.size}
          defaultPosition={focusPrepFrame.position}
          defaultSize={focusPrepFrame.size}
          zIndex={widgetZIndices.focusprep || 10}
          onBringToFront={bringWidgetToFront}
          onLayoutChange={handleWidgetLayoutChange}
        >
          <div style={{ opacity: settings.widgetOpacity }}>
            <FocusPrep />
          </div>
        </DraggableWidget>
      )}

      {musicState.isPlaying && musicState.selectedStream && (
        <div className="persistent-music-player">
          <YouTubePlayer
            videoId={musicState.selectedStream.videoId}
            isPlaying={musicState.isPlaying}
            volume={musicState.volume ?? 50}
            isMuted={musicState.isMuted ?? false}
            onStateChange={(state) => {
              const isPlaying = state === 1;
              const isPausedOrEnded = state === 2 || state === 0;

              if (isPlaying && !musicState.isPlaying) {
                setMusicState((prev) => ({ ...prev, isPlaying: true }));
              }
              if (isPausedOrEnded && musicState.isPlaying) {
                setMusicState((prev) => ({ ...prev, isPlaying: false }));
              }
            }}
          />
        </div>
      )}

      <NavigationDock
        enabledWidgets={enabledWidgets}
        widgetVisibility={widgetVisibility}
        onToggleWidgetVisibility={toggleWidgetVisibility}
        onOpenSpaceBrowser={() => setShowSpaceBrowser(true)}
        onOpenSettings={() => setShowSettings(true)}
      />

      {showSpaceBrowser && (
        <SpaceBrowser
          spaces={allSpaces}
          currentSpaceId={currentSpace.id}
          onSelectSpace={setCurrentSpace}
          onClose={() => setShowSpaceBrowser(false)}
          onAddSpace={addSpace}
          onUpdateSpace={updateSpace}
          onDeleteSpace={deleteSpace}
          hasVisibleDefaultSpaces={visibleDefaultSpaces.length > 0}
          hasHiddenDefaultSpaces={hiddenDefaultSpaceIds.length > 0}
          onHideAllDefaultSpaces={hideAllDefaultSpaces}
          onResetDefaultSpaces={resetDefaultSpaces}
        />
      )}

      {showSettings && (
        <SettingsPanel
          settings={settings}
          enabledWidgets={enabledWidgets}
          todoistConfig={todoistConfig}
          storageType={storageType}
          layouts={layoutOptions}
          activeLayoutId={activeLayoutId}
          layoutPresets={LAYOUT_PRESETS}
          onStorageModeChange={handleStorageModeChange}
          onRequestDataSnapshot={snapshotAppData}
          onUpdateSettings={updateSettings}
          onUpdateTodoistConfig={updateTodoistConfig}
          onToggleWidgetEnabled={toggleWidgetEnabled}
          onClose={() => setShowSettings(false)}
          onResetPositions={resetActiveLayout}
          onActivateLayout={activateLayout}
          onSaveCurrentLayout={saveCurrentLayout}
          onSaveLayoutAs={saveLayoutAs}
          onRenameLayout={renameLayout}
          onDeleteLayout={deleteLayout}
          onApplyLayoutPreset={applyLayoutPreset}
        />
      )}

      <style>{`
        .app {
          width: 100%;
          height: 100%;
          position: relative;
          overflow: hidden;
        }

        .current-space {
          position: fixed;
          top: var(--space-6);
          left: var(--space-6);
          z-index: var(--z-widget);
        }

        .space-name {
          font-size: var(--font-size-sm);
          font-weight: 500;
          color: var(--color-text-secondary);
          background: var(--glass-bg);
          backdrop-filter: blur(10px);
          padding: var(--space-2) var(--space-4);
          border-radius: var(--radius-full);
          border: 1px solid var(--glass-border);
        }

        .clock-container {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: var(--z-base);
          pointer-events: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-3);
        }

        .now-playing-indicator {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          background: var(--glass-bg);
          backdrop-filter: blur(10px);
          padding: var(--space-2) var(--space-4);
          border-radius: var(--radius-full);
          border: 1px solid var(--glass-border);
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
          animation: fadeIn 0.3s ease-out;
        }

        .now-playing-indicator svg {
          color: var(--color-accent);
        }

        .persistent-music-player {
          position: fixed;
          bottom: -9999px;
          left: -9999px;
          width: 1px;
          height: 1px;
          opacity: 0;
          pointer-events: none;
        }

        .persistent-music-player iframe {
          width: 100%;
          height: 100%;
        }
      `}</style>
    </div>
  );
}

export default App;
