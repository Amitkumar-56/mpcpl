const fs = require('fs');

const sampleRate = 44100;
const duration = 0.8;
const numSamples = Math.floor(sampleRate * duration);
const buffer = Buffer.alloc(44 + numSamples * 2);

// WAV header
buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + numSamples * 2, 4);
buffer.write('WAVE', 8);
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(1, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * 2, 28);
buffer.writeUInt16LE(2, 32);
buffer.writeUInt16LE(16, 34);
buffer.write('data', 36);
buffer.writeUInt32LE(numSamples * 2, 40);

// Generate a pleasant 3-tone notification chime
for (let i = 0; i < numSamples; i++) {
  const t = i / sampleRate;
  let val = 0;
  
  // Tone 1: 880 Hz (A5) - rising
  if (t < 0.15) {
    val = Math.sin(2 * Math.PI * 880 * t) * 0.6 * (1 - t / 0.15);
  }
  // Gap
  else if (t < 0.25) {
    val = 0;
  }
  // Tone 2: 1100 Hz (C#6) - middle
  else if (t < 0.4) {
    val = Math.sin(2 * Math.PI * 1100 * t) * 0.7 * (1 - (t - 0.25) / 0.15);
  }
  // Gap
  else if (t < 0.5) {
    val = 0;
  }
  // Tone 3: 1320 Hz (E6) - highest, longer fade
  else if (t < 0.8) {
    val = Math.sin(2 * Math.PI * 1320 * t) * 0.5 * (1 - (t - 0.5) / 0.3);
  }

  const sample = Math.max(-32768, Math.min(32767, Math.round(val * 32767)));
  buffer.writeInt16LE(sample, 44 + i * 2);
}

fs.writeFileSync('public/notification-sound.wav', buffer);
console.log('Notification sound created:', buffer.length, 'bytes');
