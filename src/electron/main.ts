import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Initialize environment variables from .env
dotenv.config();

let mainWindow: BrowserWindow | null = null;

// Select port for Express backend from env or default
const backendPort = process.env.PORT || 5000;
process.env.PORT = String(backendPort);

// Set SQLite database path (prioritize env in dev/packaged if configured, fallback to app userData in production)
const dbPathFromEnv = process.env.DB_PATH;
const userDataPath = app.getPath('userData');
process.env.DB_PATH = dbPathFromEnv || path.join(userDataPath, 'DATA.sqlite');
console.log('Database path:', process.env.DB_PATH);

// Login tokens are signed with a secret that is random per install and kept in the
// user data folder, so it survives restarts but is never the same on two PCs.
if (!process.env.JWT_SECRET) {
  const secretFile = path.join(userDataPath, 'jwt-secret.txt');
  if (!fs.existsSync(secretFile)) {
    fs.mkdirSync(userDataPath, { recursive: true });
    fs.writeFileSync(secretFile, crypto.randomBytes(32).toString('hex'));
  }
  process.env.JWT_SECRET = fs.readFileSync(secretFile, 'utf8').trim();
}

// Start Express Server
import '../backend/index';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    show: false,
    title: 'TexFin - Ledger',
    icon: path.join(__dirname, '..', '..', 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    frame: true,
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    // Load local Vite dev server
    mainWindow.loadURL('http://localhost:3000');
  } else {
    // Load compiled frontend from production dist
    mainWindow.loadFile(path.join(__dirname, '..', '..', 'frontend', 'index.html'));
  }

  // The UI is laid out for 1366px. On narrower windows, scale the whole page down
  // instead of letting the layout squeeze, so every screen looks the same.
  const DESIGN_WIDTH = 1366;
  const fitZoom = () => {
    if (!mainWindow) return;
    const { width } = mainWindow.getContentBounds();
    mainWindow.webContents.setZoomFactor(Math.min(1, width / DESIGN_WIDTH));
  };
  mainWindow.on('resize', fitZoom);
  mainWindow.webContents.on('did-finish-load', fitZoom);
  mainWindow.once('ready-to-show', () => {
    mainWindow?.maximize();
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.on('close-app', () => {
  app.quit();
});
