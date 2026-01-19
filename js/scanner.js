/**
 * Barcode Scanner Module
 * Handles camera initialization and barcode detection
 */

class BarcodeScanner {
    constructor(elementId, onScanSuccess) {
        this.elementId = elementId;
        this.onScanSuccess = onScanSuccess;
        this.html5QrCode = null;
        this.isScanning = false;
        this.lastScannedCode = '';
        this.lastScanTime = 0;
        this.debounceMs = 2000; // Prevent duplicate scans within 2 seconds
        
        // Supported barcode formats for retail
        this.supportedFormats = [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.ITF
        ];
        
        this.init();
    }
    
    init() {
        this.html5QrCode = new Html5Qrcode(this.elementId, {
            formatsToSupport: this.supportedFormats,
            verbose: false
        });
    }
    
    async start() {
        if (this.isScanning) return;
        
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 100 },
            aspectRatio: 1.5,
            disableFlip: false
        };
        
        try {
            await this.html5QrCode.start(
                { facingMode: "environment" }, // Prefer back camera
                config,
                (decodedText, decodedResult) => this.handleScan(decodedText, decodedResult),
                (errorMessage) => {
                    // Ignore scan errors (normal when no barcode in view)
                }
            );
            
            this.isScanning = true;
            this.showScanOverlay(true);
            return { success: true };
            
        } catch (err) {
            console.error('Failed to start scanner:', err);
            return { success: false, error: err.message };
        }
    }
    
    async stop() {
        if (!this.isScanning) return;
        
        try {
            await this.html5QrCode.stop();
            this.isScanning = false;
            this.showScanOverlay(false);
            return { success: true };
        } catch (err) {
            console.error('Failed to stop scanner:', err);
            return { success: false, error: err.message };
        }
    }
    
    handleScan(decodedText, decodedResult) {
        const now = Date.now();
        
        // Debounce: prevent duplicate scans of same barcode
        if (decodedText === this.lastScannedCode && (now - this.lastScanTime) < this.debounceMs) {
            return;
        }
        
        this.lastScannedCode = decodedText;
        this.lastScanTime = now;
        
        // Play beep sound
        this.playBeep();
        
        // Trigger success animation
        this.triggerSuccessAnimation();
        
        // Get format name
        const formatName = this.getFormatName(decodedResult.result.format?.formatName);
        
        // Call success callback
        if (this.onScanSuccess) {
            this.onScanSuccess({
                barcode: decodedText,
                format: formatName,
                timestamp: new Date()
            });
        }
    }
    
    getFormatName(format) {
        const formatMap = {
            'EAN_13': 'EAN-13',
            'EAN_8': 'EAN-8',
            'UPC_A': 'UPC-A',
            'UPC_E': 'UPC-E',
            'CODE_128': 'Code-128',
            'CODE_39': 'Code-39',
            'ITF': 'ITF'
        };
        return formatMap[format] || format || 'Unknown';
    }
    
    playBeep() {
        const beep = document.getElementById('beepSound');
        if (beep) {
            beep.currentTime = 0;
            beep.play().catch(() => {
                // Fallback: use Web Audio API
                this.playBeepFallback();
            });
        } else {
            this.playBeepFallback();
        }
    }
    
    playBeepFallback() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 1200;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.15);
        } catch (e) {
            // Audio not supported
        }
    }
    
    triggerSuccessAnimation() {
        const container = document.querySelector('.scanner-container');
        if (container) {
            container.classList.add('scan-success');
            setTimeout(() => container.classList.remove('scan-success'), 500);
        }
    }
    
    showScanOverlay(show) {
        const overlay = document.querySelector('.scanner-overlay');
        if (overlay) {
            overlay.classList.toggle('active', show);
        }
    }
}

// Export for use in app.js
window.BarcodeScanner = BarcodeScanner;
