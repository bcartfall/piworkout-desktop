/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-01-12
 * See README.md
 */

const zlib = require('zlib');
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
const libgdi32 = koffi.load('gdi32.dll');
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

const projectDir = app.getPath('userData');

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
  // const winState = getWinState(); // let windows handle position
  const win = new BrowserWindow({
    //x: winState.x, 
    //y: winState.y,
    //width: winState.width,
    //height: winState.height,
    show: false,
    backgroundColor: '#282c34',
    icon: path.join(__dirname, 'logo192.png'),
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.resolve(__dirname, "preload.js"),
    },
  });
  win.maximize();
  win.show();

  // set win state in setore
  //win.on('resize', setWinState);
  //win.on('move', setWinState);
  //win.on('close', setWinState);

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
  const chromeApp = path.join('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');
  //const firefoxApp = path.join('C:\\Program Files\\Mozilla Firefox\\firefox.exe');

  const SetWindowPos = libuser32.func('__stdcall', 'SetWindowPos', 'bool', ['HWND', 'long', 'int', 'int', 'int', 'int', 'uint']);
  //const MoveWindow = libuser32.func('__stdcall', 'MoveWindow', 'bool', ['HWND', 'int', 'int', 'int', 'int', 'bool']);
  const ShowWindow = libuser32.func('__stdcall', 'ShowWindow', 'bool', ['HWND', 'int']);
  const FindWindowEx = libuser32.func('HWND __stdcall FindWindowExW(HWND hWndParent, HWND hWndChildAfter, const char16_t *lpszClass, const char16_t *lpszWindow)');
  const GetWindowThreadProcessId = libuser32.func('DWORD __stdcall GetWindowThreadProcessId(HWND hWnd, _Out_ DWORD *lpdwProcessId)');
  const GetWindowText = libuser32.func('int __stdcall GetWindowTextA(HWND hWnd, _Out_ uint8_t *lpString, int nMaxCount)');
  const SetCursorPos = libuser32.func('__stdcall', 'SetCursorPos', 'bool', ['int', 'int']);
  const mouse_event = libuser32.func('void __stdcall mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo)');
  const SetActiveWindow = libuser32.func('__stdcall', 'SetActiveWindow', 'HWND', ['HWND']);
  const SendMessageW = libuser32.func('SendMessageW', 'intptr', ['HWND', 'int', 'uint64', 'int64']);
  const GetForegroundWindow = libuser32.func('__stdcall', 'GetForegroundWindow', 'HWND', []);
  const GetDC = libuser32.func('GetDC', 'HWND', ['HWND']);
  const ReleaseDC = libuser32.func('ReleaseDC', 'int', ['HWND', 'HWND']);
  const GetSystemMetrics = libuser32.func('int __stdcall GetSystemMetrics(int nIndex)');
  const CreateCompatibleDC = libgdi32.func('HWND __stdcall CreateCompatibleDC(HWND hDC)');
  const CreateCompatibleBitmap = libgdi32.func('HWND __stdcall CreateCompatibleBitmap(HWND hDC, int cx, int cy)');
  const SelectObject = libgdi32.func('HWND __stdcall SelectObject(HWND hDC, HWND h)');
  const BitBlt = libgdi32.func('bool __stdcall BitBlt(HWND hdcDest, int nXDest, int nYDest, int nWidth, int nHeight, HWND hdcSrc, int nXSrc, int nYSrc, uint32 dwRop)');
  const GetDIBits = libgdi32.func('int __stdcall GetDIBits(HWND hdc, HWND hbmp, uint uStartScan, uint cScanLines, HWND lpvBits, HWND lpbi, uint uUsage)');
  const DeleteObject = libgdi32.func('bool __stdcall DeleteObject(HWND ho)');
  const DeleteDC = libgdi32.func('bool __stdcall DeleteDC(HWND hdc)');

  function getPixelColor(pixelBuffer, x, y, width, height) {
    const targetX = x;
    const targetY = y;

    // Ensure the coordinates are within bounds
    if (targetX >= 0 && targetX < width && targetY >= 0 && targetY < height) {

      // Calculate the buffer offset for the target pixel
      const offset = (targetY * width + targetX) * 4;

      // Read the BGRA values from the buffer
      const blue = pixelBuffer.readUInt8(offset);
      const green = pixelBuffer.readUInt8(offset + 1);
      const red = pixelBuffer.readUInt8(offset + 2);
      const alpha = pixelBuffer.readUInt8(offset + 3); // Usually 255 or 0 depending on the source Windows DC
      return [red, green, blue, alpha];
    }
    return [0, 0, 0, 0];
  }

  function captureWindowBitmap(w, savePng) {
    const physicalX = w.wx; //Math.round(w.wx * scale);
    const physicalY = w.wy; //Math.round(w.wy * scale);
    const physicalW = w.ww; //Math.round(w.ww * scale);
    const physicalH = w.wh; //Math.round(w.wh * scale);

    // Setup Device Contexts
    const hdcScreen = GetDC(null);
    const hdcMem = CreateCompatibleDC(hdcScreen);
    const hBitmap = CreateCompatibleBitmap(hdcScreen, physicalW, physicalH);

    // Select the bitmap into our memory DC
    const hOldObj = SelectObject(hdcMem, hBitmap);

    // BitBlt copies the screen data into our memory bitmap
    const SRCCOPY = 0x00CC0020;
    BitBlt(hdcMem, 0, 0, physicalW, physicalH, hdcScreen, physicalX, physicalY, SRCCOPY);

    // 4. Set up the Bitmap Info Header structure (40 bytes)
    const biHeader = Buffer.alloc(40);
    biHeader.writeUInt32LE(40, 0);        // biSize
    biHeader.writeInt32LE(physicalW, 4);      // biWidth
    biHeader.writeInt32LE(-physicalH, 8);    // biHeight (Negative for top-down BMP format)
    biHeader.writeUInt16LE(1, 12);        // biPlanes
    biHeader.writeUInt16LE(32, 14);       // biBitCount (32-bit RGBA)
    biHeader.writeUInt32LE(0, 16);        // biCompression (BI_RGB = no compression)

    // Allocate buffer for raw pixel data (Width * Height * 4 bytes per pixel)
    const pixelBufferSize = physicalW * physicalH * 4;
    const pixelBuffer = Buffer.alloc(pixelBufferSize);

    // Extract raw bits from the Windows bitmap object into our Node.js buffer
    const DIB_RGB_COLORS = 0;
    GetDIBits(hdcMem, hBitmap, 0, physicalH, pixelBuffer, biHeader, DIB_RGB_COLORS);

    // Cleanup Windows memory hooks immediately to prevent leaks
    SelectObject(hdcMem, hOldObj);
    DeleteObject(hBitmap);
    DeleteDC(hdcMem);
    ReleaseDC(null, hdcScreen);

    if (savePng) {
      // Windows GDI returns pixels in BGRA order — swap to RGBA for PNG
      const rgbaBuffer = Buffer.alloc(pixelBufferSize);
      for (let i = 0; i < pixelBufferSize; i += 4) {
        rgbaBuffer[i] = pixelBuffer[i + 2]; // R ← B
        rgbaBuffer[i + 1] = pixelBuffer[i + 1]; // G ← G
        rgbaBuffer[i + 2] = pixelBuffer[i];     // B ← R
        rgbaBuffer[i + 3] = pixelBuffer[i + 3]; // A ← A
      }

      // PNG filter byte (0 = None) prepended to each row
      const stride = physicalW * 4;
      const filtered = Buffer.alloc((stride + 1) * physicalH);
      for (let row = 0; row < physicalH; row++) {
        filtered[row * (stride + 1)] = 0; // filter type: None
        rgbaBuffer.copy(filtered, row * (stride + 1) + 1, row * stride, (row + 1) * stride);
      }

      const compressed = zlib.deflateSync(filtered, { level: 6 });

      function pngChunk(type, data) {
        const buf = Buffer.alloc(4 + 4 + data.length + 4);
        buf.writeUInt32BE(data.length, 0);
        buf.write(type, 4, 'ascii');
        data.copy(buf, 8);
        // CRC covers type + data
        const crc = crc32(buf.slice(4, 8 + data.length));
        buf.writeUInt32BE(crc, 8 + data.length);
        return buf;
      }

      // CRC-32 implementation
      const crcTable = (() => {
        const t = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
          let c = i;
          for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
          t[i] = c;
        }
        return t;
      })();

      function crc32(buf) {
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
        return (crc ^ 0xFFFFFFFF) >>> 0;
      }

      // IHDR: width, height, bit depth, color type (2=RGB, 6=RGBA), compression, filter, interlace
      const ihdr = Buffer.alloc(13);
      ihdr.writeUInt32BE(physicalW, 0);
      ihdr.writeUInt32BE(physicalH, 4);
      ihdr[8] = 8; // bit depth
      ihdr[9] = 6; // color type: RGBA
      ihdr[10] = 0; // compression
      ihdr[11] = 0; // filter
      ihdr[12] = 0; // interlace

      const png = Buffer.concat([
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
        pngChunk('IHDR', ihdr),
        pngChunk('IDAT', compressed),
        pngChunk('IEND', Buffer.alloc(0)),
      ]);

      const fileName = `video-positions-${windowIndex}-${captureIndex}.png`;
      const fullPath = path.join(projectDir, fileName);
      fs.writeFileSync(fullPath, png);
      console.log(`Saved PNG to ${fullPath}`);
    }

    return { pixelBuffer, width: physicalW, height: physicalH };
  }

  let wx = 0, wy = 0;
  const ww = 800, wh = 600;
  const primaryDisplay = screen.getPrimaryDisplay();
  const scale = primaryDisplay.scaleFactor;
  const sw = primaryDisplay.workAreaSize.width * scale,
    sh = primaryDisplay.workAreaSize.height * scale;
  console.log('Total screen area = ' + sw  + 'x' + sh);

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
    let position = Math.max(0, video.position - 30);
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

    let r = spawn(chromeApp, [url, '--new-window', '--mute-audio']); // '--autoplay-policy=no-user-gesture-required'
    //let r = spawn(chromeApp, ['--new-window', '--app="data:text/html,<html><body><script>window.moveTo(580,240);window.resizeTo(800,600);window.location=\'http://www.test.de\';</script></body></html>"', '--autoplay-policy=no-user-gesture-required']);

    /*
    // get output of process
    r.stdout.setEncoding('utf8');
    r.stdout.on('data', function(data) {
        //Here is where the output goes

        console.log('stdout: ' + data);

        data=data.toString();
        console.log(data);
    });

    r.stderr.setEncoding('utf8');
    r.stderr.on('data', function(data) {
        //Here is where the error output goes

        console.log('stderr: ' + data);

        data=data.toString();
        console.log(data);
    });
    r.on('close', function(code) {
        //Here you can get the exit code of the script
        console.log('closing code: ' + code);
    });
    */

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
    console.log('new window = ' + nItem.title, 'pid=' + nItem.pid);

    console.log(`Moving title=${nItem.title} to ${wx},${wy}`);

    await delay(250);
    ShowWindow(nItem.hwnd, 1); // SW_SHOWNORMAL

    await delay(250);
    SetWindowPos(nItem.hwnd, 0, wx, wy, ww, wh, 0x4000 | 0x0020 | 0x0020 | 0x0040);

    windows.push({
      hwnd: nItem.hwnd,
      wx,
      wy,
      ww,
      wh,
      isReady: false, // video has loaded and is ready to click to play
      isPlaying: false, // video is playing
      offsetX: -1,
    });

    wx += ww;
    if (wx + ww > sw) {
      // overflow to new row
      wx = 0;
      wy += wh;
    }
    if (wy + wh > sh) {
      console.log('New window higher than screen height.');
      break;
    }
    if (i === 0) {
      start = Date.now;
    }
  }

  // await delay(1000);

  // keep track of when it finished setting up windows
  let now = Date.now(); // ms timestamp

  // wait for youtube to finish loading
  let windowIndex = 0, captureIndex = 0;
  while (captureIndex < 30) { // wait up to 30s for videos to be ready
    windowIndex = -1;
    for (let w of windows) {
      windowIndex++;

      if (w.isReady) {
        continue; // already ready
      }
      const { pixelBuffer, width, height } = captureWindowBitmap(w, true);

      // get first white pixel to define where window is located. sometimes it's offset more (for reasons unknown)
      if (w.offsetX === -1) {
        let checkX = 0, offsetX = 0;
        while (checkX < width) {
          const rgba = getPixelColor(pixelBuffer, checkX, 262, width, height);
          if (rgba[0] === 255 && rgba[1] === 255 && rgba[2] === 255) {
            console.log(`Found offsetX=${checkX}, windowIndex=${windowIndex}, captureIndex=${captureIndex}`)
            offsetX = checkX;
            w.offsetX = offsetX;
            break;
          }
          checkX++; 
        }
      }

      const headerRGBA = getPixelColor(pixelBuffer, 130 + w.offsetX, 262, width, height);
      console.log(`Getting header pixel at (${130 + w.offsetX},262), color=${headerRGBA}, windowIndex=${windowIndex}, captureIndex=${captureIndex}`);

      const playButtonRGBA = getPixelColor(pixelBuffer, 420 + w.offsetX, 421, width, height);
      console.log(`Getting play button pixel at (${420 + w.offsetX},421), color=${playButtonRGBA}, windowIndex=${windowIndex}, captureIndex=${captureIndex}`);

      if (
        (
          headerRGBA[0] === 255
          && headerRGBA[1] === 0
          && headerRGBA[2] === 51
        ) && (
          playButtonRGBA[0] === 255
          && playButtonRGBA[1] === 255
          && playButtonRGBA[2] === 255
        )
      ) {
        w.isReady = true;
        continue;
      }
    }

    if (windows.every(w => w.isReady)) {
      // all windows are ready
      break;
    };
    await delay(1000);

    captureIndex++;
  }

  // click on start
  console.log('Clicking on all windows to start playing');
  start = Date.now;
  for (let w of windows) {
    let x = w.wx + 320, y = w.wy + 384;
    SetActiveWindow(w.hwnd);
    console.log('Clicking at ', x, y);
    SetCursorPos(x, y);
    mouse_event(MOUSEEVENTF_LEFTDOWN | MOUSEEVENTF_LEFTUP, x, y, 0, 0);
    await delay(500);
  }

  // wait for videos to play
  console.log('Waiting for all windows to start playing');
  captureIndex = 0;
  while (captureIndex < 120) { // wait up to 120s for videos to play
    windowIndex = -1;
    for (let w of windows) {
      windowIndex++;

      if (w.isPlaying) {
        continue; // already playing
      }
      const { pixelBuffer, width, height } = captureWindowBitmap(w, true);

      const playButtonRGBA = getPixelColor(pixelBuffer, 420 + w.offsetX, 421, width, height);
      console.log(`Getting play button pixel at (${420 + w.offsetX},421), color=${playButtonRGBA}, windowIndex=${windowIndex}, captureIndex=${captureIndex}`);

      if (
        playButtonRGBA[0] !== 255
        && playButtonRGBA[1] !== 255
        && playButtonRGBA[2] !== 255
      ) {
        // not white
        w.isPlaying = true;
        continue;
      }
    }

    if (windows.every(w => w.isPlaying)) {
      // all windows are playing
      break;
    };
    await delay(1000);

    captureIndex++;
  }

  console.log('Playing for some time.');
  await delay(10000); // play for some time

  // click to pause
  console.log('Clicking on all windows to pause');
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
  await delay(500);

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