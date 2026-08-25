import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld(
    "electronAPI", 
    {
        minimize: (): void => {
            ipcRenderer.send("window-minimize");
        },

        close: (): void => {
            ipcRenderer.send("window-close");
        },

        compact: (): void => {
            ipcRenderer.send("window-compact");
        },

        expand: (): void => {
            ipcRenderer.send("window-expand");
        },

        onTrayToggleTimer: (callback: () => void) => {
            ipcRenderer.on("tray-toggle-timer", callback);
        },

        onTrayResetTimer: (callback: () => void) => {
            ipcRenderer.on("tray-reset-timer", callback);
        },

        getTimerSettings: (): Promise<{
            mode: "stopwatch" | "countdown";
            countdownDuration: number;
            countdownRemaining: number;
            countdownRunning: boolean;
            countdownSavedAt: number;
            stopwatchElapsed: number;
        }> => {
            return ipcRenderer.invoke("get-timer-settings");
        },

        saveTimerSettings: (
            settings: {
                mode: "stopwatch" | "countdown";
                countdownDuration: number;
                countdownRemaining: number;
                countdownRunning: boolean;
                countdownSavedAt: number;
                stopwatchElapsed: number;
            }
        ): void => {
            ipcRenderer.send(
                "save-timer-settings",
                settings
            );
        }
    }
);