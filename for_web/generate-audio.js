/**
 * 音频生成脚本 - 将 Web Audio API 动态音效转换为静态 WAV 文件
 * 使用 Node.js 原生模块生成音频数据
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 音频配置
const SAMPLE_RATE = 44100;
const BITS_PER_SAMPLE = 16;
const CHANNELS = 1; // 单声道

// 输出目录
const OUTPUT_DIR = path.join(__dirname, '..', 'static', 'audio');

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * 写入 WAV 文件头
 */
function writeWavHeader(buffer, dataLength) {
    const view = new DataView(buffer);
    let offset = 0;

    // "RIFF" chunk
    writeString(view, offset, 'RIFF'); offset += 4;
    view.setUint32(offset, 36 + dataLength, true); offset += 4; // 文件大小
    writeString(view, offset, 'WAVE'); offset += 4;

    // "fmt " sub-chunk
    writeString(view, offset, 'fmt '); offset += 4;
    view.setUint32(offset, 16, true); offset += 4; // sub-chunk 大小
    view.setUint16(offset, 1, true); offset += 2; // 音频格式 (PCM)
    view.setUint16(offset, CHANNELS, true); offset += 2; // 声道数
    view.setUint32(offset, SAMPLE_RATE, true); offset += 4; // 采样率
    view.setUint32(offset, SAMPLE_RATE * CHANNELS * BITS_PER_SAMPLE / 8, true); offset += 4; // 字节率
    view.setUint16(offset, CHANNELS * BITS_PER_SAMPLE / 8, true); offset += 2; // 块对齐
    view.setUint16(offset, BITS_PER_SAMPLE, true); offset += 2; // 采样位数

    // "data" sub-chunk
    writeString(view, offset, 'data'); offset += 4;
    view.setUint32(offset, dataLength, true); offset += 4; // 数据大小

    return offset;
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

/**
 * 将音频数据写入 WAV 文件
 */
function writeWavFile(filename, audioData) {
    const dataLength = audioData.length * 2; // 16-bit = 2 bytes per sample
    const headerLength = 44;
    const buffer = new ArrayBuffer(headerLength + dataLength);
    
    // 写入头部
    writeWavHeader(buffer, dataLength);
    
    // 写入音频数据
    const view = new DataView(buffer);
    let offset = headerLength;
    
    for (let i = 0; i < audioData.length; i++) {
        // 将 -1.0 ~ 1.0 转换为 16-bit 有符号整数
        const sample = Math.max(-1, Math.min(1, audioData[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
    }
    
    // 写入文件
    const filepath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(filepath, Buffer.from(buffer));
    console.log(`✓ Generated: ${filename}`);
}

/**
 * 生成白噪声
 */
function generateNoise(duration, amplitude = 1.0) {
    const samples = Math.floor(SAMPLE_RATE * duration);
    const data = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
        data[i] = (Math.random() * 2 - 1) * amplitude;
    }
    return data;
}

/**
 * 生成正弦波
 */
function generateSine(frequency, duration, amplitude = 1.0) {
    const samples = Math.floor(SAMPLE_RATE * duration);
    const data = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
        const t = i / SAMPLE_RATE;
        data[i] = Math.sin(2 * Math.PI * frequency * t) * amplitude;
    }
    return data;
}

/**
 * 生成锯齿波
 */
function generateSawtooth(frequency, duration, amplitude = 1.0) {
    const samples = Math.floor(SAMPLE_RATE * duration);
    const data = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
        const t = i / SAMPLE_RATE;
        const phase = (t * frequency) % 1;
        data[i] = (2 * phase - 1) * amplitude;
    }
    return data;
}

/**
 * 生成方波
 */
function generateSquare(frequency, duration, amplitude = 1.0) {
    const samples = Math.floor(SAMPLE_RATE * duration);
    const data = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
        const t = i / SAMPLE_RATE;
        data[i] = (Math.sin(2 * Math.PI * frequency * t) >= 0 ? 1 : -1) * amplitude;
    }
    return data;
}

/**
 * 生成三角波
 */
function generateTriangle(frequency, duration, amplitude = 1.0) {
    const samples = Math.floor(SAMPLE_RATE * duration);
    const data = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
        const t = i / SAMPLE_RATE;
        const phase = (t * frequency) % 1;
        data[i] = (2 * Math.abs(2 * phase - 1) - 1) * amplitude;
    }
    return data;
}

/**
 * 应用指数衰减包络
 */
function applyDecay(data, decayTime) {
    const decaySamples = Math.floor(SAMPLE_RATE * decayTime);
    for (let i = 0; i < data.length; i++) {
        const t = i / decaySamples;
        const envelope = Math.exp(-t * 5); // 指数衰减
        data[i] *= envelope;
    }
    return data;
}

/**
 * 应用线性衰减
 */
function applyLinearDecay(data, decayTime) {
    const decaySamples = Math.floor(SAMPLE_RATE * decayTime);
    for (let i = 0; i < data.length; i++) {
        const t = i / decaySamples;
        const envelope = Math.max(0, 1 - t);
        data[i] *= envelope;
    }
    return data;
}

/**
 * 应用频率滑音
 */
function applySlide(data, startFreq, endFreq) {
    for (let i = 0; i < data.length; i++) {
        const t = i / data.length;
        const freq = startFreq + (endFreq - startFreq) * t;
        const phase = (i * freq / SAMPLE_RATE) % 1;
        data[i] = Math.sin(2 * Math.PI * phase) * Math.abs(data[i]);
    }
    return data;
}

/**
 * 混合多个音频数据
 */
function mix(...arrays) {
    const maxLength = Math.max(...arrays.map(a => a.length));
    const result = new Float32Array(maxLength);
    for (const arr of arrays) {
        for (let i = 0; i < arr.length; i++) {
            result[i] += arr[i];
        }
    }
    // 归一化
    let maxVal = 0;
    for (let i = 0; i < result.length; i++) {
        maxVal = Math.max(maxVal, Math.abs(result[i]));
    }
    if (maxVal > 1) {
        for (let i = 0; i < result.length; i++) {
            result[i] /= maxVal;
        }
    }
    return result;
}

// ==================== 生成各种音效 ====================

function generateJumpSound() {
    const duration = 0.15;
    const samples = Math.floor(SAMPLE_RATE * duration);
    const data = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
        const t = i / SAMPLE_RATE;
        const freq = 300 * Math.exp(t * 7); // 300 -> 600Hz 指数上升
        data[i] = Math.sin(2 * Math.PI * freq * t) * 0.5;
    }
    
    applyDecay(data, duration);
    return data;
}

function generateShootSound() {
    const duration = 0.1;
    const samples = Math.floor(SAMPLE_RATE * duration);
    const data = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
        const t = i / SAMPLE_RATE;
        const freq = 800 * Math.exp(-t * 15); // 800 -> 200Hz
        data[i] = Math.sin(2 * Math.PI * freq * t) * 0.5;
    }
    
    applyDecay(data, duration);
    return data;
}

function generateHitSound() {
    const duration = 0.2;
    const noise = generateNoise(duration, 0.5);
    const saw = generateSawtooth(200, duration, 0.5);
    
    // 频率下降
    for (let i = 0; i < saw.length; i++) {
        const t = i / saw.length;
        const freq = 200 * Math.exp(-t * 8);
        saw[i] = Math.sin(2 * Math.PI * freq * (i / SAMPLE_RATE)) * 0.5;
    }
    
    const data = mix(noise, saw);
    applyDecay(data, duration);
    return data;
}

function generateEnemyAppearSound() {
    const duration = 0.3;
    const samples = Math.floor(SAMPLE_RATE * duration);
    const data = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
        const t = i / SAMPLE_RATE;
        const freq = 400 * Math.exp(-t * 5); // 400 -> 200Hz
        data[i] = (2 * Math.abs(2 * ((t * freq) % 1) - 1) - 1) * 0.5; // 三角波
    }
    
    applyDecay(data, duration);
    return data;
}

function generateBossAppearSound() {
    const duration = 1.0;
    const samples = Math.floor(SAMPLE_RATE * duration);
    
    // 低鸣声
    const saw = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
        const t = i / SAMPLE_RATE;
        const freq = 80 - t * 20; // 80 -> 60Hz 线性下降
        const phase = (t * freq) % 1;
        saw[i] = (2 * phase - 1) * 0.5; // 锯齿波
    }
    applyLinearDecay(saw, duration);
    
    // 噪声
    const noise = generateNoise(0.5, 0.3);
    applyLinearDecay(noise, 0.5);
    
    const data = mix(saw, noise);
    return data;
}

function generateMissileSound() {
    const duration = 0.3;
    const samples = Math.floor(SAMPLE_RATE * duration);
    const data = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
        const t = i / SAMPLE_RATE;
        const freq = 200 * Math.exp(-t * 8); // 200 -> 50Hz
        const phase = (t * freq) % 1;
        data[i] = (2 * phase - 1) * 0.5; // 锯齿波
    }
    
    applyDecay(data, duration);
    return data;
}

function generateGameOverSound() {
    const duration = 1.2; // 4 notes * 0.3s
    const samples = Math.floor(SAMPLE_RATE * duration);
    const data = new Float32Array(samples);
    
    const notes = [440, 349.23, 293.66, 220]; // A4, F4, D4, A3
    const noteDuration = 0.3;
    
    notes.forEach((freq, index) => {
        const startSample = Math.floor(index * noteDuration * SAMPLE_RATE);
        const noteSamples = Math.floor(noteDuration * SAMPLE_RATE);
        
        for (let i = 0; i < noteSamples && (startSample + i) < samples; i++) {
            const t = i / SAMPLE_RATE;
            const sample = Math.sin(2 * Math.PI * freq * t) * 0.5;
            const envelope = Math.exp(-t * 10);
            data[startSample + i] += sample * envelope;
        }
    });
    
    return data;
}

function generateBackgroundMusic() {
    // 生成约 4 秒的循环音乐
    const duration = 4.0;
    const bpm = 120;
    const beatDuration = 60 / bpm;
    const samples = Math.floor(SAMPLE_RATE * duration);
    const data = new Float32Array(samples);
    
    // 低音鼓点
    for (let beat = 0; beat < 4; beat++) {
        const startTime = beat * beatDuration;
        const startSample = Math.floor(startTime * SAMPLE_RATE);
        const kickSamples = Math.floor(0.1 * SAMPLE_RATE);
        
        for (let i = 0; i < kickSamples && (startSample + i) < samples; i++) {
            const t = i / SAMPLE_RATE;
            const freq = 150 * Math.exp(-t * 30);
            const envelope = Math.exp(-t * 30);
            data[startSample + i] += Math.sin(2 * Math.PI * freq * t) * envelope * 0.5;
        }
    }
    
    // 贝斯线
    const bassNotes = [110, 110, 87.31, 98]; // A2, A2, F2, G2
    for (let beat = 0; beat < 4; beat++) {
        const startTime = beat * beatDuration;
        const startSample = Math.floor(startTime * SAMPLE_RATE);
        const noteSamples = Math.floor(beatDuration * SAMPLE_RATE);
        const freq = bassNotes[beat];
        
        for (let i = 0; i < noteSamples && (startSample + i) < samples; i++) {
            const t = i / SAMPLE_RATE;
            const phase = (t * freq) % 1;
            const saw = (2 * phase - 1) * 0.3;
            const envelope = Math.exp(-t * 3);
            data[startSample + i] += saw * envelope;
        }
    }
    
    // 旋律
    const melodyNotes = [220, 261.63, 293.66, 329.63]; // A3, C4, D4, E4
    const melodyBeats = [0, 1, 2, 3];
    
    melodyBeats.forEach((beat, index) => {
        const startTime = beat * beatDuration;
        const startSample = Math.floor(startTime * SAMPLE_RATE);
        const noteSamples = Math.floor(beatDuration * 0.5 * SAMPLE_RATE);
        const freq = melodyNotes[index];
        
        for (let i = 0; i < noteSamples && (startSample + i) < samples; i++) {
            const t = i / SAMPLE_RATE;
            const sample = (Math.sin(2 * Math.PI * freq * t) >= 0 ? 1 : -1) * 0.2;
            const envelope = Math.exp(-t * 5);
            data[startSample + i] += sample * envelope;
        }
    });
    
    // 归一化
    let maxVal = 0;
    for (let i = 0; i < data.length; i++) {
        maxVal = Math.max(maxVal, Math.abs(data[i]));
    }
    if (maxVal > 1) {
        for (let i = 0; i < data.length; i++) {
            data[i] /= maxVal;
        }
    }
    
    return data;
}

// ==================== 主程序 ====================

console.log('开始生成音频文件...\n');

// 生成所有音效
writeWavFile('jump.wav', generateJumpSound());
writeWavFile('shoot.wav', generateShootSound());
writeWavFile('hit.wav', generateHitSound());
writeWavFile('enemy_spawn.wav', generateEnemyAppearSound());
writeWavFile('boss_spawn.wav', generateBossAppearSound());
writeWavFile('missile.wav', generateMissileSound());
writeWavFile('gameover.wav', generateGameOverSound());

// 生成背景音乐（更长一些，约 8 秒循环）
const bgmData = generateBackgroundMusic();
writeWavFile('bgm.wav', bgmData);

console.log('\n✓ 所有音频文件生成完成！');
console.log(`输出目录: ${OUTPUT_DIR}`);
