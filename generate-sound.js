// Generate notification-sound.wav for Service Worker
// Run: node generate-sound.js
const fs = require('fs');
const path = require('path');

const sampleRate = 22050;
const duration = 0.6;
const numSamples = Math.floor(sampleRate * duration);
const dataSize = numSamples * 2;
const headerSize = 44;
const totalSize = headerSize + dataSize;

const buffer = Buffer.alloc(totalSize);

// WAV Header
buffer.write('RIFF', 0);
buffer.writeUInt32LE(totalSize - 8, 4);
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
buffer.writeUInt32LE(dataSize, 40);

// Generate 3-tone ascending chime
for (let i = 0; i < numSamples; i++) {
  const t = i / sampleRate;
  let val = 0;
  
  if (t < 0.12) {
    val = Math.sin(2 * Math.PI * 880 * t) * Math.exp(-t * 10);
  } else if (t >= 0.18 && t < 0.30) {
    val = Math.sin(2 * Math.PI * 1100 * t) * Math.exp(-(t - 0.18) * 8);
  } else if (t >= 0.35 && t < 0.6) {
    val = Math.sin(2 * Math.PI * 1320 * t) * 0.9 * Math.exp(-(t - 0.35) * 5);
  }
  
  const sample = Math.max(-32768, Math.min(32767, Math.round(val * 32767)));
  buffer.writeInt16LE(sample, headerSize + i * 2);
}

const outputPath = path.join(__dirname, 'public', 'notification-sound.wav');
fs.writeFileSync(outputPath, buffer);
console.log('✅ Created:', outputPath, '(' + totalSize + ' bytes)');
