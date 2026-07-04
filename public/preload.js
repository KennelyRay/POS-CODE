const { contextBridge, ipcRenderer } = require('electron');

// Thermal printing electron API
contextBridge.exposeInMainWorld('electronAPI', {
  // Printer management
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  
  // Receipt printing
  printReceipt: (receiptData, printerName) => ipcRenderer.invoke('print-receipt', receiptData, printerName),
  
  // Test printing
  testPrint: (printerName) => ipcRenderer.invoke('test-print', printerName),
  
  // Cash drawer
  openCashDrawer: (printerName) => ipcRenderer.invoke('open-cash-drawer', printerName),
});
