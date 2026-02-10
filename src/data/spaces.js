// Ambient spaces with YouTube video sources
export const defaultSpaces = [
  {
    id: 'seaside-coffee-cartoon',
    name: 'Seaside Coffee Cartoon',
    category: 'Cafes',
    description: 'A charming animated coffee shop by the sea',
    thumbnail: 'https://img.youtube.com/vi/fU9RnaNNeOs/maxresdefault.jpg',
    youtubeId: 'fU9RnaNNeOs',
    defaultSounds: ['cafe']
  },
  {
    id: 'seaside-cafe',
    name: 'Seaside Café',
    category: 'Cafes',
    description: 'Relaxing café with ocean views',
    thumbnail: 'https://img.youtube.com/vi/gUbNlN_SqpE/maxresdefault.jpg',
    youtubeId: 'gUbNlN_SqpE',
    defaultSounds: ['cafe', 'waves']
  },
  {
    id: '90s-neon-lofi',
    name: '90s Chill Lofi Neon',
    category: 'Retro',
    description: 'Nostalgic neon-lit room with chill vibes',
    thumbnail: 'https://img.youtube.com/vi/sF80I-TQiW0/maxresdefault.jpg',
    youtubeId: 'sF80I-TQiW0',
    defaultSounds: []
  },
  {
    id: 'plant-coffee-shop',
    name: 'Plant Coffee Shop',
    category: 'Cafes',
    description: 'Cozy café surrounded by lush plants',
    thumbnail: 'https://img.youtube.com/vi/OO2kPK5-qno/maxresdefault.jpg',
    youtubeId: 'OO2kPK5-qno',
    defaultSounds: ['cafe']
  },
  {
    id: 'cozy-library',
    name: 'Cozy Library',
    category: 'Indoor',
    description: 'Peaceful library for deep focus',
    thumbnail: 'https://img.youtube.com/vi/8lXNNmYfupU/maxresdefault.jpg',
    youtubeId: '8lXNNmYfupU',
    defaultSounds: []
  }
];

const soundBaseUrl = import.meta.env.BASE_URL || '/';
const withSoundBase = (path) => `${soundBaseUrl}${path.replace(/^\/+/, '')}`;

// Ambient sounds data - Using static files from public folder
export const ambientSounds = [
  { id: 'rain', name: 'Rain', icon: '🌧️', url: withSoundBase('sounds/rain.mp3') },
  { id: 'fire', name: 'Fireplace', icon: '🔥', url: withSoundBase('sounds/fireplace.mp3') },
  { id: 'cafe', name: 'Café', icon: '☕', url: withSoundBase('sounds/cafe.mp3') },
  { id: 'nature', name: 'Forest', icon: '🌲', url: withSoundBase('sounds/forest.mp3') },
  { id: 'waves', name: 'Waves', icon: '🌊', url: withSoundBase('sounds/waves.mp3') },
  { id: 'wind', name: 'Wind', icon: '💨', url: withSoundBase('sounds/wind.mp3') },
  { id: 'thunder', name: 'Thunder', icon: '⛈️', url: withSoundBase('sounds/thunder.mp3') },
  { id: 'birds', name: 'Birds', icon: '🐦', url: withSoundBase('sounds/birds.mp3') },
  { id: 'whitenoise', name: 'White Noise', icon: '📻', url: withSoundBase('sounds/whitenoise.mp3') },
];

// Music streams data (YouTube live streams and mixes)
export const defaultMusicStreams = [
  {
    id: 'lofi-girl',
    name: 'Lofi Girl',
    category: 'lofi',
    videoId: 'jfKfPfyJRdk',
    channelIcon: 'https://yt3.googleusercontent.com/UZoRGNTpGwPgfwEZnU0TiBKfy59w_d5PhDuPtMVJM26b7MnFEtBdQ-oCVRXQ3C39z7aH7PIjCE5E=s176-c-k-c0x00ffffff-no-rj',
  },
  {
    id: 'chillhop',
    name: 'Chillhop Radio',
    category: 'chillhop',
    videoId: '5yx6BWlEVcY',
    channelIcon: 'https://yt3.googleusercontent.com/vCqmJ7cdUYpvR0bqLpDI8o_F5LFT-hSC4zfOLOOeIAhFbSTIHrSpgSELfIrMN5ymxhgVkXThSg=s176-c-k-c0x00ffffff-no-rj',
  },

  {
    id: 'relaxing-jazz',
    name: 'Relaxing Jazz Piano',
    category: 'piano',
    videoId: 'Dx5qFachd3A',
    channelIcon: 'https://yt3.googleusercontent.com/ytc/AIdro_nNkz5-xQyJfT7CqxPDBqvP7FqXlk5hFhNi-zzYyluIaQ=s176-c-k-c0x00ffffff-no-rj',
  },
  {
    id: 'coffee-shop',
    name: 'Coffee Shop Radio',
    category: 'coffeeshop',
    videoId: 'h2zkV-l_TbY',
    channelIcon: 'https://yt3.googleusercontent.com/ytc/AIdro_lGRc-05M2shaop7FLLlag8URPDH7x5z9HHU_J-mVLyow=s176-c-k-c0x00ffffff-no-rj',
  },
];
