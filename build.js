const fs = require("fs");
const path = require("path");

const sourceDir = path.join(__dirname, "src", "renderer");
const targetDir = path.join(__dirname, "dist", "renderer");

if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

const filesToCopy = [
    'index.html',
    'style.css'
];

for (const file of filesToCopy) {
    const source = path.join(sourceDir, file);
    const target = path.join(targetDir, file);

    fs.copyFileSync(source, target);

    console.log(`copied: ${file}`);
}

fs.copyFileSync(
    path.join(__dirname, "watch-icon.png"),
    path.join(__dirname, "dist", "watch-icon.png")
);
