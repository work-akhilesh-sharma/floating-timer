export {};

declare global {
    interface Window{
        electronAPI: {
            minimize: () => void;
            close: () => void;
            compact: () => void;
            expand: () => void;
            
            onTrayToggleTimer: (
                callback: () => void
            ) => void;

            onTrayResetTimer: (
                callback: () => void
            ) => void;

            getTimerSettings: () => Promise<{
                mode: "stopwatch" | "countdown";
                countdownDuration: number;
                countdownRemaining: number;
                countdownRunning: boolean;
                countdownSavedAt: number;
                stopwatchElapsed: number;
            }>;

            saveTimerSettings: (
                settings: {
                    mode: "stopwatch" | "countdown";
                    countdownDuration: number;
                    countdownRemaining: number;
                    countdownRunning: boolean;
                    countdownSavedAt: number;
                    stopwatchElapsed: number;
                }
            ) => void;
        };
    }
}