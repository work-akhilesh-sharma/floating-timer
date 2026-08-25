const compactBtn = document.getElementById("compactBtn") as HTMLButtonElement;
const minimizeBtn = document.getElementById("minimizeBtn") as HTMLButtonElement;
const closeBtn = document.getElementById("closeBtn") as HTMLButtonElement;

const timerElement = document.getElementById("timer") as HTMLDivElement;
const startBtn = document.getElementById("startBtn") as HTMLButtonElement;
const resetBtn = document.getElementById("resetBtn") as HTMLButtonElement;

const durationInput = document.getElementById("durationInput") as HTMLInputElement;
const timerSettingsBtn = document.getElementById("timerSettingsBtn") as HTMLButtonElement;
const durationControls = document.getElementById("durationControls") as HTMLDivElement;
const addMinuteBtn = document.getElementById("addMinuteBtn") as HTMLButtonElement; 

let isCompact = false;
let startTime = 0;
let elapsedTime = 0;

let isCountdown = false;
let settingsLoaded = false;

let countdownDuration = 10 * 60 * 1000; // 10 minutes
let countdownRemaining = countdownDuration;

let countdownRunning = false;
let countdownSavedAt = 0;

let hasSavedCountdownstate = false;

let countdownFinished = false;
let countDownEndTime = 0;

let countdownStarted = false;

let timerInterval: ReturnType<typeof setInterval> | null = null;
let settingsSaveInterval: ReturnType<typeof setInterval> | null = null; 

let isRunning = false;

function formatTime(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [
        hours,
        minutes,
        seconds
    ]
      .map(value => value.toString().padStart(2, '0')).join(':');
}

function parseDuration(value: string): number | null {
    const parts = value.trim().split(":");

    if (parts.length !== 3) {
        return null;
    }

    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    const seconds = Number(parts[2]);

    if (
        !Number.isInteger(hours) ||
        !Number.isInteger(minutes) ||
        !Number.isInteger(seconds)
    ) {
        return null;
    }

    if (
        hours < 0 ||
        minutes < 0 ||
        minutes > 59 ||
        seconds < 0 ||
        seconds > 59
    ) {
        return null;
    }

    return (
        hours * 60 * 60 * 1000 + 
        minutes * 60 * 1000 +
        seconds * 1000
    );
}

function updateCountdownDuration(): boolean {
    const duration = parseDuration(durationInput.value);
    if (duration === null || duration <= 0) {
        return false;
    }

    countdownDuration = duration;
    countdownRemaining = countdownDuration;
    return true;
}

function switchToCountdownMode(): void {
    if (isCountdown) {
        return;
    }

    // Save the exact stopwatch value before leaving stopwatch mode
    if (isRunning) {
        elapsedTime = Date.now() - startTime;
    }

    // We are leaving Stopwatch, so its startTime must no longer
    // be used to calculate elapsed time.
    startTime = 0;

    isCountdown = true;

    countdownFinished = false;

    if (!hasSavedCountdownstate) {
        countdownRemaining = countdownDuration;
    }

    countdownStarted = countdownRemaining > 0;


    durationInput.value = formatTime(countdownRemaining);
    timerElement.textContent = formatTime(countdownRemaining);

    saveTimerSettings();
}

function switchToStopwatchMode(): void {
    if (!isCountdown) {
        return;
    }

    if (isRunning) {
        pauseTimer();
    }

    isCountdown = false;

    // countdownFinished = false;
    // countdownStarted = false;

    // // Stop any running timer
    // if (timerInterval !== null) {
    //     clearInterval(timerInterval);
    //     timerInterval = null;
    // }

    // isRunning = false;

    // startTime = 0;
    // elapsedTime = 0;

    timerElement.textContent = formatTime(elapsedTime);
    durationControls.classList.remove("visible");

    // startBtn.textContent = "▶";
    // startBtn.title = "Start";
    // startBtn.setAttribute("aria-label", "Start");
    saveTimerSettings();
}

async function loadTimerSettings(): Promise<void> {
    try {
        const settings = await window.electronAPI.getTimerSettings();

        // Restore countdown configuration
        countdownDuration = settings.countdownDuration;
        countdownRemaining = settings.countdownRemaining;

        if (
            settings.countdownRunning &&
            settings.countdownSavedAt > 0
        ) {
            const elapasedSinceSave = Date.now() - settings.countdownSavedAt;
            countdownRemaining = Math.max(0, countdownRemaining - elapasedSinceSave);
        }

        if (countdownRemaining === 0) {
            countdownFinished = true;
        }

        hasSavedCountdownstate = true;

        // Restore Stopwatch
        elapsedTime = settings.stopwatchElapsed;
       
        // always open in Stopwatch mode
        isCountdown = false;
        isRunning = false;

        durationControls.classList.remove("visible");

        timerElement.textContent = formatTime(elapsedTime);

        startBtn.textContent = "▶";
        startBtn.title = "Start";
        startBtn.setAttribute(
            "aria-label",
            "Start"
        );
        
        settingsLoaded = true;
        
        console.log("Timer setting loaded: ", settings);
        console.log("Countdown remaining: ", countdownRemaining);
    } catch (error) {
        console.error(
            "Failed to load timer settings",
            error
        );

        // Safe default
        isCountdown = false;
        isRunning = false;

        elapsedTime = 0;

        countdownDuration = 10 * 60 * 1000;
        countdownRemaining = countdownDuration;

        durationControls.classList.remove("visible");
        timerElement.textContent = "00:00:00";

        settingsLoaded = true;
    }
}

function saveTimerSettings(): void {
    let currentCountdownRemaining = countdownRemaining;

    if (isCountdown && isRunning) {
        currentCountdownRemaining = Math.max(0, countDownEndTime - Date.now());
    }

    window.electronAPI.saveTimerSettings({
        mode: isCountdown
            ? "countdown"
            : "stopwatch",

        countdownDuration,

        countdownRemaining: currentCountdownRemaining,
        countdownRunning: isCountdown && isRunning,
        countdownSavedAt: Date.now(),
        stopwatchElapsed: elapsedTime
    });
}

function startSettingsAutoSave(): void {
    if (settingsSaveInterval !== null) {
        return;
    }

    settingsSaveInterval = setInterval(() => {

        if (!isRunning) {
            return;
        }

        if (isCountdown) {
            countdownRemaining = Math.max(0, countDownEndTime - Date.now());
        } else {
            elapsedTime = Date.now() - startTime;
        }

        saveTimerSettings();
    }, 5000);
}

function stopSettingsAutoSave(): void {
    if (settingsSaveInterval !== null) {
        clearInterval(settingsSaveInterval);
        settingsSaveInterval = null;
    }
}

function updateTimer(): void {
    if (isCountdown) {
        countdownRemaining = countDownEndTime - Date.now();

        if (countdownRemaining <= 0) {
            
            countdownRemaining = 0;
            countdownFinished = true;

            timerElement.textContent = "00:00:00";

            pauseTimer();
            return;
        }

        timerElement.textContent = formatTime(countdownRemaining);
        return;
    }

    elapsedTime = Date.now() - startTime;

    timerElement.textContent = formatTime(elapsedTime);
}

function startTimer(): void {
    if (isRunning) {
        return;
    }

    
    // if the countdown hasn't started yet, begin from the full duration.
    if (isCountdown) {
        if (!countdownStarted || countdownFinished) {
            if (!updateCountdownDuration()) {
                return;
            }
            
            countdownFinished = false;
            countdownStarted = true
        }
        
        countDownEndTime = Date.now() + countdownRemaining;
    } else {
        startTime = Date.now() - elapsedTime;
    }
    
    isRunning = true;
    startSettingsAutoSave();

    startBtn.textContent = "⏸";
    startBtn.title = "Pause";
    startBtn.setAttribute("aria-label", "Pause");

    timerInterval = setInterval(updateTimer, 100);
    
    updateTimer();
}

function pauseTimer(): void {
    if (!isRunning) {
        return;
    }

    if (isCountdown) {
        // Save exactly how mush time is left
        countdownRemaining = Math.max(0, countDownEndTime - Date.now());
        if (countdownRemaining === 0) {
            countdownFinished = true;
        }
    } else {
        elapsedTime = Date.now() - startTime;
    }

    if (timerInterval !== null) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    isRunning = false;
    stopSettingsAutoSave();

    startBtn.textContent = "▶";
    startBtn.title = "Start";
    startBtn.setAttribute("aria-label", "Start");

    saveTimerSettings();
}

function resetTimer(): void {
    // Stop the currently active timer
    if (timerInterval !== null) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    isRunning = false;

    if (isCountdown) {
        // Reset only countdown
        countdownFinished = false;
        countdownStarted = false;

        countdownRemaining = countdownDuration;
        countDownEndTime = 0;

        durationInput.value = formatTime(countdownDuration);
        // if (!updateCountdownDuration()) {
        // }
        timerElement.textContent = formatTime(countdownRemaining);
    } else {
        // Reset only stopwatch
        startTime = 0
        elapsedTime = 0;

        timerElement.textContent = "00:00:00";
    }

    startBtn.textContent = "▶";
    startBtn.title = "Start";
    startBtn.setAttribute("aria-label", "Start");

    saveTimerSettings();
}

function applyDurationInput(): void {
    const duration = parseDuration(durationInput.value);

    if (duration === null || duration <= 0) {
        durationInput.value = formatTime(countdownRemaining);
        return;
    }

    if (!isCountdown) {
        return;
    }

    countdownDuration = duration;
    countdownRemaining = duration;
    countdownFinished = false;

    if (isRunning) {
        countDownEndTime = Date.now() + countdownRemaining;
    }

    timerElement.textContent = formatTime(countdownRemaining);
    saveTimerSettings();
}

startBtn.addEventListener("click", () => {
    if (isRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
});

window.electronAPI.onTrayToggleTimer(() => {
    startBtn.click();
});

window.electronAPI.onTrayResetTimer(() => {
    resetBtn.click();
})

resetBtn.addEventListener("click", resetTimer);

minimizeBtn.addEventListener(
    "click", 
    () => { 
        window.electronAPI.minimize(); 
    }
);

closeBtn.addEventListener(
    "click",
    () => {
        window.electronAPI.close();
    }
);

compactBtn.addEventListener(
    "click",
    () => {
        isCompact = !isCompact;
        const container = document.querySelector(".timer-container") as HTMLDivElement;
        if (isCompact) {
            container.classList.add("compact-mode");
            
            compactBtn.textContent = '↗';
            compactBtn.title = "Expand";
            
            window.electronAPI.compact();
        } else {
            container.classList.remove("compact-mode");
            
            compactBtn.textContent = '↙';
            compactBtn.title = "Compact mode";
            
            window.electronAPI.expand();
        }
    }
);

durationInput.addEventListener("input", () => {
    switchToCountdownMode();
    applyDurationInput();
});

timerSettingsBtn.addEventListener("click", () => {
    if (isCountdown) {
        switchToStopwatchMode();

        durationControls.classList.remove("visible");
    } else {
        switchToCountdownMode();
        
        durationControls.classList.add("visible");
    }
});

addMinuteBtn.addEventListener("click", () => {
    switchToCountdownMode();

    const oneMinute = 60 * 1000;

    countdownRemaining += oneMinute;
    countdownDuration += oneMinute;

    countdownFinished = false;

    durationInput.value = formatTime(countdownRemaining);
    timerElement.textContent = formatTime(countdownRemaining);
    if (isRunning) {
        countDownEndTime = Date.now() + countdownRemaining;
    }
    saveTimerSettings();
});


document.addEventListener("keydown", (event) => {
    // Space → Start / Pause
    if (event.code === "Space") {
        event.preventDefault();
        startBtn.click();
    }
    
    // R → Reset
    if (event.key.toLowerCase() === "r") {
        resetBtn.click();
    }
    
    // C → compact / Expand
    if (event.key.toLowerCase() === "c") {
        compactBtn.click();
    }
});

document.addEventListener("mousedown", (event) => {
    const target = event.target as HTMLElement;

    if (target !== durationInput) {
        durationInput.blur();
    }
});

window.addEventListener(
    "beforeunload",
    () => {
    if (isRunning) {
        if (isCountdown) {
            countdownRemaining = Math.max(0, countDownEndTime - Date.now());
        } else {
            elapsedTime = Date.now() - startTime;
        }
    }

    saveTimerSettings();
});

loadTimerSettings();