/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-01-12
 * See README.md
 */

const { contextBridge, ipcRenderer } = require('electron');

let appOnBeforeClose = () => {};

contextBridge.exposeInMainWorld('electron', {
  store: {
    get(key) {
      return ipcRenderer.sendSync('electron-store-get', key);
    },
    set(property, val) {
      ipcRenderer.send('electron-store-set', property, val);
    },
    getCookies(url) {
      return ipcRenderer.sendSync('electron-store-get-cookies', url);
    }
  },
  shell: {
    openExternal(path) {
      ipcRenderer.send('electron-open-external', path);
    },
  },
  app: {
    onBeforeClose(callback) {
      appOnBeforeClose = callback;
    },
    updateVideoPositions(videos) {
      // open urls in chrome browser to update youtube position
      ipcRenderer.send('electron-update-video-positions', videos);
    },
  },
  youtube: {
    login() {
      return ipcRenderer.send('electron-youtube-login');
    },
    isOpen() {
      return ipcRenderer.sendSync('electron-youtube-is-open');
    }
  }
});

// catch events from main
ipcRenderer.on('webcontents-app-before-close', _ => {
  appOnBeforeClose();
});