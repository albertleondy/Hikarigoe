const { app, BrowserWindow } = require('electron');
const path = require('path');
const { startServer } = require('./server'); // Import the server

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'client/dist/vite.svg')
    });

    // Load the backend server URL
    mainWindow.loadURL('http://localhost:3001');

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

app.on('ready', () => {
    // Start server directly in the main process
    startServer()
        .then(() => {
            createWindow();
        })
        .catch((err) => {
            console.error('Failed to start server:', err);
        });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
    if (mainWindow === null) createWindow();
});
