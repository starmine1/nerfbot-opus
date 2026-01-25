/**
 * GIF Recording for Lenia
 * Captures frames and exports as animated GIF
 */

class LeniaRecorder {
    constructor(canvas) {
        this.canvas = canvas;
        this.recording = false;
        this.frames = [];
        this.maxFrames = 150; // 5 seconds at 30fps
        this.frameInterval = 1000 / 30; // 30 fps
        this.lastFrameTime = 0;
        this.encoder = null;
    }
    
    start() {
        if (this.recording) return;
        
        this.recording = true;
        this.frames = [];
        this.lastFrameTime = performance.now();
        
        console.log('🎬 Recording started...');
    }
    
    stop() {
        if (!this.recording) return;
        
        this.recording = false;
        console.log(`🎬 Recording stopped. ${this.frames.length} frames captured.`);
        
        if (this.frames.length > 0) {
            this.exportGIF();
        }
    }
    
    captureFrame(currentTime) {
        if (!this.recording) return;
        
        // Throttle to target framerate
        if (currentTime - this.lastFrameTime < this.frameInterval) return;
        
        if (this.frames.length >= this.maxFrames) {
            this.stop();
            return;
        }
        
        // Capture frame from canvas
        try {
            const imageData = this.canvas.toDataURL('image/png');
            this.frames.push(imageData);
            this.lastFrameTime = currentTime;
            
            console.log(`Frame ${this.frames.length}/${this.maxFrames}`);
        } catch (e) {
            console.error('Failed to capture frame:', e);
            this.stop();
        }
    }
    
    async exportGIF() {
        console.log('📦 Exporting GIF...');
        
        try {
            // Use gif.js library
            const gif = new GIF({
                workers: 2,
                quality: 10,
                width: this.canvas.width,
                height: this.canvas.height,
                workerScript: 'gif.worker.js'
            });
            
            // Add all frames
            for (const frameData of this.frames) {
                const img = new Image();
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                    img.src = frameData;
                });
                
                gif.addFrame(img, { delay: this.frameInterval });
            }
            
            gif.on('finished', (blob) => {
                // Download the GIF
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `lenia-${Date.now()}.gif`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                console.log('✅ GIF exported successfully!');
                this.frames = [];
            });
            
            gif.render();
            
        } catch (e) {
            console.error('Failed to export GIF:', e);
            // Fallback: download as ZIP of PNGs
            this.exportFrames();
        }
    }
    
    exportFrames() {
        // Simple fallback: download all frames as separate PNGs
        console.log('📦 Exporting frames as PNGs...');
        
        this.frames.forEach((frameData, i) => {
            const a = document.createElement('a');
            a.href = frameData;
            a.download = `lenia-frame-${String(i).padStart(4, '0')}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
        
        this.frames = [];
        console.log('✅ Frames exported!');
    }
    
    toggle() {
        if (this.recording) {
            this.stop();
        } else {
            this.start();
        }
        return this.recording;
    }
}
