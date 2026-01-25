/**
 * AUDIO REACTIVITY
 * 
 * Make Lenia respond to music/microphone input
 * using the Web Audio API.
 */

class AudioReactive {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.source = null;
        this.isActive = false;
        this.mode = 'none'; // 'none', 'mic', 'file'
        
        // Frequency band averages (0-1)
        this.bass = 0;
        this.mid = 0;
        this.high = 0;
        this.overall = 0;
        
        // Smoothed values (for less jittery response)
        this.smoothBass = 0;
        this.smoothMid = 0;
        this.smoothHigh = 0;
        this.smoothOverall = 0;
        
        // Smoothing factor (0-1, higher = smoother but more latent)
        this.smoothing = 0.8;
        
        // Beat detection
        this.beatThreshold = 1.3;
        this.beatHoldTime = 100; // ms
        this.lastBeatTime = 0;
        this.isBeat = false;
    }
    
    async initMicrophone() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.setupAudio(stream);
            this.mode = 'mic';
            this.isActive = true;
            return true;
        } catch (e) {
            console.error('Microphone access denied:', e);
            return false;
        }
    }
    
    initFileAudio(audioElement) {
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            this.source = this.audioContext.createMediaElementSource(audioElement);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            
            this.source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
            
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            this.mode = 'file';
            this.isActive = true;
            return true;
        } catch (e) {
            console.error('Failed to init file audio:', e);
            return false;
        }
    }
    
    setupAudio(stream) {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        this.source = this.audioContext.createMediaStreamSource(stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        
        this.source.connect(this.analyser);
        // Don't connect to destination for mic (would cause feedback)
        
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    }
    
    stop() {
        if (this.source && this.mode === 'mic') {
            this.source.mediaStream.getTracks().forEach(track => track.stop());
        }
        this.isActive = false;
        this.mode = 'none';
        this.bass = this.mid = this.high = this.overall = 0;
        this.smoothBass = this.smoothMid = this.smoothHigh = this.smoothOverall = 0;
    }
    
    update() {
        if (!this.isActive || !this.analyser) return;
        
        this.analyser.getByteFrequencyData(this.dataArray);
        
        const bufferLength = this.analyser.frequencyBinCount;
        const bassEnd = Math.floor(bufferLength * 0.1);
        const midEnd = Math.floor(bufferLength * 0.5);
        
        // Calculate frequency band averages
        let bassSum = 0, midSum = 0, highSum = 0;
        
        for (let i = 0; i < bassEnd; i++) {
            bassSum += this.dataArray[i];
        }
        for (let i = bassEnd; i < midEnd; i++) {
            midSum += this.dataArray[i];
        }
        for (let i = midEnd; i < bufferLength; i++) {
            highSum += this.dataArray[i];
        }
        
        // Normalize to 0-1
        this.bass = bassSum / (bassEnd * 255);
        this.mid = midSum / ((midEnd - bassEnd) * 255);
        this.high = highSum / ((bufferLength - midEnd) * 255);
        this.overall = (this.bass + this.mid + this.high) / 3;
        
        // Apply smoothing
        this.smoothBass = this.smoothBass * this.smoothing + this.bass * (1 - this.smoothing);
        this.smoothMid = this.smoothMid * this.smoothing + this.mid * (1 - this.smoothing);
        this.smoothHigh = this.smoothHigh * this.smoothing + this.high * (1 - this.smoothing);
        this.smoothOverall = this.smoothOverall * this.smoothing + this.overall * (1 - this.smoothing);
        
        // Beat detection (sudden increase in bass)
        const now = performance.now();
        if (this.bass > this.smoothBass * this.beatThreshold && 
            now - this.lastBeatTime > this.beatHoldTime) {
            this.isBeat = true;
            this.lastBeatTime = now;
        } else {
            this.isBeat = false;
        }
    }
    
    // Get values for use in simulation
    getEnergy() {
        return this.smoothOverall;
    }
    
    getBass() {
        return this.smoothBass;
    }
    
    getMid() {
        return this.smoothMid;
    }
    
    getHigh() {
        return this.smoothHigh;
    }
    
    hasBeat() {
        return this.isBeat;
    }
}

// Create global instance
if (typeof window !== 'undefined') {
    window.AudioReactive = AudioReactive;
}
