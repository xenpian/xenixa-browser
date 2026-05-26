// Xenixa Browser — Webview Preload Script
// Bu script her webview içinde yüklenir ve alert/confirm/prompt'u Xenixa'nın
// kendi özel dialog UI'sine yönlendirir.

const { ipcRenderer } = require('electron');

let dialogPort = null;
try {
    dialogPort = ipcRenderer.sendSync('get-dialog-port');
} catch (e) {
    console.error("Failed to get dialog port:", e);
}

function showCustomDialog(type, message, defaultValue = '') {
    if (!dialogPort) {
        console.warn(`Dialog blocked (no port): [${type}] ${message}`);
        return type === 'confirm' ? false : (type === 'prompt' ? null : undefined);
    }
    try {
        const xhr = new XMLHttpRequest();
        // 127.0.0.1 kullanarak DNS çözümleme gecikmelerini önle
        xhr.open('POST', `http://127.0.0.1:${dialogPort}/dialog`, false); // sync!
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify({
            type,
            message: message != null ? String(message) : '',
            defaultValue: defaultValue != null ? String(defaultValue) : ''
        }));
        
        if (xhr.status === 200) {
            const res = JSON.parse(xhr.responseText);
            return res.result;
        }
    } catch (e) {
        console.error("Failed to show custom dialog via HTTP sync XHR:", e);
    }
    return type === 'confirm' ? false : (type === 'prompt' ? null : undefined);
}

window.alert = function(message) {
    showCustomDialog('alert', message);
};

window.confirm = function(message) {
    const result = showCustomDialog('confirm', message);
    return result === true;
};

window.prompt = function(message, defaultValue) {
    const result = showCustomDialog('prompt', message, defaultValue);
    return result; // string veya null döner
};

function getRemotePermissionState(permission) {
    if (!dialogPort) return 'prompt';
    try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `http://127.0.0.1:${dialogPort}/permission-state`, false); // sync!
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify({
            origin: window.location.origin,
            permission: permission
        }));
        if (xhr.status === 200) {
            const res = JSON.parse(xhr.responseText);
            return res.state; // 'granted', 'denied', or 'prompt'
        }
    } catch (e) {
        console.error("Failed to get remote permission state:", e);
    }
    return 'prompt';
}

// Override Notification
const OriginalNotification = window.Notification;
if (OriginalNotification) {
    class CustomNotification extends OriginalNotification {
        constructor(title, options) {
            const state = getRemotePermissionState('notifications');
            if (state === 'granted') {
                super(title, options);
            } else {
                console.warn('Notification permission is not granted (current state: ' + state + ')');
            }
        }
    }

    // Copy static methods and properties from original Notification
    Object.getOwnPropertyNames(OriginalNotification).forEach(prop => {
        if (prop !== 'prototype' && prop !== 'permission' && prop !== 'requestPermission') {
            try {
                Object.defineProperty(CustomNotification, prop, Object.getOwnPropertyDescriptor(OriginalNotification, prop));
            } catch (e) {}
        }
    });

    Object.defineProperty(CustomNotification, 'permission', {
        get() {
            const state = getRemotePermissionState('notifications');
            // Map 'prompt' to 'default' for web compatibility
            return state === 'prompt' ? 'default' : state;
        },
        configurable: true
    });

    CustomNotification.requestPermission = function(callback) {
        return new Promise((resolve) => {
            const state = getRemotePermissionState('notifications');
            if (state !== 'prompt') {
                const finalState = state === 'prompt' ? 'default' : state;
                if (callback) callback(finalState);
                resolve(finalState);
                return;
            }

            // Call native requestPermission, which triggers main process request handler
            OriginalNotification.requestPermission().then(nativeRes => {
                if (callback) callback(nativeRes);
                resolve(nativeRes);
            }).catch(err => {
                if (callback) callback('denied');
                resolve('denied');
            });
        });
    };

    window.Notification = CustomNotification;
}

// Override navigator.permissions.query
if (navigator.permissions && navigator.permissions.query) {
    const originalQuery = navigator.permissions.query;
    navigator.permissions.query = function(descriptor) {
        if (descriptor && descriptor.name) {
            const name = descriptor.name;
            let registryKey = name;
            if (name === 'camera') registryKey = 'camera';
            else if (name === 'microphone') registryKey = 'microphone';
            else if (name === 'geolocation') registryKey = 'geolocation';
            else if (name === 'notifications') registryKey = 'notifications';
            else if (name === 'midi') registryKey = 'midiSysex';

            const state = getRemotePermissionState(registryKey);
            return Promise.resolve({
                state: state,
                name: name,
                onchange: null,
                addEventListener: () => {},
                removeEventListener: () => {},
                dispatchEvent: () => false
            });
        }
        return originalQuery.call(navigator.permissions, descriptor);
    };
}
