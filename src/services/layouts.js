import { WIDGET_IDS } from './appKeys';

const DEFAULT_VISIBILITY = {
  pomodoro: true,
  sounds: false,
  todos: true,
  notes: false,
  planner: false,
  music: false,
  focusprep: false,
};

const DEFAULT_WIDGET_SIZE = {
  pomodoro: { width: 300, height: 450 },
  sounds: { width: 300, height: 320 },
  todos: { width: 340, height: 420 },
  notes: { width: 340, height: 320 },
  planner: { width: 360, height: 540 },
  music: { width: 320, height: 250 },
  focusprep: { width: 320, height: 340 },
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getViewport = (viewport = {}) => ({
  width: Math.max(800, Number(viewport.width) || window.innerWidth || 1440),
  height: Math.max(600, Number(viewport.height) || window.innerHeight || 900),
});

const clampWidget = (widgetId, widget, viewport) => {
  const fallback = DEFAULT_WIDGET_SIZE[widgetId];
  const width = clamp(Number(widget?.width) || fallback.width, 180, viewport.width - 40);
  const height = clamp(Number(widget?.height) || fallback.height, 120, viewport.height - 120);
  const x = clamp(Number(widget?.x) || 24, 0, Math.max(0, viewport.width - width));
  const y = clamp(Number(widget?.y) || 80, 0, Math.max(0, viewport.height - height - 80));
  return {
    x,
    y,
    width,
    height,
    visible: typeof widget?.visible === 'boolean' ? widget.visible : DEFAULT_VISIBILITY[widgetId],
  };
};

const widgetTemplateForPreset = (presetId, viewport) => {
  const rightEdge = viewport.width - 380;
  const lowerLeftY = viewport.height - 380;

  const balanced = {
    pomodoro: { x: 24, y: 80, width: 300, height: 450, visible: true },
    sounds: { x: 24, y: 550, width: 300, height: 320, visible: false },
    todos: { x: rightEdge + 40, y: 80, width: 340, height: 420, visible: true },
    notes: { x: rightEdge + 20, y: 520, width: 340, height: 320, visible: false },
    planner: { x: rightEdge, y: 80, width: 360, height: 560, visible: false },
    music: { x: 24, y: 550, width: 320, height: 250, visible: false },
    focusprep: { x: 24, y: 300, width: 320, height: 340, visible: false },
  };

  const focus = {
    pomodoro: { x: 24, y: 80, width: 300, height: 450, visible: true },
    sounds: { x: 24, y: lowerLeftY, width: 300, height: 320, visible: false },
    todos: { x: rightEdge + 20, y: 80, width: 340, height: 360, visible: true },
    notes: { x: rightEdge + 20, y: 460, width: 340, height: 320, visible: false },
    planner: { x: rightEdge - 20, y: 80, width: 380, height: 620, visible: true },
    music: { x: 24, y: lowerLeftY, width: 320, height: 250, visible: false },
    focusprep: { x: 24, y: 460, width: 320, height: 340, visible: true },
  };

  const wide = {
    pomodoro: { x: 24, y: 80, width: 300, height: 450, visible: true },
    sounds: { x: 24, y: 550, width: 300, height: 320, visible: true },
    todos: { x: viewport.width - 380, y: 80, width: 340, height: 380, visible: true },
    notes: { x: viewport.width - 380, y: 480, width: 340, height: 320, visible: true },
    planner: { x: Math.max(360, (viewport.width / 2) - 220), y: 80, width: 420, height: 600, visible: true },
    music: { x: 350, y: Math.max(420, viewport.height - 320), width: 320, height: 250, visible: true },
    focusprep: { x: 24, y: Math.max(460, viewport.height - 360), width: 320, height: 340, visible: true },
  };

  if (presetId === 'focus') return focus;
  if (presetId === 'wide') return wide;
  return balanced;
};

const presetName = (presetId) => {
  if (presetId === 'focus') return 'Focus';
  if (presetId === 'wide') return 'Wide';
  return 'Balanced';
};

export const LAYOUT_PRESETS = [
  { id: 'focus', name: 'Focus' },
  { id: 'balanced', name: 'Balanced' },
  { id: 'wide', name: 'Wide' },
];

export const getDefaultWidgetVisibility = () => ({ ...DEFAULT_VISIBILITY });

export const getDefaultWidgetSize = (widgetId) => {
  const size = DEFAULT_WIDGET_SIZE[widgetId];
  return size ? { ...size } : { width: 320, height: 320 };
};

export const createPresetLayout = (presetId, options = {}) => {
  const viewport = getViewport(options.viewport);
  const now = options.now || Date.now();
  const widgets = widgetTemplateForPreset(presetId, viewport);

  const normalizedWidgets = {};
  for (const widgetId of WIDGET_IDS) {
    normalizedWidgets[widgetId] = clampWidget(widgetId, widgets[widgetId], viewport);
  }

  return {
    id: options.id || `layout-${presetId}-${now}`,
    name: options.name || presetName(presetId),
    presetId,
    createdAt: options.createdAt || now,
    updatedAt: options.updatedAt || now,
    viewport,
    widgets: normalizedWidgets,
  };
};

export const scaleWidgetForViewport = (widgetId, widget, savedViewport, nextViewport) => {
  const fromViewport = getViewport(savedViewport);
  const toViewport = getViewport(nextViewport);
  const widthRatio = toViewport.width / fromViewport.width;
  const heightRatio = toViewport.height / fromViewport.height;

  return clampWidget(widgetId, {
    ...widget,
    x: Number(widget?.x) * widthRatio,
    y: Number(widget?.y) * heightRatio,
    width: Number(widget?.width) * widthRatio,
    height: Number(widget?.height) * heightRatio,
  }, toViewport);
};

export const normalizeLayoutForViewport = (layout, viewport) => {
  const nextViewport = getViewport(viewport);
  const layoutViewport = getViewport(layout?.viewport || nextViewport);
  const widgets = {};

  for (const widgetId of WIDGET_IDS) {
    widgets[widgetId] = scaleWidgetForViewport(
      widgetId,
      layout?.widgets?.[widgetId] || {},
      layoutViewport,
      nextViewport
    );
  }

  return {
    ...layout,
    id: layout?.id || `layout-balanced-${Date.now()}`,
    name: layout?.name || 'Balanced',
    presetId: layout?.presetId || 'balanced',
    createdAt: layout?.createdAt || Date.now(),
    updatedAt: layout?.updatedAt || Date.now(),
    viewport: nextViewport,
    widgets,
  };
};
