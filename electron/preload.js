const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Tab management
    createTab: (url) => ipcRenderer.invoke('create-tab', url),
    closeTab: (tabId) => ipcRenderer.invoke('close-tab', tabId),
    switchTab: (tabId) => ipcRenderer.invoke('switch-tab', tabId),
    getTabs: () => ipcRenderer.invoke('get-tabs'),
    
    // Navigation
    navigate: (tabId, url) => ipcRenderer.invoke('navigate', { tabId, url }),
    
    // Window controls
    minimizeWindow: () => ipcRenderer.send('window-minimize'),
    maximizeWindow: () => ipcRenderer.send('window-maximize'),
    closeWindow: () => ipcRenderer.send('window-close'),
    
    // Native engine
    initializeEngine: () => ipcRenderer.invoke('initialize-engine'),
    
    // Event listeners
    onTabCreated: (callback) => ipcRenderer.on('tab-created', callback),
    onTabClosed: (callback) => ipcRenderer.on('tab-closed', callback),
    onTabSwitched: (callback) => ipcRenderer.on('tab-switched', callback),
    onNavigated: (callback) => ipcRenderer.on('navigated', callback),
    
    // Remove listeners
    removeAllListeners: () => ipcRenderer.removeAllListeners('tab-created')
        .removeAllListeners('tab-closed')
        .removeAllListeners('tab-switched')
        .removeAllListeners('navigated')
});
