// Native Bridge for XenEngine
// This module bridges the custom Chromium C++ engine with Electron

const path = require('path');
const fs = require('fs');

let nativeEngine = null;

class NativeBridge {
    constructor() {
        this.engine = null;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            // Try to load the native module
            const nativeModulePath = path.join(__dirname, '..', 'build', 'Release', 'xen_engine.node');
            
            if (fs.existsSync(nativeModulePath)) {
                this.engine = require(nativeModulePath);
                this.engine.initialize();
                this.isInitialized = true;
                console.log('Native Chromium engine loaded successfully');
                return true;
            } else {
                console.log('Native module not found, running in compatibility mode');
                return false;
            }
        } catch (error) {
            console.error('Failed to load native engine:', error);
            return false;
        }
    }

    async cleanup() {
        if (this.engine && this.isInitialized && this.engine.cleanup) {
            try {
                this.engine.cleanup();
                this.isInitialized = false;
                console.log('Native engine cleaned up');
            } catch (error) {
                console.error('Failed to cleanup native engine:', error);
            }
        }
    }

    navigate(tabId, url) {
        if (this.engine && this.isInitialized) {
            return this.engine.navigate(tabId, url);
        }
        console.log(`Navigating tab ${tabId} to ${url} (compatibility mode)`);
        return true;
    }

    createTab(url) {
        if (this.engine && this.isInitialized) {
            return this.engine.createTab(url);
        }
        console.log(`Creating tab for ${url} (compatibility mode)`);
        return { id: Date.now(), url };
    }

    closeTab(tabId) {
        if (this.engine && this.isInitialized) {
            return this.engine.closeTab(tabId);
        }
        console.log(`Closing tab ${tabId} (compatibility mode)`);
        return true;
    }

    getTabs() {
        if (this.engine && this.isInitialized) {
            return this.engine.getTabs();
        }
        console.log('Getting tabs (compatibility mode)');
        return [];
    }

    executeScript(tabId, script) {
        if (this.engine && this.isInitialized && this.engine.executeScript) {
            return this.engine.executeScript(tabId, script);
        }
        console.log(`Executing script in tab ${tabId} (compatibility mode)`);
        return true;
    }
}

// Singleton instance
const bridge = new NativeBridge();

module.exports = bridge;
