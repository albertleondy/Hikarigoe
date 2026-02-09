const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'client/dist/vite.svg') // Optional: Set icon
    });

    // Load the backend server URL
    // We'll add a small delay to ensure server is ready, or implement a retry mechanism in loadURL (omitted for simplicity)
    setTimeout(() => {
        mainWindow.loadURL('http://localhost:3001');
    }, 2000);

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

function startServer() {
    return new Promise((resolve, reject) => {
        // Start the Express server as a child process
        serverProcess = spawn('node', [path.join(__dirname, 'server.js')]);

        serverProcess.stdout.on('data', (data) => {
            console.log(`Server: ${data}`);
            if (data.toString().includes('Server running')) {
                resolve();
            }
        });

        serverProcess.stderr.on('data', (data) => {
            console.error(`Server Error: ${data}`);
        });

        serverProcess.on('close', (code) => {
            console.log(`Server process exited with code ${code}`);
        });
    });
}

app.on('ready', () => {
    startServer().then(createWindow);
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
    if (mainWindow === null) createWindow();
});

app.on('will-quit', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
});
