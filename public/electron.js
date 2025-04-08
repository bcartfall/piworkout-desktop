/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-01-12
 * See README.md
 */

const path = require('path');
const { app, BrowserWindow, ipcMain, ipcRenderer, shell, Menu, session, screen, } = require('electron');
const isDev = require('electron-is-dev');
const Store = require('electron-store');
const os = require('os');
const spawn = require('child_process').spawn;
const fs = require('fs');

// ES6 syntax: import koffi from 'koffi';
const koffi = require('koffi');
const DWORD = koffi.alias('DWORD', 'uint32_t');
const HANDLE = koffi.pointer('HANDLE', koffi.opaque());
const HWND = koffi.alias('HWND', HANDLE);

// Load the shared library
const libuser32 = koffi.load('user32.dll');
const delay = ms => new Promise(res => setTimeout(res, ms));
const MOUSEEVENTF_LEFTDOWN = 0x0002,
  MOUSEEVENTF_LEFTUP = 0x0004,
  WM_CLOSE = 0x0010,
  APPCOMMAND_VOLUME_MUTE = 0x80000,
  WM_APPCOMMAND = 0x319;


// store
const store = new Store();

// disable smooth scrolling
app.commandLine.appendSwitch('disable-smooth-scrolling', 'true');

async function createWindow() {
  // no menu
  if (!isDev) {
    Menu.setApplicationMenu(null);
  }

  // manage win state from store
  const getWinState = () => {
    const winState = store.get('windowState', {
      x: undefined,
      y: undefined,
      width: 1080,
      height: 768,
    });
    return winState;
  };

  const setWinState = () => {
    const winState = win.getBounds();
    store.set('windowState', winState);
  };

  // Create the browser window.
  const winState = getWinState();
  const win = new BrowserWindow({
    x: winState.x,
    y: winState.y,
    width: winState.width,
    height: winState.height,
    backgroundColor: '#282c34',
    icon: path.join(__dirname, 'logo192.png'),
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.resolve(__dirname, "preload.js"),
    },
  });

  // set win state in setore
  win.on('resize', setWinState);
  win.on('move', setWinState);
  win.on('close', setWinState);

  win.once('ready-to-show', () => {
    win.show();
  });

  // and load the index.html of the app.
  // win.loadFile("index.html");
  win.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../build/index.html')}`
  );
  // Open the DevTools.
  if (isDev) {
    win.webContents.openDevTools({ mode: 'detach' });
  }

  win.on('close', (e) => {
    win.webContents.send('webcontents-app-before-close');
  });

  // load extensions
  /*
  const extPath = path.join(
    os.homedir(),
    'AppData\\Local\\Google\\Chrome\\User Data\\Default\\Extensions\\cjpalhdlnbpafiamejdnhcphjbkeiagm\\1.63.2_0'
  );
  session.defaultSession.loadExtension(extPath);
  */

  // start mark-watch application // todo
  // const proc = cp.spawn('mark-watched.exe');
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require("electron-squirrel-startup")) {
  app.quit();
}

// IPC listener
ipcMain.on('electron-store-get', async (event, key) => {
  event.returnValue = store.get((isDev ? 'dev-' : '') + key);
});
ipcMain.on('electron-store-set', async (event, key, val) => {
  store.set((isDev ? 'dev-' : '') + key, val);
});
ipcMain.on('electron-store-get-cookies', async (event, url) => {
  c = await session.defaultSession.cookies.get({ url: url });
  event.returnValue = c;
});
ipcMain.on('electron-open-external', async (event, path) => {
  shell.openExternal(path);
});
let windowYoutube = null;
ipcMain.on('electron-youtube-login', async (event) => {
  // open browser to log into youtube
  if (windowYoutube) {
    return;
  }
  windowYoutube = new BrowserWindow({
    width: 1024,
    height: 768,
    icon: path.join(__dirname, 'logo192.png'),
  });
  windowYoutube.loadURL('https://www.youtube.com')
  windowYoutube.on("close", () => {
    windowYoutube = null;
  });
});
ipcMain.on('electron-youtube-is-open', async (event) => {
  // check that browser is open
  event.returnValue = !!windowYoutube;
});
ipcMain.on('electron-update-video-positions', async (event, videos) => {
  console.log('updateVideoPositions()');
  const app = path.join('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');

  const SetWindowPos = libuser32.func('__stdcall', 'SetWindowPos', 'bool', ['HWND', 'long', 'int', 'int', 'int', 'int', 'uint']);
  const FindWindowEx = libuser32.func('HWND __stdcall FindWindowExW(HWND hWndParent, HWND hWndChildAfter, const char16_t *lpszClass, const char16_t *lpszWindow)');
  const GetWindowThreadProcessId = libuser32.func('DWORD __stdcall GetWindowThreadProcessId(HWND hWnd, _Out_ DWORD *lpdwProcessId)');
  const GetWindowText = libuser32.func('int __stdcall GetWindowTextA(HWND hWnd, _Out_ uint8_t *lpString, int nMaxCount)');
  const SetCursorPos = libuser32.func('__stdcall', 'SetCursorPos', 'bool', ['int', 'int']);
  const mouse_event = libuser32.func('void __stdcall mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo)');
  const SetActiveWindow = libuser32.func('__stdcall', 'SetActiveWindow', 'HWND', ['HWND']);
  const SendMessageW = libuser32.func('SendMessageW', 'intptr', ['HWND', 'int', 'uint64', 'int64']);
  const GetForegroundWindow = libuser32.func('__stdcall', 'GetForegroundWindow', 'HWND', []);

  let wx = 0, wy = 0;
  const ww = 640, wh = 480;
  const primaryDisplay = screen.getPrimaryDisplay();
  const sw = primaryDisplay.workAreaSize.width;

  let windows = [];

  // mute audio
  const hwnd = GetForegroundWindow();
  SendMessageW(hwnd, WM_APPCOMMAND, koffi.address(hwnd), APPCOMMAND_VOLUME_MUTE);

  let start = 0;
  for (let i in videos) {
    const video = videos[i];
    
    if (video.source !== 'youtube') {
      continue;
    }
    if (video.position <= 1) {
      continue;
    }
    let position = video.position;
    if (position > video.duration - 5) {
      position = video.duration - 5;
    }
    let url = video.url + (video.url.includes('?') ? '&' : '?') + 't=' + Math.round(position);

    const getAllChrome = () => {
      let list = [];
      for (let hwnd = null; ;) {
        hwnd = FindWindowEx(0, hwnd, 'Chrome_WidgetWin_1', null);

        if (!hwnd) {
          break;
        }
  
        // Get PID
        let pid;
        {
          let ptr = [null];
          let tid = GetWindowThreadProcessId(hwnd, ptr);
          if (!tid) {
            // Maybe the process ended in-between?
            continue;
          }
  
          pid = ptr[0];
        }

        // Get window title
        let title;
        {
          let buf = Buffer.allocUnsafe(1024);
          let length = GetWindowText(hwnd, buf, buf.length);

          if (!length) {
            // Maybe the process ended in-between?
            continue;
          }

          title = koffi.decode(buf, 'char', length);
        }

        list.push({
          hwnd,
          pid,
          title,
        });
      
      }

      return list;
    };

    let bList = getAllChrome();

    let r = spawn(app, [url, '--new-window', '--mute-audio', '--autoplay-policy=no-user-gesture-required']);
    console.log(`Launching chrome ${url}, pid=${r.pid}`);

    // wait for a new pid to spawn
    let aList;
    while (true) {
      aList = getAllChrome();
      if (aList.length != bList.length) {
        break;
      }
      await delay(1); // wait 1ms and check again
    }

    // new window
    let nItem = null;
    for (let item of aList) {
      let found = false;
      for (let item2 of bList) {
        if (koffi.address(item.hwnd) === koffi.address(item2.hwnd)) {
          found = true;
          break;
        }
      }
      if (!found) {
        nItem = item;
        break;
      }
    }
    if (!nItem) {
      continue;
    }
    console.log('new window = ' + nItem.title, nItem.pid);

    console.log(`Moving ${nItem.title} to ${wx},${wy}`);
    SetWindowPos(nItem.hwnd, 0, wx, wy, ww, wh, 0x4000 | 0x0020 | 0x0020 | 0x0040);
    windows.push({
      hwnd: nItem.hwnd,
      wx,
      wy,
    });

    wx += ww;
    if (wx + ww > sw) {
      // overflow to new row
      wx = 0;
      wy += wh;
    }
    if (i === 0) {
      start = Date.now;
    }
  }

  // wait for youtube to finish loading
  await delay(3000);

  start = Date.now;
  for (let w of windows) {
    let x = w.wx + 320, y = w.wy + 384;
    SetActiveWindow(w.hwnd);
    console.log('Clicking at ', x, y);
    SetCursorPos(x, y);
    mouse_event(MOUSEEVENTF_LEFTDOWN | MOUSEEVENTF_LEFTUP, x, y, 0, 0);
    await delay(500);
  }

  // play for some time
  await delay(1000);

  // click to pause
  for (let w of windows) {
    let x = w.wx + 320, y = w.wy + 384;
    SetActiveWindow(w.hwnd);
    console.log('Clicking at ', x, y);
    SetCursorPos(x, y);
    mouse_event(MOUSEEVENTF_LEFTDOWN | MOUSEEVENTF_LEFTUP, x, y, 0, 0);
    await delay(500);
  }

  // wait for some time
  await delay(3000);

  // close windows
  for (let w of windows) {
    console.log('Closing window', koffi.address(w.hwnd));
    SendMessageW(w.hwnd, WM_CLOSE, 0, 0);
  }

  // unmute
  SendMessageW(hwnd, WM_APPCOMMAND, koffi.address(hwnd), APPCOMMAND_VOLUME_MUTE);
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Support self signed certificates
// NOTE: This is not safe. If you're using this app over the internet it is 
// recommended this code is removed and a valid SSL/TLS certificate is used.
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  // disable default browser behaviour (stopping)
  event.preventDefault();
  // continue
  callback(true);
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});