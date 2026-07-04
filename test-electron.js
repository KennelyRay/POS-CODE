const { app, BrowserWindow } = require('electron');

app.whenReady().then(() => {
  const win = new BrowserWindow();
  win.loadURL('about:blank');
  win.webContents.on('did-finish-load', () => {
    console.log('typeof getPrinters:', typeof win.webContents.getPrinters);
    if (typeof win.webContents.getPrinters === 'function') {
      const printers = win.webContents.getPrinters();
      console.log('Detected printers:', printers);
    } else {
      console.log('getPrinters is NOT a function');
    }
    app.quit();
  });
});