const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = !app.isPackaged;

let mainWindow;

function createWindow() {
  // Determine the correct icon path
  let iconPath;
  if (isDev) {
    // In development, use the SVG from public folder
    iconPath = path.join(__dirname, 'app-icon.svg');
  } else {
    // In production, try to use the platform-specific icon
    if (process.platform === 'win32') {
      iconPath = path.join(process.resourcesPath, 'assets', 'icon.png');
    } else if (process.platform === 'darwin') {
      iconPath = path.join(process.resourcesPath, 'assets', 'icon.icns');
    } else {
      iconPath = path.join(process.resourcesPath, 'assets', 'icon.png');
    }
    
    // Fallback to SVG if platform-specific icon doesn't exist
    const fs = require('fs');
    if (!fs.existsSync(iconPath)) {
      iconPath = path.join(__dirname, 'app-icon.svg');
    }
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: iconPath,
    title: 'Ken-dal Store POS System',
    webPreferences: {
      preload: __dirname + '/preload.js',
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      webSecurity: true,
      sandbox: false,
    },
  });

  const indexPath = path.resolve(__dirname, '../build/index.html');
  console.log('Loading index.html from:', indexPath);
  
  // Load URL with error handling for content decoding issues
  const loadMainWindow = async () => {
    try {
      if (isDev) {
        console.log('Loading development server at http://localhost:3000');
        await mainWindow.loadURL('http://localhost:3000');
      } else {
        console.log('Loading production build from:', indexPath);
        await mainWindow.loadURL(`file://${indexPath}`);
      }
    } catch (error) {
      console.error('Failed to load main window:', error.message);
      
      if (isDev && error.message.includes('ERR_CONTENT_DECODING_FAILED')) {
        console.log('Detected content decoding error, trying to reload...');
        
        // Wait a moment and try again
        setTimeout(async () => {
          try {
            await mainWindow.reload();
            console.log('Successfully reloaded after content decoding error');
          } catch (reloadError) {
            console.error('Reload also failed:', reloadError.message);
            // Fallback to production build if available
            try {
              await mainWindow.loadURL(`file://${indexPath}`);
              console.log('Fallback to production build successful');
            } catch (fallbackError) {
              console.error('All loading methods failed:', fallbackError.message);
            }
          }
        }, 2000);
      }
    }
  };
  
  loadMainWindow();
}

// Thermal Printer IPC Handlers
ipcMain.handle('get-printers', async () => {
  return new Promise((resolve, reject) => {
    // Try multiple Python paths for better compatibility
    const pythonPaths = isDev 
      ? ['python', 'python3', 'py']
      : ['python', 'python3', 'py', 'C:\\\\Python313\\\\python.exe', 'C:\\\\Python312\\\\python.exe', 'C:\\\\Python311\\\\python.exe'];
    
    const scriptPath = isDev ? 'xp58_direct_usb.py' : path.join(process.resourcesPath, 'xp58_direct_usb.py');
    
    console.log('Getting Direct USB printers...');
    console.log('Script path:', scriptPath);
    console.log('Is development:', isDev);
    console.log('Process resources path:', process.resourcesPath);
    
    let pythonFound = false;
    let currentPythonIndex = 0;
    
    const tryNextPython = () => {
      if (currentPythonIndex >= pythonPaths.length) {
        console.error('No working Python found');
        reject(new Error('Python not found'));
        return;
      }
      
      const pythonPath = pythonPaths[currentPythonIndex];
      console.log(`Trying Python path: ${pythonPath}`);
      
      const pythonProcess = spawn(pythonPath, [scriptPath, 'list'], {
        cwd: isDev ? process.cwd() : process.resourcesPath
      });
      
      let output = '';
      let errorOutput = '';
      
      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code === 0 && output.trim()) {
          try {
            const printers = JSON.parse(output);
            console.log(`Found Direct USB printers: ${printers.length}`);
            console.log(`Successfully used Python: ${pythonPath}`);
            resolve(printers);
          } catch (e) {
            console.error('Failed to parse printer output:', e);
            console.error('Raw output:', output);
            currentPythonIndex++;
            tryNextPython();
          }
        } else {
          console.error(`Python ${pythonPath} failed with code ${code}:`, errorOutput);
          currentPythonIndex++;
          tryNextPython();
        }
      });
      
      pythonProcess.on('error', (error) => {
        console.error(`Python ${pythonPath} spawn error:`, error);
        currentPythonIndex++;
        tryNextPython();
      });
    };
    
    tryNextPython();
  });
});

ipcMain.handle('print-receipt', async (event, receiptData, printerName = null) => {
  return new Promise((resolve, reject) => {
    // Try multiple Python paths for better compatibility
    const pythonPaths = isDev 
      ? ['python', 'python3', 'py']
      : ['python', 'python3', 'py', 'C:\\\\Python313\\\\python.exe', 'C:\\\\Python312\\\\python.exe', 'C:\\\\Python311\\\\python.exe'];
    
    const scriptPath = isDev ? 'xp58_direct_usb.py' : path.join(process.resourcesPath, 'xp58_direct_usb.py');
    
    console.log('Printing receipt directly to XP-58 via USB:', receiptData.id);
    
    const args = ['print', '--data', JSON.stringify(receiptData)];
    // Note: Direct USB doesn't need printer name parameter
    
    let currentPythonIndex = 0;
    
    const tryNextPython = () => {
      if (currentPythonIndex >= pythonPaths.length) {
        console.error('No working Python found for printing');
        reject(new Error('Python not found'));
        return;
      }
      
      const pythonPath = pythonPaths[currentPythonIndex];
      console.log(`Trying Python for printing: ${pythonPath}`);
      
      const pythonProcess = spawn(pythonPath, [scriptPath, ...args], {
        cwd: isDev ? process.cwd() : process.resourcesPath
      });
      
      let output = '';
      let errorOutput = '';
      
      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          console.log('Receipt printed successfully via Direct USB');
          resolve({ success: true, message: 'Receipt printed successfully' });
        } else {
          console.error(`Direct USB print failed with code ${code}:`, errorOutput);
          currentPythonIndex++;
          tryNextPython();
        }
      });
      
      pythonProcess.on('error', (error) => {
        console.error(`Python ${pythonPath} spawn error:`, error);
        currentPythonIndex++;
        tryNextPython();
      });
    };
    
    tryNextPython();
  });
});

ipcMain.handle('test-print', async (event, printerName = null) => {
  return new Promise((resolve, reject) => {
    // Try multiple Python paths for better compatibility
    const pythonPaths = isDev 
      ? ['python', 'python3', 'py']
      : ['python', 'python3', 'py', 'C:\\\\Python313\\\\python.exe', 'C:\\\\Python312\\\\python.exe', 'C:\\\\Python311\\\\python.exe'];
    
    const scriptPath = isDev ? 'xp58_direct_usb.py' : path.join(process.resourcesPath, 'xp58_direct_usb.py');
    
    console.log('Testing Direct USB printer...');
    
    let currentPythonIndex = 0;
    
    const tryNextPython = () => {
      if (currentPythonIndex >= pythonPaths.length) {
        console.error('No working Python found for test print');
        reject(new Error('Python not found'));
        return;
      }
      
      const pythonPath = pythonPaths[currentPythonIndex];
      console.log(`Trying Python for test print: ${pythonPath}`);
      
      const pythonProcess = spawn(pythonPath, [scriptPath, 'test'], {
        cwd: isDev ? process.cwd() : process.resourcesPath
      });
      
      let output = '';
      let errorOutput = '';
      
      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          console.log('Direct USB test print completed successfully');
          resolve({ success: true, message: 'Test print completed successfully' });
        } else {
          console.error(`Direct USB test print failed with code ${code}:`, errorOutput);
          currentPythonIndex++;
          tryNextPython();
        }
      });
      
      pythonProcess.on('error', (error) => {
        console.error(`Python ${pythonPath} spawn error:`, error);
        currentPythonIndex++;
        tryNextPython();
      });
    };
    
    tryNextPython();
  });
});

ipcMain.handle('open-cash-drawer', async (event, printerName = null) => {
  return new Promise((resolve, reject) => {
    // Try multiple Python paths for better compatibility
    const pythonPaths = isDev 
      ? ['python', 'python3', 'py']
      : ['python', 'python3', 'py', 'C:\\\\Python313\\\\python.exe', 'C:\\\\Python312\\\\python.exe', 'C:\\\\Python311\\\\python.exe'];
    
    const scriptPath = isDev ? 'xp58_direct_usb.py' : path.join(process.resourcesPath, 'xp58_direct_usb.py');
    
    console.log('Opening cash drawer via thermal printer...');
    
    let currentPythonIndex = 0;
    
    const tryNextPython = () => {
      if (currentPythonIndex >= pythonPaths.length) {
        console.error('No working Python found for cash drawer');
        resolve(false);
        return;
      }
      
      const pythonPath = pythonPaths[currentPythonIndex];
      console.log(`Trying Python for cash drawer: ${pythonPath}`);
      
      const pythonProcess = spawn(pythonPath, [scriptPath, 'drawer'], {
        cwd: isDev ? process.cwd() : process.resourcesPath
      });
      
      let output = '';
      let errorOutput = '';
      
      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          console.log('Cash drawer opened successfully');
          resolve(true);
        } else {
          console.error(`Cash drawer open failed with code ${code}:`, errorOutput);
          currentPythonIndex++;
          tryNextPython();
        }
      });
      
      pythonProcess.on('error', (error) => {
        console.error(`Python ${pythonPath} spawn error:`, error);
        currentPythonIndex++;
        tryNextPython();
      });
    };
    
    tryNextPython();
  });
});

// Handle app quit
app.on('before-quit', () => {
  // Clear authentication state
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.executeJavaScript(`
      localStorage.removeItem('isAuthenticated');
    `);
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    // Prevent navigation to external URLs
    event.preventDefault();
  });
  
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.origin !== 'http://localhost:3000' && parsedUrl.origin !== 'file://') {
      // Prevent navigation to external URLs
      event.preventDefault();
    }
  });
});

// Security: Set app user model ID
if (process.platform === 'win32') {
  app.setAppUserModelId('com.kendalstore.pos');
}

app.whenReady().then(async () => {
  // Additional security configurations
  const { session } = require('electron');
  
  // Set secure defaults for session
  session.defaultSession.webSecurity = true;
  
  // Clear cache to fix ERR_CONTENT_DECODING_FAILED errors
  try {
    console.log('Clearing Electron cache to prevent content decoding errors...');
    await session.defaultSession.clearCache();
    await session.defaultSession.clearStorageData({
      storages: ['cache', 'filesystem']
    });
    console.log('Cache cleared successfully');
  } catch (error) {
    console.warn('Could not clear cache:', error.message);
  }
  
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
