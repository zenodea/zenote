const path = require("node:path");
const { app, BrowserWindow, session, shell } = require("electron");

const APP_URL = process.env.ZENOTE_URL ?? "http://localhost:3000";
const ORIGIN = new URL(APP_URL).origin;

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    icon: path.join(__dirname, "build", "icon.png"),
    webPreferences: {
      partition: "persist:zenote",
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  window.webContents.on("will-navigate", (event, url) => {
    if (new URL(url).origin !== ORIGIN) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  window.loadURL(APP_URL);
}

app.whenReady().then(() => {
  session
    .fromPartition("persist:zenote")
    .webRequest.onBeforeSendHeaders((details, callback) => {
      details.requestHeaders["x-zenote-desktop"] = "1";
      callback({ requestHeaders: details.requestHeaders });
    });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
