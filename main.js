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

    // Handle downloads
    mainWindow.webContents.session.on('will-download', (event, item, webContents) => {
        // Set save dialog options to ensure prompt
        item.setSaveDialogOptions({
            title: 'Save Download',
            defaultPath: item.getFilename(), // Use correct filename from server
            filters: [
                { name: 'Audio/Video', extensions: ['mp3', 'opus', 'mp4', 'm4a', 'webm'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });

        console.log(`Download started: ${item.getFilename()}`);

        item.on('updated', (event, state) => {
            if (state === 'interrupted') {
                console.log('Download is interrupted but can be resumed');
            } else if (state === 'progressing') {
                if (item.isPaused()) {
                    console.log('Download is paused');
                } else {
                    console.log(`Received bytes: ${item.getReceivedBytes()}`);
                }
            }
        });

        item.once('done', (event, state) => {
            if (state === 'completed') {
                console.log('Download successfully');
            } else {
                console.log(`Download failed: ${state}`);
            }
        });
    });

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

app.on('ready', () => {
    // Start server directly in the main process
    const userDataPath = app.getPath('userData');
    console.log("Electron User Data Path:", userDataPath);

    startServer({ userDataPath })
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
