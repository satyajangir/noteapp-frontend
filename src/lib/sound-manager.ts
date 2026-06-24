import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

const soundFiles = {
  click: require('../../assets/sounds/click.wav'),
  tap: require('../../assets/sounds/tap.wav'),
  delete: require('../../assets/sounds/delete.wav'),
  archive: require('../../assets/sounds/archive.wav'),
  success: require('../../assets/sounds/success.wav'),
};

type SoundType = keyof typeof soundFiles;

const loadedSounds: Partial<Record<SoundType, AudioPlayer>> = {};

// Preload all sound effects
export async function preloadSounds() {
  try {
    // Configure audio category for simple UI playback
    await setAudioModeAsync({
      playsInSilentMode: true,
    });

    for (const [name, file] of Object.entries(soundFiles)) {
      const key = name as SoundType;
      if (!loadedSounds[key]) {
        // Create player instance directly
        const player = createAudioPlayer(file);
        loadedSounds[key] = player;
      }
    }
  } catch (error) {
    console.error('Failed to preload sounds:', error);
  }
}

// Play a specific sound effect with low latency
export function playSound(type: SoundType) {
  try {
    const player = loadedSounds[type];
    if (player) {
      // Replay sound from start (synchronously queue seekTo and play to minimize latency)
      player.seekTo(0);
      player.play();
    } else {
      // Fallback: Lazy load if not preloaded
      const newPlayer = createAudioPlayer(soundFiles[type]);
      loadedSounds[type] = newPlayer;
      newPlayer.play();
    }
  } catch (error) {
    console.warn(`Failed to play sound: ${type}`, error);
  }
}

// Clean up all sounds
export async function unloadSounds() {
  for (const key of Object.keys(loadedSounds) as SoundType[]) {
    try {
      const player = loadedSounds[key];
      if (player) {
        player.release();
        delete loadedSounds[key];
      }
    } catch (e) {
      // Ignore
    }
  }
}
