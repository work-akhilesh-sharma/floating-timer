import { 
    app, 
    BrowserWindow, 
    ipcMain,
    screen,
    Tray,
    Menu
} from "electron";
import path from "path";
import fs from "fs";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const settingsPath = path.join(
    app.getPath("userData"),
    "timer-settings.json"
);

interface TimerSettings {
    x?: number;
    y?: number;
    mode?: "stopwatch" | "countdown";

    countdownDuration?: number;
    countdownRemaining?: number;
    countdownRunning?: boolean;
    countdownSavedAt?: number;

    stopwatchElapsed?: number;
}

function loadSettings(): TimerSettings {
    try {
        if (!fs.existsSync(settingsPath)) {
            return {};
        }

        const data = fs.readFileSync(settingsPath, "utf-8");

        return JSON.parse(data);
    } catch (error) {
        console.error(
            "Failed to load timer settings:",
            error
        );

        return {};
    }
}

function isPositionVisible(x: number, y: number): boolean {
    const displays = screen.getAllDisplays();

    return displays.some((display) => {
        const { x: displayX, y: displayY } = display.bounds;

        const displayRight = displayX + display.bounds.width;
        const displayBottom = displayY + display.bounds.height;

        return (
            x >= displayX &&
            x < displayRight &&
            y >= displayY &&
            y < displayBottom
        );
    });
}

function saveWindowPosition(window: BrowserWindow): void {
    try {
        const [x, y] = window.getPosition();
        const currentSettings = loadSettings();

        const data: TimerSettings = {
            ...currentSettings,
            x,
            y
        };

        fs.writeFileSync(
            settingsPath,
            JSON.stringify(data, null, 2),
            "utf-8"
        );
    } catch (error) {
        console.error(
            "Failed to save window position:",
            error
        );
    }
}

function createWindow(): void {
    const savedSettings = loadSettings();

    const savedPosition = 
        savedSettings.x !== undefined &&
        savedSettings.y !== undefined
            ? {
                x: savedSettings.x,
                y: savedSettings.y
            }
            : null; 

    let windowPosition: { x: number; y: number } | null = null;
    if (
        savedPosition &&
        isPositionVisible(savedPosition.x, savedPosition.y)
    ) {
        windowPosition = savedPosition;
    } else {
        const primaryDisplay = screen.getPrimaryDisplay();
        const { x, y, width, height } = primaryDisplay.workArea;

        const windowWidth = 360;
        const windowHeight = 180;

        windowPosition = {
            x: Math.round(x + (width - windowWidth) / 2),
            y: Math.round(y + (height - windowHeight) / 2)
        };
    }

    mainWindow = new BrowserWindow({
        width: 360,
        height: 180,

        ...(windowPosition ? {
            x: windowPosition.x,
            y: windowPosition.y
        }: {}),

        minWidth: 375,
        minHeight: 55,

        frame: false,
        transparent: true,

        resizable: false,
        alwaysOnTop: true,

        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    tray = new Tray(path.join(__dirname, "watch-icon.png"));
    const contextMenu = Menu.buildFromTemplate([
        {
            label: "Show Timer",
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                }
            }
        },
        {
            label: "Start / Pause",
            click: () => {
                if (mainWindow) {
                    mainWindow.webContents.send("tray-toggle-timer");
                }   
            }
        },
        {
            label: "Reset",
            click: () => {
                if (mainWindow) {
                    mainWindow.webContents.send("tray-reset-timer");
                }
            }    
        },
        {
            type: "separator"
        },
        {
            label: "Quit",
            click: () => {
                app.quit();
            }
        }
    ]);

    tray.setContextMenu(contextMenu);

    tray.on("click", () => {
        if (!mainWindow) {
            return;
        }

        if (mainWindow.isMinimized()) {
            mainWindow.restore();
        }

        mainWindow.show();
        mainWindow.focus();
        mainWindow.moveTop();
    });

    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

    mainWindow.on("moved", () => {
        if (mainWindow) {
            saveWindowPosition(mainWindow);
        }
    });

    mainWindow.on("close", () => {
        if (mainWindow) {
            saveWindowPosition(mainWindow);
        }
    });
}

// Minimize the application window
ipcMain.on("window-minimize", () => {
    mainWindow?.minimize();
});

// Close the application
ipcMain.on("window-close", () => {
    mainWindow?.close();
});

ipcMain.on("window-compact", () => {
    if (!mainWindow) {
        return;
    }

    mainWindow.setMinimumSize(375, 55);
    mainWindow.setSize(375, 55);
});

ipcMain.on("window-expand", () => {
    if (!mainWindow) {
        return;
    }

    mainWindow.setMaximumSize(360, 180);
    mainWindow.setSize(360, 180);
});

ipcMain.handle("get-timer-settings", () => {
    const settings = loadSettings();

    return {
        mode: settings.mode ?? "stopwatch",
        countdownDuration: settings.countdownDuration ?? 10 * 60 * 1000,
        countdownRemaining: settings.countdownRemaining ?? settings.countdownDuration ?? 10 * 60 * 1000,
        countdownRunning: settings.countdownRunning ?? false,
        countdownSavedAt: settings.countdownSavedAt ?? 0,
        stopwatchElapsed: settings.stopwatchElapsed ?? 0
    };
});

ipcMain.on("save-timer-settings",
    (
        _event,
        settings: {
            mode: "stopwatch" | "countdown";
            
            countdownDuration: number;
            countdownRemaining: number;
            countdownRunning: boolean;
            countdownSavedAt: number;

            stopwatchElapsed: number;
        }
    ) => {
        try {
            const currentSettings = loadSettings();

            const data: TimerSettings = {
                ...currentSettings,
                mode: settings.mode,
                countdownDuration: settings.countdownDuration,
                countdownRemaining: settings.countdownRemaining,
                countdownRunning: settings.countdownRunning,
                countdownSavedAt: settings.countdownSavedAt,
                stopwatchElapsed: settings.stopwatchElapsed
            };

            fs.writeFileSync(
                settingsPath,
                JSON.stringify(data, null, 2),
                "utf-8"
            );

        } catch (error) {
            console.error(
                "Failed to save timer settings:",
                error
            );
        }
    }
);

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
