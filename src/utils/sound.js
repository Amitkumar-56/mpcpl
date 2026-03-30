// Global audio context for auto-play
let globalAudioContext = null;
let audioInitialized = false;
let userInteractionReceived = false;

// Initialize audio context on page load
const initializeAudio = () => {
  if (audioInitialized) return;
  
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      globalAudioContext = new AudioContext();
      audioInitialized = true;
      console.log('🔊 Audio context initialized (but suspended until user interaction)');
    }
  } catch (error) {
    console.log('Audio initialization failed:', error.message);
  }
};

// Initialize audio immediately on page load
if (typeof window !== 'undefined') {
  initializeAudio();
}

// Initialize voices on page load
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  // Load voices immediately
  const loadVoices = () => {
    const voices = window.speechSynthesis.getVoices();
    console.log('🗣️ Available voices:', voices.length);
    console.log('🗣️ Voice list:', voices.map(v => `${v.name} (${v.lang})`).slice(0, 5));
    console.log('🗣️ Speech synthesis ready (but requires user interaction)');
  };

  // Try to load voices immediately
  loadVoices();
  
  // Also load voices when they're ready (some browsers load asynchronously)
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
}

// Initialize audio on page load
if (typeof window !== 'undefined') {
  if (document.readyState === 'complete') {
    initializeAudio();
  } else {
    document.addEventListener('DOMContentLoaded', initializeAudio);
  }
  
  // Also try on window load
  window.addEventListener('load', initializeAudio);
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
    utterance.rate = 1.3; // Increased from 0.9 to 1.3 (faster)
    utterance.pitch = 1.2; // Increased from 1 to 1.2 (slightly higher pitch)
    utterance.volume = 1.0; // Maximum volume
    
    // Get available voices
    const voices = window.speechSynthesis.getVoices();
    
    // Try to find Hindi voice first, then fallback to English
    const hindiVoice = voices.find(voice => voice.lang.includes('hi'));
    const englishVoice = voices.find(voice => voice.lang.includes('en'));
    
    if (hindiVoice) {
      utterance.voice = hindiVoice;
      console.log('🗣️ Using fast Hindi voice for:', text);
    } else if (englishVoice) {
      utterance.voice = englishVoice;
      utterance.lang = 'en-US';
      console.log('🗣️ Using fast English voice for:', text);
    } else {
      console.log('🗣️ Using fast default voice for:', text);
    }
    
    // Force speech to start
    window.speechSynthesis.speak(utterance);
    
    // Log success
    utterance.onstart = () => {
      console.log('🗣️ Fast voice started:', text);
    };
    
    utterance.onend = () => {
      console.log('🗣️ Fast voice completed:', text);
    };
    
    utterance.onerror = (event) => {
      // Handle 'interrupted' error gracefully - it's expected when cancel() is called
      if (event.error === 'interrupted') {
        console.log('🗣️ Speech interrupted (expected when new speech starts)');
      } else {
        console.error('🗣️ Voice error:', event.error);
      }
    };
    
    console.log('🗣️ Fast voice announcement triggered:', text);
    return true;
  } catch (error) {
    console.error('🗣️ Speech synthesis failed:', error.message);
    return false;
  }
};

// Enhanced sound function with better reliability
export const playBeep = () => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    console.log('🔇 Not in browser environment');
    return false;
  }

  // Try to use global audio context first
  if (globalAudioContext) {
    try {
      // Resume context if suspended (requires user interaction)
      if (globalAudioContext.state === 'suspended') {
        console.log('🔊 Audio context suspended - requires user interaction first');
        
        // Try to resume (will fail without user interaction)
        globalAudioContext.resume().then(() => {
          console.log('🔊 Audio context resumed - user interaction detected');
          return playBeepSound(globalAudioContext);
        }).catch(() => {
          console.log('🔊 Audio context resume failed - no user interaction yet');
          return fallbackMethods();
        });
        return false; // Will try again after user interaction
      } else {
        return playBeepSound(globalAudioContext);
      }
    } catch (error) {
      console.log('Global audio context failed, trying fallback...', error.message);
    }
  } else {
    // Initialize if not done yet
    initializeAudio();
    if (globalAudioContext) {
      return playBeepSound(globalAudioContext);
    }
  }

  return fallbackMethods();
};

// Function to play beep sound
const playBeepSound = (audioContext) => {
  try {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Create a louder and sharper notification sound
    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime); // Higher frequency
    oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.05); // Quick sweep
    oscillator.type = 'square'; // Sharper sound
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.01); // Higher volume
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1); // Shorter duration
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
    
    console.log('🔊 Loud sound played successfully (Web Audio API)');
    return true;
  } catch (error) {
    console.log('Beep sound failed:', error.message);
    return false;
  }
};

// Fallback methods
const fallbackMethods = () => {
  try {
    // Method 2: Try using data URI audio
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmFgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
    audio.volume = 1.0; // Maximum volume
    audio.playbackRate = 1.2; // Faster playback
    audio.play().catch(() => {
      console.log('Data URI audio failed');
    });
    
    console.log('🔊 Loud data URI audio played');
    return true;
  } catch (error) {
    console.log('Data URI audio failed, trying simple beep...', error.message);
  }
  
  try {
    // Method 3: Simple oscillator with context resume
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();
    
    // Resume context if suspended
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 1200; // Higher frequency
    oscillator.type = 'square'; // Sharper sound
    
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime); // Higher volume
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05); // Shorter duration
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.05);
    
    console.log('🔊 Loud simple beep played');
    return true;
  } catch (error) {
    console.error('All sound methods failed:', error.message);
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
  if (!audioInitialized) {
    initializeAudio();
  }
  
  if (globalAudioContext && globalAudioContext.state === 'suspended') {
    globalAudioContext.resume().then(() => {
      console.log('🔊 Audio context resumed');
    });
  }
  
  // Mark that user interaction has occurred
  userInteractionReceived = true;
};
