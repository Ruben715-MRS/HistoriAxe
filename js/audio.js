// =========================================================================
// === HISTORIAXE — MODULE AUDIO IMMERSIF & RETOUR HAPTIQUE (GAME FEEL) ===
// =========================================================================

let audioCtx = null;
let noiseBuffer = null;

function getAudioCtx() {
    if (typeof appSettings !== 'undefined' && !appSettings.sound) return null;
    if (!audioCtx) {
        try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
        catch (e) { return null; }
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
}

function getNoiseBuffer(ctx) {
    if (noiseBuffer) return noiseBuffer;
    const bufferSize = ctx.sampleRate * 0.4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.45;
    }
    noiseBuffer = buffer;
    return noiseBuffer;
}

// --- MOTEUR HAPTIQUE ---
function triggerHaptic(type = 'light') {
    if (typeof appSettings !== 'undefined' && !appSettings.haptics) return;
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
            switch (type) {
                case 'light':
                case 'selection':
                    navigator.vibrate(15);
                    break;
                case 'place':
                    navigator.vibrate(22);
                    break;
                case 'success':
                    navigator.vibrate([15, 35, 25]);
                    break;
                case 'warning':
                case 'error':
                    navigator.vibrate([40, 45, 55]);
                    break;
                case 'victory':
                    navigator.vibrate([30, 40, 30, 40, 60]);
                    break;
                default:
                    navigator.vibrate(15);
            }
        } catch (e) {}
    }
    if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics) {
        try {
            const H = window.Capacitor.Plugins.Haptics;
            if (type === 'light' || type === 'selection') H.impact({ style: 'light' });
            else if (type === 'place') H.impact({ style: 'medium' });
            else if (type === 'success' || type === 'victory') H.notification({ type: 'success' });
            else if (type === 'error' || type === 'warning') H.notification({ type: 'error' });
        } catch (e) {}
    }
}

// --- SYNTHÈSE DE SONS NATURELS ET HARMONIQUES ---
function playNote(ctx, freq, startTime, duration, opts = {}) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    if (opts.glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.glideTo), startTime + duration);
    
    const peak = opts.volume || 0.16;
    const attack = opts.attack || 0.01;
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peak, startTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.04);
}

function playCardSlideSound() {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
        const now = ctx.currentTime;
        const noise = ctx.createBufferSource();
        noise.buffer = getNoiseBuffer(ctx);

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, now);
        filter.frequency.exponentialRampToValueAtTime(450, now + 0.14);
        filter.Q.setValueAtTime(2.2, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.09, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        noise.start(now);
        noise.stop(now + 0.15);
    } catch (e) {}
}

function playCardPlaceSound() {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    playNote(ctx, 130, now, 0.08, { type: 'sine', glideTo: 45, volume: 0.18, attack: 0.005 });
    try {
        const noise = ctx.createBufferSource();
        noise.buffer = getNoiseBuffer(ctx);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, now);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.07);
    } catch (e) {}
}

function playCorrectSound(combo = 1.0) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const boost = Math.min(1.45, 1 + Math.max(0, combo - 1) * 0.18);
    const baseFreq = 587.33 * boost;

    playNote(ctx, baseFreq, now, 0.35, { type: 'sine', volume: 0.15, attack: 0.008 });
    playNote(ctx, baseFreq * 1.5, now + 0.04, 0.38, { type: 'triangle', volume: 0.11, attack: 0.006 });
    playNote(ctx, baseFreq * 2.0, now + 0.08, 0.45, { type: 'sine', volume: 0.09, attack: 0.005 });
}

function playWrongSound() {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    playNote(ctx, 115, now, 0.22, { type: 'triangle', glideTo: 60, volume: 0.20, attack: 0.005 });
    playNote(ctx, 155, now, 0.16, { type: 'sine', glideTo: 75, volume: 0.13, attack: 0.005 });
}

function playVictorySound() {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((freq, i) => {
        playNote(ctx, freq, now + i * 0.11, 0.45, { type: 'triangle', volume: 0.14 });
        playNote(ctx, freq * 2, now + i * 0.11 + 0.02, 0.3, { type: 'sine', volume: 0.06 });
    });
    const chordStart = now + notes.length * 0.11;
    [523.25, 659.25, 783.99, 1046.50].forEach(freq => {
        playNote(ctx, freq, chordStart, 1.6, { type: 'triangle', volume: 0.12 });
        playNote(ctx, freq * 1.5, chordStart + 0.04, 1.4, { type: 'sine', volume: 0.07 });
    });
}

// --- BRUITAGES DE LA SALLE DE JEUX (tirs, pas de Pac-Man, battements d'ailes) ET MUSIQUE DE LA COURSE DE CHARS ---
// Tout est synthétisé (aucun fichier son) et suit le réglage « Sons » comme le reste : `getAudioCtx()` rend null quand il est coupé.
function playNoiseBurst(ctx, start, duration, opts = {}) {
    try {
        const noise = ctx.createBufferSource();
        noise.buffer = getNoiseBuffer(ctx);
        const filter = ctx.createBiquadFilter();
        filter.type = opts.type || 'bandpass';
        filter.frequency.setValueAtTime(opts.from || 1000, start);
        if (opts.to) filter.frequency.exponentialRampToValueAtTime(opts.to, start + duration);
        filter.Q.setValueAtTime(opts.q || 1, start);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(opts.volume || 0.1, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(start);
        noise.stop(start + duration + 0.02);
    } catch (e) {}
}

let chompToggle = false;

// `kind` : 'shoot' (tir du vaisseau), 'explosion' (une carte touchée), 'chomp' (un pas de Pac-Man, en « ouaka-ouaka »), 'flap' (un battement
// d'ailes), 'move' (un décalage de pièce), 'drop' (une chute), 'count' / 'go' (le compte à rebours). Sans effet quand le son est coupé.
function playArcadeSfx(kind) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (kind === 'shoot') {
        playNote(ctx, 1150, now, 0.14, { type: 'square', glideTo: 240, volume: 0.05, attack: 0.002 });
        playNote(ctx, 2300, now, 0.06, { type: 'sine', glideTo: 600, volume: 0.04, attack: 0.002 });
    } else if (kind === 'explosion') {
        playNoiseBurst(ctx, now, 0.3, { type: 'lowpass', from: 1800, to: 120, volume: 0.18, q: 0.7 });
        playNote(ctx, 130, now, 0.28, { type: 'sine', glideTo: 38, volume: 0.16, attack: 0.003 });
    } else if (kind === 'chomp') {
        chompToggle = !chompToggle;
        playNote(ctx, chompToggle ? 260 : 520, now, 0.085, { type: 'triangle', glideTo: chompToggle ? 520 : 260, volume: 0.1, attack: 0.004 });
    } else if (kind === 'flap') {
        playNote(ctx, 320, now, 0.09, { type: 'sine', glideTo: 640, volume: 0.07, attack: 0.004 });
        playNoiseBurst(ctx, now, 0.06, { type: 'highpass', from: 2500, volume: 0.03 });
    } else if (kind === 'count') {
        playNote(ctx, 440, now, 0.16, { type: 'square', volume: 0.05, attack: 0.004 });
    } else if (kind === 'go') {
        playNote(ctx, 880, now, 0.42, { type: 'square', volume: 0.06, attack: 0.004 });
    } else if (kind === 'move') {
        playNote(ctx, 190, now, 0.035, { type: 'square', volume: 0.025, attack: 0.002 });
    } else if (kind === 'drop') {
        playNote(ctx, 200, now, 0.12, { type: 'sine', glideTo: 60, volume: 0.1, attack: 0.003 });
        playNoiseBurst(ctx, now, 0.07, { type: 'lowpass', from: 900, volume: 0.05 });
    }
}

// Un sabot : un claquement sourd (une sinusoïde qui plonge) et un souffle de bruit filtré.
function playHoof(ctx, time, accent) {
    playNote(ctx, accent ? 170 : 210, time, 0.07, { type: 'sine', glideTo: 70, volume: accent ? 0.1 : 0.055, attack: 0.002 });
    playNoiseBurst(ctx, time, 0.05, { type: 'bandpass', from: 1100, q: 1.5, volume: accent ? 0.06 : 0.03 });
}

// La musique de la course : un galop (un coup fort, deux faibles, un silence à chaque temps) sous une fanfare en do majeur de huit mesures qui
// tourne en boucle. [temps de départ, hauteur en Hz, durée en temps] ; la basse joue les temps 1 et 3 de chaque mesure.
const RACE_MELODY = (() => {
    const N = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99 };
    return [
        [0, N.G4, 0.5], [0.5, N.C5, 0.5], [1, N.E5, 1], [2, N.G4, 0.5], [2.5, N.C5, 0.5], [3, N.E5, 1],
        [4, N.G5, 1.5], [5.5, N.E5, 0.5], [6, N.C5, 1], [7, N.G4, 1],
        [8, N.A4, 0.5], [8.5, N.C5, 0.5], [9, N.F5, 1], [10, N.A4, 0.5], [10.5, N.C5, 0.5], [11, N.F5, 1],
        [12, N.E5, 1], [13, N.D5, 1], [14, N.C5, 2],
        [16, N.G4, 0.5], [16.5, N.C5, 0.5], [17, N.E5, 1], [18, N.G5, 1], [19, N.E5, 1],
        [20, N.D5, 1], [21, N.E5, 1], [22, N.G5, 2],
        [24, N.F5, 0.5], [24.5, N.E5, 0.5], [25, N.D5, 1], [26, N.C5, 0.5], [26.5, N.D5, 0.5], [27, N.E5, 1],
        [28, N.G4, 1], [29, N.B4, 1], [30, N.C5, 2]
    ];
})();
const RACE_BASS = [130.81, 130.81, 174.61, 130.81, 130.81, 196, 174.61, 130.81];
const RACE_BEATS = 32;
let raceMusicTimer = 0;
let raceMusicBeat = 0;
let raceMusicNext = 0;
let raceMusicBeatLength = 0.42;

function raceMusicSchedule() {
    const ctx = getAudioCtx();
    if (!ctx) { stopRaceMusic(); return; }
    while (raceMusicNext < ctx.currentTime + 0.35) {
        const t0 = raceMusicNext;
        const beat = raceMusicBeat;
        const len = raceMusicBeatLength;
        // le galop : un coup fort, deux faibles, puis une respiration
        playHoof(ctx, t0, true);
        playHoof(ctx, t0 + len * 0.28, false);
        playHoof(ctx, t0 + len * 0.5, false);
        if (beat % 2 === 0) playNote(ctx, RACE_BASS[Math.floor(beat / 4)], t0, len * 1.6, { type: 'triangle', volume: 0.07, attack: 0.01 });
        RACE_MELODY.forEach(n => {
            if (n[0] >= beat && n[0] < beat + 1) {
                const at = t0 + (n[0] - beat) * len;
                playNote(ctx, n[1], at, n[2] * len * 0.95, { type: 'sawtooth', volume: 0.03, attack: 0.02 });
                playNote(ctx, n[1] * 2, at, n[2] * len * 0.8, { type: 'sine', volume: 0.025, attack: 0.02 });
            }
        });
        raceMusicNext += len;
        raceMusicBeat = (beat + 1) % RACE_BEATS;
    }
}

function startRaceMusic(tempo = 1) {
    if (raceMusicTimer) return true;
    const ctx = getAudioCtx();
    if (!ctx) return false;
    raceMusicBeatLength = 0.42 / tempo;
    raceMusicBeat = 0;
    raceMusicNext = ctx.currentTime + 0.1;
    raceMusicSchedule();
    raceMusicTimer = setInterval(raceMusicSchedule, 120);
    return true;
}

function stopRaceMusic() {
    clearInterval(raceMusicTimer);
    raceMusicTimer = 0;
}

// --- CONFETTIS (célébration : fin de partie gagnée, badge, changement de grade) ---
// Canvas plein écran créé à la volée (voir #confetti-canvas dans style.css) : aucune
// dépendance externe, pas d'élément à prévoir dans le HTML.
let confettiCanvas = null;
let confettiCtx = null;
let confettiAnimId = null;
let confettiParticles = [];

function getConfettiCanvas() {
    if (confettiCanvas && document.body.contains(confettiCanvas)) return confettiCanvas;
    confettiCanvas = document.getElementById('confetti-canvas');
    if (!confettiCanvas) {
        confettiCanvas = document.createElement('canvas');
        confettiCanvas.id = 'confetti-canvas';
        document.body.appendChild(confettiCanvas);
    }
    confettiCtx = confettiCanvas.getContext('2d');
    return confettiCanvas;
}

function triggerConfetti(duration = 2500) {
    try {
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const canvas = getConfettiCanvas();
        const ctx = confettiCtx;
        if (!ctx) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;

        const colors = ['#f7931e', '#27ae60', '#3498db', '#e74c3c', '#9b59b6', '#f1c40f'];
        const count = 140;
        for (let i = 0; i < count; i++) {
            confettiParticles.push({
                x: Math.random() * canvas.width,
                y: -20 * dpr - Math.random() * canvas.height * 0.3,
                w: (6 + Math.random() * 6) * dpr,
                h: (8 + Math.random() * 10) * dpr,
                color: colors[Math.floor(Math.random() * colors.length)],
                vy: (2 + Math.random() * 3) * dpr,
                vx: (Math.random() - 0.5) * 2.5 * dpr,
                rotation: Math.random() * Math.PI * 2,
                vr: (Math.random() - 0.5) * 0.3,
                sway: Math.random() * Math.PI * 2
            });
        }

        const startTime = Date.now();

        function frame() {
            const elapsed = Date.now() - startTime;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            confettiParticles.forEach(p => {
                p.sway += 0.05;
                p.x += p.vx + Math.sin(p.sway) * 0.6 * dpr;
                p.y += p.vy;
                p.rotation += p.vr;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                ctx.restore();
            });
            confettiParticles = confettiParticles.filter(p => p.y < canvas.height + 40 * dpr);

            if (elapsed < duration || confettiParticles.length > 0) {
                confettiAnimId = requestAnimationFrame(frame);
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                confettiAnimId = null;
            }
        }

        if (!confettiAnimId) confettiAnimId = requestAnimationFrame(frame);
    } catch (e) {}
}
