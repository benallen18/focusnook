export const APP_STORAGE_KEYS = [
  'focusnook-custom-spaces',
  'focusnook-hidden-default-space-ids',
  'focusnook-current-space',
  'focusnook-enabled-widgets',
  'focusnook-widget-visibility',
  'focusnook-settings',
  'focusnook-todoist',
  'focusnook-music',
  'focusnook-custom-streams',
  'focusnook-todos',
  'focusnook-todoist-order',
  'focusnook-focus-task',
  'focusnook-events',
  'focusnook-notes',
  'focusnook-focus-prep',
  'focusnook-layouts',
  'focusnook-active-layout',
];

export const LEGACY_KEY_MIGRATIONS = {
  'chillspace-todos': 'focusnook-todos',
  'chillspace-focus-task': 'focusnook-focus-task',
  'chillspace-todoist-order': 'focusnook-todoist-order',
  'chillspace-planner': 'focusnook-events',
  'chillspace-focus-prep': 'focusnook-focus-prep',
};

export const WIDGET_IDS = [
  'pomodoro',
  'sounds',
  'todos',
  'notes',
  'planner',
  'music',
  'focusprep',
];
