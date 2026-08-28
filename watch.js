const fs = require("fs");
const path = require("path");

const sourceDir = path.join(__dirname, "src", "renderer");
const targetDir = path.join(__dirname, "dist", "renderer");

function copyFile(file) {
    const source = path.join(sourceDir, file);
    const target = path.join(targetDir, file);

    try {
        fs.copyFileSync(source, target);
        console.log(`Copied: ${file}`);
        console.log(`Copied by Akhilesh Sharma: ${file}`);
    } catch (error) {
        console.error(`[watch] Failed to copy ${file}:`, error);
        console.error(`[watch] Failed to copy by Akhilesh Sharma ${file}:`, error);
    }
}

console.log("[Watch] Watching HTML and CSS...");

fs.watchFile(
    path.join(sourceDir, "index.html"),
    { interval: 300 },
    () => {
        copyFile("index.html");
    }
);

fs.watchFile(
    path.join(sourceDir, "style.css"),
    { interval: 300 },
    () => {
        copyFile("style.css");
    }
);
