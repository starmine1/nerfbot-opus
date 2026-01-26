/**
 * PRESET GALLERY - Save and load interesting parameter combinations
 * 
 * Allows users to:
 * - Save current parameters with a name
 * - Quick-load presets with Shift+1-9
 * - Browse and manage saved presets
 * - Export/import preset collections
 */

class PresetGallery {
    constructor() {
        this.presets = this.loadPresetsFromStorage();
        this.maxPresets = 20;
        
        // Default starter presets if none exist
        if (Object.keys(this.presets).length === 0) {
            this.addDefaultPresets();
        }
    }
    
    loadPresetsFromStorage() {
        try {
            const stored = localStorage.getItem('lenia_presets');
            return stored ? JSON.parse(stored) : {};
        } catch (e) {
            console.error('Failed to load presets:', e);
            return {};
        }
    }
    
    savePresetsToStorage() {
        try {
            localStorage.setItem('lenia_presets', JSON.stringify(this.presets));
        } catch (e) {
            console.error('Failed to save presets:', e);
        }
    }
    
    addDefaultPresets() {
        // Add some interesting starter presets
        this.presets = {
            'glider': {
                name: 'Glider',
                R: 12,
                T: 18,
                mu: 0.14,
                sigma: 0.015,
                description: 'Smooth gliding motion',
                created: Date.now()
            },
            'pulse': {
                name: 'Pulse',
                R: 8,
                T: 12,
                mu: 0.18,
                sigma: 0.020,
                description: 'Rhythmic pulsing pattern',
                created: Date.now()
            },
            'chaotic': {
                name: 'Chaotic',
                R: 15,
                T: 8,
                mu: 0.12,
                sigma: 0.008,
                description: 'Unpredictable chaos',
                created: Date.now()
            },
            'stable': {
                name: 'Stable',
                R: 10,
                T: 20,
                mu: 0.15,
                sigma: 0.012,
                description: 'Slow, stable growth',
                created: Date.now()
            }
        };
        this.savePresetsToStorage();
    }
    
    savePreset(id, params) {
        if (Object.keys(this.presets).length >= this.maxPresets && !this.presets[id]) {
            throw new Error(`Maximum ${this.maxPresets} presets reached`);
        }
        
        this.presets[id] = {
            ...params,
            created: Date.now()
        };
        this.savePresetsToStorage();
    }
    
    loadPreset(id) {
        return this.presets[id] || null;
    }
    
    deletePreset(id) {
        delete this.presets[id];
        this.savePresetsToStorage();
    }
    
    getAllPresets() {
        return Object.entries(this.presets)
            .sort((a, b) => b[1].created - a[1].created) // Newest first
            .map(([id, preset]) => ({ id, ...preset }));
    }
    
    exportPresets() {
        return JSON.stringify(this.presets, null, 2);
    }
    
    importPresets(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            this.presets = { ...this.presets, ...imported };
            this.savePresetsToStorage();
            return Object.keys(imported).length;
        } catch (e) {
            throw new Error('Invalid preset JSON: ' + e.message);
        }
    }
}

// UI Controller for presets
class PresetGalleryUI {
    constructor(lenia, gallery) {
        this.lenia = lenia;
        this.gallery = gallery;
        this.createUI();
        this.setupKeyboardShortcuts();
    }
    
    createUI() {
        // Create preset panel
        const panel = document.createElement('div');
        panel.id = 'preset-panel';
        panel.innerHTML = `
            <div class="header">
                <span>💾 Preset Gallery</span>
                <button class="btn btn-small" id="btn-preset-close">×</button>
            </div>
            <div class="content">
                <div class="preset-actions">
                    <input type="text" id="preset-name-input" placeholder="Preset name..." />
                    <button class="btn btn-small" id="btn-preset-save">Save Current</button>
                </div>
                <div class="preset-hint">Shift+1-9 for quick load</div>
                <div id="preset-list"></div>
                <div class="preset-actions" style="margin-top: 12px;">
                    <button class="btn btn-small" id="btn-preset-export">Export</button>
                    <button class="btn btn-small" id="btn-preset-import">Import</button>
                </div>
            </div>
        `;
        document.body.appendChild(panel);
        
        // Add CSS
        const style = document.createElement('style');
        style.textContent = `
            #preset-panel {
                position: fixed;
                top: 100px;
                right: 20px;
                width: 280px;
                background: rgba(0, 0, 0, 0.9);
                border: 1px solid rgba(255, 255, 255, 0.5);
                border-radius: 4px;
                z-index: 1000;
                font-size: 11px;
                color: #fff;
                display: none;
                backdrop-filter: blur(8px);
                max-height: 70vh;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
            
            #preset-panel.visible {
                display: flex;
            }
            
            #preset-panel .header {
                padding: 10px 12px;
                background: rgba(255, 255, 255, 0.05);
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                text-transform: uppercase;
                letter-spacing: 2px;
                font-size: 10px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            #btn-preset-close {
                font-size: 16px;
                padding: 0 6px;
                background: transparent;
                border: none;
                cursor: pointer;
            }
            
            #preset-panel .content {
                padding: 12px;
                overflow-y: auto;
                flex: 1;
            }
            
            .preset-actions {
                display: flex;
                gap: 8px;
                margin-bottom: 12px;
            }
            
            #preset-name-input {
                flex: 1;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.3);
                color: #fff;
                padding: 4px 8px;
                font-size: 11px;
                font-family: inherit;
            }
            
            .preset-hint {
                font-size: 9px;
                color: rgba(255, 255, 255, 0.5);
                margin-bottom: 12px;
                text-align: center;
            }
            
            #preset-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .preset-item {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.2);
                padding: 8px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .preset-item:hover {
                background: rgba(255, 255, 255, 0.1);
                border-color: rgba(120, 200, 255, 0.6);
            }
            
            .preset-item-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 4px;
            }
            
            .preset-item-name {
                font-weight: bold;
                color: rgba(120, 200, 255, 0.9);
            }
            
            .preset-item-delete {
                background: rgba(255, 100, 100, 0.3);
                border: none;
                color: #fff;
                padding: 2px 6px;
                font-size: 9px;
                cursor: pointer;
            }
            
            .preset-item-delete:hover {
                background: rgba(255, 100, 100, 0.6);
            }
            
            .preset-item-params {
                font-size: 9px;
                color: rgba(255, 255, 255, 0.6);
                font-family: monospace;
            }
            
            .preset-item-desc {
                font-size: 9px;
                color: rgba(255, 255, 255, 0.5);
                margin-top: 4px;
                font-style: italic;
            }
        `;
        document.head.appendChild(style);
        
        // Setup event listeners
        this.setupEventListeners();
        this.refreshList();
    }
    
    setupEventListeners() {
        document.getElementById('btn-preset-close').addEventListener('click', () => {
            document.getElementById('preset-panel').classList.remove('visible');
        });
        
        document.getElementById('btn-preset-save').addEventListener('click', () => {
            this.saveCurrentPreset();
        });
        
        document.getElementById('btn-preset-export').addEventListener('click', () => {
            this.exportPresets();
        });
        
        document.getElementById('btn-preset-import').addEventListener('click', () => {
            this.importPresets();
        });
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Shift+Number: Quick load preset
            if (e.shiftKey && e.key >= '1' && e.key <= '9') {
                const index = parseInt(e.key) - 1;
                const presets = this.gallery.getAllPresets();
                if (presets[index]) {
                    this.loadPreset(presets[index].id);
                    e.preventDefault();
                }
            }
            
            // P key: Toggle preset panel
            if (e.key === 'p' || e.key === 'P') {
                const panel = document.getElementById('preset-panel');
                panel.classList.toggle('visible');
                e.preventDefault();
            }
        });
    }
    
    saveCurrentPreset() {
        const nameInput = document.getElementById('preset-name-input');
        const name = nameInput.value.trim() || `Preset ${Date.now()}`;
        const id = name.toLowerCase().replace(/\s+/g, '_');
        
        // Get current parameters from lab sliders or current species
        const R = parseInt(document.getElementById('slider-R').value);
        const T = parseInt(document.getElementById('slider-T').value);
        const mu = parseFloat(document.getElementById('slider-mu').value);
        const sigma = parseFloat(document.getElementById('slider-sigma').value);
        
        try {
            this.gallery.savePreset(id, {
                name,
                R, T, mu, sigma,
                description: 'User saved preset'
            });
            
            nameInput.value = '';
            this.refreshList();
            
            // Show feedback
            const btn = document.getElementById('btn-preset-save');
            btn.textContent = 'Saved!';
            setTimeout(() => { btn.textContent = 'Save Current'; }, 1500);
        } catch (e) {
            alert(e.message);
        }
    }
    
    loadPreset(id) {
        const preset = this.gallery.loadPreset(id);
        if (!preset) return;
        
        // Update lab sliders
        document.getElementById('slider-R').value = preset.R;
        document.getElementById('slider-T').value = preset.T;
        document.getElementById('slider-mu').value = preset.mu;
        document.getElementById('slider-sigma').value = preset.sigma;
        
        document.getElementById('val-R').textContent = preset.R;
        document.getElementById('val-T').textContent = preset.T;
        document.getElementById('val-mu').textContent = preset.mu.toFixed(3);
        document.getElementById('val-sigma').textContent = preset.sigma.toFixed(3);
        
        // Apply to simulation
        this.lenia.setParameters({ R: preset.R, T: preset.T, mu: preset.mu, sigma: preset.sigma });
        
        console.log(`Loaded preset: ${preset.name}`, preset);
    }
    
    deletePreset(id) {
        if (confirm('Delete this preset?')) {
            this.gallery.deletePreset(id);
            this.refreshList();
        }
    }
    
    refreshList() {
        const list = document.getElementById('preset-list');
        const presets = this.gallery.getAllPresets();
        
        if (presets.length === 0) {
            list.innerHTML = '<div style="text-align: center; color: rgba(255,255,255,0.5); padding: 20px;">No presets saved</div>';
            return;
        }
        
        list.innerHTML = presets.map((preset, index) => `
            <div class="preset-item" data-id="${preset.id}">
                <div class="preset-item-header">
                    <span class="preset-item-name">${index < 9 ? `[${index + 1}] ` : ''}${preset.name}</span>
                    <button class="preset-item-delete" data-id="${preset.id}">Del</button>
                </div>
                <div class="preset-item-params">
                    R:${preset.R} T:${preset.T} μ:${preset.mu.toFixed(3)} σ:${preset.sigma.toFixed(3)}
                </div>
                ${preset.description ? `<div class="preset-item-desc">${preset.description}</div>` : ''}
            </div>
        `).join('');
        
        // Add click handlers
        list.querySelectorAll('.preset-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('preset-item-delete')) {
                    this.loadPreset(item.dataset.id);
                }
            });
        });
        
        list.querySelectorAll('.preset-item-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deletePreset(btn.dataset.id);
            });
        });
    }
    
    exportPresets() {
        const json = this.gallery.exportPresets();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'lenia-presets.json';
        a.click();
        URL.revokeObjectURL(url);
    }
    
    importPresets() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const count = this.gallery.importPresets(e.target.result);
                    alert(`Imported ${count} presets!`);
                    this.refreshList();
                } catch (err) {
                    alert('Import failed: ' + err.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }
    
    toggle() {
        const panel = document.getElementById('preset-panel');
        panel.classList.toggle('visible');
    }
}
