/**
 * Barcode Scanner App
 * Main application logic
 */

class App {
    constructor() {
        this.scannedItems = [];
        this.scanner = null;

        // DOM Elements
        this.elements = {
            startBtn: document.getElementById('startBtn'),
            stopBtn: document.getElementById('stopBtn'),
            exportBtn: document.getElementById('exportBtn'),
            clearBtn: document.getElementById('clearBtn'),
            scanList: document.getElementById('scanList'),
            itemCount: document.getElementById('itemCount'),
            lastScan: document.getElementById('lastScan'),
            lastScanValue: document.querySelector('.scan-value')
        };

        this.init();
    }

    init() {
        // Initialize scanner
        this.scanner = new BarcodeScanner('reader', (data) => this.handleScanSuccess(data));

        // Bind event listeners
        this.elements.startBtn.addEventListener('click', () => this.startScanner());
        this.elements.stopBtn.addEventListener('click', () => this.stopScanner());
        this.elements.exportBtn.addEventListener('click', () => this.exportCSV());
        this.elements.clearBtn.addEventListener('click', () => this.clearAll());

        // Load saved items from localStorage
        this.loadFromStorage();
    }

    async startScanner() {
        const result = await this.scanner.start();

        if (result.success) {
            this.elements.startBtn.disabled = true;
            this.elements.stopBtn.disabled = false;
        } else {
            alert('Failed to start camera. Please ensure camera permission is granted.\n\nError: ' + result.error);
        }
    }

    async stopScanner() {
        await this.scanner.stop();
        this.elements.startBtn.disabled = false;
        this.elements.stopBtn.disabled = true;
    }

    handleScanSuccess(data) {
        // Check if barcode already exists
        const existingItem = this.scannedItems.find(item => item.barcode === data.barcode);

        if (existingItem) {
            // Increment quantity for existing item
            existingItem.quantity = (existingItem.quantity || 1) + 1;
            existingItem.lastScanned = data.timestamp.toISOString();
            existingItem.lastDisplayTime = this.formatTime(data.timestamp);
        } else {
            // Add new item with quantity 1
            const item = {
                id: Date.now(),
                barcode: data.barcode,
                format: data.format,
                quantity: 1,
                timestamp: data.timestamp.toISOString(),
                displayTime: this.formatTime(data.timestamp),
                lastScanned: data.timestamp.toISOString(),
                lastDisplayTime: this.formatTime(data.timestamp)
            };

            this.scannedItems.unshift(item); // Add to beginning
        }

        // Update UI
        this.updateLastScan(data.barcode);
        this.renderList();
        this.updateButtons();

        // Save to localStorage
        this.saveToStorage();
    }

    updateLastScan(barcode) {
        this.elements.lastScan.classList.remove('hidden');
        this.elements.lastScanValue.textContent = barcode;

        // Trigger animation
        this.elements.lastScan.style.animation = 'none';
        setTimeout(() => {
            this.elements.lastScan.style.animation = 'fadeIn 0.3s ease';
        }, 10);
    }

    renderList() {
        if (this.scannedItems.length === 0) {
            this.elements.scanList.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📦</span>
                    <p>No items scanned yet</p>
                    <p class="empty-hint">Start the scanner and point at a barcode</p>
                </div>
            `;
        } else {
            this.elements.scanList.innerHTML = this.scannedItems.map((item, index) => {
                const qty = item.quantity || 1;
                return `
                <div class="scan-item" data-id="${item.id}">
                    <span class="scan-item-number">${this.scannedItems.length - index}</span>
                    <div class="scan-item-content">
                        <div class="scan-item-barcode">${item.barcode}</div>
                        <div class="scan-item-meta">
                            <span>📊 ${item.format}</span>
                            <span>🕐 ${item.displayTime}</span>
                        </div>
                    </div>
                    <div class="scan-item-quantity">
                        <button class="qty-btn qty-minus" onclick="app.updateItemQuantity(${item.id}, -1)" title="Decrease">−</button>
                        <span class="qty-value">${qty}</span>
                        <button class="qty-btn qty-plus" onclick="app.updateItemQuantity(${item.id}, 1)" title="Increase">+</button>
                    </div>
                    <button class="scan-item-delete" onclick="app.deleteItem(${item.id})" title="Delete">
                        ✕
                    </button>
                </div>
            `}).join('');
        }

        // Update count - show total quantity
        const totalItems = this.scannedItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
        const uniqueItems = this.scannedItems.length;
        this.elements.itemCount.textContent = `${totalItems} item${totalItems !== 1 ? 's' : ''} (${uniqueItems} unique)`;
    }

    updateItemQuantity(id, delta) {
        const item = this.scannedItems.find(item => item.id === id);
        if (item) {
            item.quantity = (item.quantity || 1) + delta;

            if (item.quantity <= 0) {
                // Remove item if quantity reaches 0
                this.scannedItems = this.scannedItems.filter(i => i.id !== id);
            }

            this.renderList();
            this.updateButtons();
            this.saveToStorage();

            if (this.scannedItems.length === 0) {
                this.elements.lastScan.classList.add('hidden');
            }
        }
    }

    deleteItem(id) {
        this.scannedItems = this.scannedItems.filter(item => item.id !== id);
        this.renderList();
        this.updateButtons();
        this.saveToStorage();

        if (this.scannedItems.length === 0) {
            this.elements.lastScan.classList.add('hidden');
        }
    }

    clearAll() {
        if (confirm('Are you sure you want to clear all scanned items?')) {
            this.scannedItems = [];
            this.renderList();
            this.updateButtons();
            this.saveToStorage();
            this.elements.lastScan.classList.add('hidden');
        }
    }

    updateButtons() {
        const hasItems = this.scannedItems.length > 0;
        this.elements.exportBtn.disabled = !hasItems;
        this.elements.clearBtn.disabled = !hasItems;
    }

    exportCSV() {
        if (this.scannedItems.length === 0) {
            alert('No items to export!');
            return;
        }

        // Create CSV content with quantity
        const headers = ['No', 'Barcode', 'Format', 'Quantity', 'First Scanned', 'Last Scanned'];
        const rows = this.scannedItems.map((item, index) => [
            index + 1,
            item.barcode,
            item.format,
            item.quantity || 1,
            item.timestamp,
            item.lastScanned || item.timestamp
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const filename = `barcode_scan_${this.formatDateForFilename(new Date())}.csv`;

        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(link.href);
    }

    formatTime(date) {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    }

    formatDateForFilename(date) {
        return date.toISOString().slice(0, 19).replace(/[T:]/g, '-');
    }

    saveToStorage() {
        try {
            localStorage.setItem('scannedItems', JSON.stringify(this.scannedItems));
        } catch (e) {
            console.warn('Failed to save to localStorage:', e);
        }
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem('scannedItems');
            if (saved) {
                this.scannedItems = JSON.parse(saved);
                this.renderList();
                this.updateButtons();

                if (this.scannedItems.length > 0) {
                    this.updateLastScan(this.scannedItems[0].barcode);
                }
            }
        } catch (e) {
            console.warn('Failed to load from localStorage:', e);
        }
    }
}

// Initialize app when DOM is ready
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new App();
});
