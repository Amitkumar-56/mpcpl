// Notification Sound Utility
// Uses Audio element with WAV file for reliable playback + Web Audio API fallback

let audioElement = null;
let audioInitialized = false;
let userInteractionReceived = false;

// Base64-encoded short notification chime WAV
// 3-tone ascending chime (A5 → C#6 → E6) - 0.6 seconds
// Only generate on client side
let NOTIFICATION_SOUND_BASE64 = null;

const generateNotificationSound = () => {
  if (NOTIFICATION_SOUND_BASE64) return NOTIFICATION_SOUND_BASE64;
  if (typeof window === 'undefined') return null;
  
  try {
    const sampleRate = 22050;
    const duration = 0.6;
    const numSamples = Math.floor(sampleRate * duration);
    const dataSize = numSamples * 2;
    const headerSize = 44;
    const totalSize = headerSize + dataSize;
    
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, totalSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    
    // Generate audio samples
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      let val = 0;
      
      // Tone 1: 880 Hz (A5) - LOUD
      if (t < 0.12) {
        const env = Math.exp(-t * 10);
        val = Math.sin(2 * Math.PI * 880 * t) * 1.0 * env;
      }
      // Gap
      else if (t < 0.18) {
        val = 0;
      }
      // Tone 2: 1100 Hz (C#6) - LOUD
      else if (t < 0.30) {
        const env = Math.exp(-(t - 0.18) * 8);
        val = Math.sin(2 * Math.PI * 1100 * t) * 1.0 * env;
      }
      // Gap
      else if (t < 0.35) {
        val = 0;
      }
      // Tone 3: 1320 Hz (E6) - LOUD
      else if (t < 0.6) {
        const env = Math.exp(-(t - 0.35) * 5);
        val = Math.sin(2 * Math.PI * 1320 * t) * 0.9 * env;
      }
      
      const sample = Math.max(-32768, Math.min(32767, Math.round(val * 32767)));
      view.setInt16(headerSize + i * 2, sample, true);
    }
    
    // Convert to base64
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    NOTIFICATION_SOUND_BASE64 = btoa(binary);
    return NOTIFICATION_SOUND_BASE64;
  } catch (e) {
    console.log('Failed to generate notification sound:', e.message);
    return null;
  }
};

// Create and cache the audio element
const createAudioElement = () => {
  if (audioElement) return audioElement;
  
  try {
    const soundData = generateNotificationSound();
    if (!soundData) return null;
    
    audioElement = new Audio(`data:audio/wav;base64,${soundData}`);
    audioElement.volume = 1.0;
    audioElement.preload = 'auto';
    console.log('🔊 Audio element created');
    return audioElement;
  } catch (error) {
    console.log('🔊 Audio element creation failed:', error.message);
    return null;
  }
};

// Initialize audio on page load
if (typeof window !== 'undefined') {
  // Defer audio creation to avoid blocking
  if (document.readyState === 'complete') {
    createAudioElement();
  } else {
    window.addEventListener('load', createAudioElement);
  }
}

// Initialize voices on page load
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  // Load voices immediately
  const loadVoices = () => {
    const voices = window.speechSynthesis.getVoices();
    console.log('🗣️ Available voices:', voices.length);
    console.log('🗣️ Speech synthesis ready (but requires user interaction)');
  };

  // Try to load voices immediately
  loadVoices();
  
  // Also load voices when they're ready (some browsers load asynchronously)
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
}

// Global variables for debouncing
let lastSpeakTime = 0;
const SPEAK_DEBOUNCE_DELAY = 1000; // 1 second minimum between calls

// Text-to-speech function for voice announcement
export const speakMessage = (text, lang = 'hi-IN') => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.log('🔇 Speech synthesis not supported');
    return false;
  }

  // Debounce rapid calls
  const now = Date.now();
  if (now - lastSpeakTime < SPEAK_DEBOUNCE_DELAY) {
    console.log('🗣️ Speech debounced - too soon');
    return false;
  }
  lastSpeakTime = now;

  try {
    // Cancel any previous speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1.3;
    utterance.pitch = 1.2;
    utterance.volume = 1.0;
    
    // Get available voices
    const voices = window.speechSynthesis.getVoices();
    
    // Try to find Hindi voice first, then fallback to English
    const hindiVoice = voices.find(voice => voice.lang.includes('hi'));
    const englishVoice = voices.find(voice => voice.lang.includes('en'));
    
    if (hindiVoice) {
      utterance.voice = hindiVoice;
      console.log('🗣️ Using Hindi voice for:', text);
    } else if (englishVoice) {
      utterance.voice = englishVoice;
      utterance.lang = 'en-US';
      console.log('🗣️ Using English voice for:', text);
    }
    
    // Force speech to start
    window.speechSynthesis.speak(utterance);
    
    utterance.onstart = () => console.log('🗣️ Voice started:', text);
    utterance.onend = () => console.log('🗣️ Voice completed:', text);
    utterance.onerror = (event) => {
      if (event.error !== 'interrupted') {
        console.error('🗣️ Voice error:', event.error);
      }
    };
    
    return true;
  } catch (error) {
    console.error('🗣️ Speech synthesis failed:', error.message);
    return false;
  }
};

// Debounce for playBeep - prevents double-play from multiple socket connections
let lastBeepTime = 0;
const BEEP_DEBOUNCE = 500; // 500ms

// Play notification sound using Audio element (most reliable)
export const playBeep = () => {
  if (typeof window === 'undefined') {
    console.log('🔇 Not in browser environment');
    return false;
  }

  // Debounce: prevent double-play when multiple sockets receive same message
  const now = Date.now();
  if (now - lastBeepTime < BEEP_DEBOUNCE) {
    console.log('🔊 Sound debounced (duplicate prevented)');
    return true;
  }
  lastBeepTime = now;

  let played = false;

  // Method 1: Audio element with pre-generated WAV
  try {
    const audio = createAudioElement();
    if (audio) {
      // Clone to allow overlapping sounds
      const audioClone = audio.cloneNode();
      audioClone.volume = 1.0;
      
      const playPromise = audioClone.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('🔊 Notification sound played (Audio element)');
            played = true;
          })
          .catch((err) => {
            console.log('🔊 Audio play failed, trying Web Audio API...', err.message);
            playWebAudioBeep();
          });
      }
      return true; // Return true optimistically
    }
  } catch (error) {
    console.log('🔊 Audio element failed:', error.message);
  }

  // Method 2: Web Audio API fallback
  if (!played) {
    return playWebAudioBeep();
  }

  return false;
};

// Web Audio API fallback for notification sound
const playWebAudioBeep = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;

    const ctx = new AudioContext();
    
    // Resume if suspended
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // Create a pleasant 3-tone notification chime
    const playTone = (freq, startTime, duration, volume) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playTone(880, now, 0.15, 1.0);         // A5 - LOUD
    playTone(1100, now + 0.18, 0.15, 1.0); // C#6 - LOUD
    playTone(1320, now + 0.36, 0.25, 0.9); // E6 - LOUD

    console.log('🔊 Web Audio API notification chime played');
    return true;
  } catch (error) {
    console.error('🔊 All sound methods failed:', error.message);
    return false;
  }
};

// Test function to verify sound is working
export const testSound = () => {
  console.log('🧪 Testing sound...');
  const success = playBeep();
  if (success) {
    console.log('✅ Sound test successful');
  } else {
    console.log('❌ Sound test failed');
  }
  return success;
};

// Test voice announcement
export const testVoice = () => {
  console.log('🧪 Testing voice...');
  const success = speakMessage("नमस्ते, यह एक टेस्ट मैसेज है");
  return success;
};

// Force initialize audio (call this on first user interaction)
export const forceInitializeAudio = () => {
  userInteractionReceived = true;
  
  // Create audio element
  createAudioElement();
  
  // Pre-play silence to unlock audio on mobile
  if (audioElement) {
    audioElement.volume = 0;
    const p = audioElement.play();
    if (p) {
      p.then(() => {
        audioElement.pause();
        audioElement.currentTime = 0;
        audioElement.volume = 1.0;
        console.log('🔊 Audio unlocked via user interaction');
      }).catch(() => {});
    }
  }
  
  audioInitialized = true;
};
