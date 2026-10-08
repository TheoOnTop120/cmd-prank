"use strict";

const terminal = document.getElementById("terminal");
const history = document.getElementById("history");
const commandForm = document.getElementById("command-form");
const commandInput = document.getElementById("command-input");
const output = document.getElementById("output");
const prompt = document.getElementById("prompt");
const counter = document.getElementById("counter");
const finished = document.getElementById("finished");
const restartButton = document.getElementById("restart");

let gPresses = 0;
let running = false;
let intervalId;
let audioContext;
let currentFolder = "C:\\Users\\User";

const folders = [
  "C:\\Windows",
  "C:\\Windows\\System32",
  "C:\\Windows\\Temp",
  "C:\\Program Files",
  "C:\\Program Files\\Common Files",
  "C:\\Users\\User",
  "C:\\Users\\User\\Desktop",
  "C:\\Users\\User\\Documents",
  "C:\\Users\\User\\Downloads",
  "C:\\Users\\User\\AppData\\Local",
  "C:\\Users\\User\\AppData\\Roaming"
];

const fileNames = [
  "config.sys",
  "system_cache.dat",
  "desktop.ini",
  "settings.json",
  "backup_2026.zip",
  "photo_001.jpg",
  "notes.txt",
  "runtime.dll",
  "network.log",
  "user_data.tmp",
  "important_file.docx",
  "session.dat",
  "kernel32.dll",
  "update_cache.bin",
  "private_data.enc"
];

function playTone(frequency, duration, volume = 0.04) {
  try {
    audioContext = audioContext ||
      new (window.AudioContext || window.webkitAudioContext)();

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "square";
    oscillator.frequency.value = frequency;

    gain.gain.setValueAtTime(volume, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + duration
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch (error) {
    // The fake terminal also works without sound.
  }
}

function playKeySound() {
  playTone(680, 0.025, 0.012);
}

function playStartSound() {
  playTone(260, 0.08);
  setTimeout(() => playTone(420, 0.1), 110);
}

function playStopSound() {
  playTone(700, 0.1);
  setTimeout(() => playTone(380, 0.24), 120);
}

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomSize() {
  return Math.floor(Math.random() * 9999999)
    .toString()
    .padStart(10, " ");
}

function createFakeLine() {
  const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, "0");
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, "0");
  const hour = String(Math.floor(Math.random() * 24)).padStart(2, "0");
  const minute = String(Math.floor(Math.random() * 60)).padStart(2, "0");

  const isFolder = Math.random() < 0.18;
  const type = isFolder ? "<DIR>      " : "           ";

  const name = isFolder
    ? randomItem(["System", "Temp", "Cache", "Logs", "Backup", "Data"])
    : randomItem(fileNames);

  const size = isFolder ? "          " : randomSize();

  return `${day}/${month}/2026  ${hour}:${minute}    ${type}${size} ${name}`;
}

function addText(text) {
  history.textContent += text;
  terminal.scrollTop = terminal.scrollHeight;
}

function addPrompt(command) {
  addText(`\n${currentFolder}>${command}\n`);
}

function updatePrompt() {
  prompt.textContent = `${currentFolder}> `;
}

function clearTerminal() {
  history.textContent = "";
  output.textContent = "";
}

function showHelp() {
  addText(`
Commands available in this console:


  dir                 Lists files
  dir /s              Scans all folders and subfolders
  cls                 Clears the console
  clear               Wipes the terminal
  cd <folder>         Changes folder
  cd ..               Goes back to the parent folder
  echo <text>         Displays some text
  whoami              Displays the user
  ver                 Displays a Windows version
  date                Displays the date
  time                Displays the current time
  ipconfig            Displays the network configuration
  systeminfo          Displays system information
  color <code>        Changes the text color
  exit                Closes the console


`);
}

function showDirectory() {
  const fakeFiles = [];

  for (let i = 0; i < 12; i++) {
    fakeFiles.push(createFakeLine());
  }

  addText(`
 Volume in drive C has no label.
 Volume Serial Number is 7A3F-19B2


 Directory of ${currentFolder}


${fakeFiles.join("\n")}


              10 File(s)      2,984,621 bytes
               4 Dir(s)   184,927,428,608 bytes free
`);
}

function showIpconfig() {
  addText(`
Windows IP Configuration


Ethernet adapter Ethernet:


   Connection-specific DNS Suffix  . :
   IPv4 Address. . . . . . . . . . . : 192.168.1.42
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . . . : 192.168.1.1
`);
}

function showSystemInfo() {
  addText(`
Host Name:                 DESKTOP-USER
OS Name:                   Microsoft Windows 10 Pro
OS Version:                10.0.19045 Build 19045
System Manufacturer:       HP Inc.
System Model:              HP ENVY 700 PC SERIES
System Type:               x64-based PC
Total Physical Memory:     16,384 MB
`);
}

function showDate() {
  const now = new Date();
  addText(`The current date is: ${now.toLocaleDateString("en-GB")}\n`);
}

function showTime() {
  const now = new Date();
  addText(`The current time is: ${now.toLocaleTimeString("en-GB")}\n`);
}

function changeFolder(argument) {
  const folder = argument.trim();

  if (!folder) {
    addText(`${currentFolder}\n`);
    return;
  }

  if (folder === "..") {
    if (currentFolder !== "C:\\") {
      const parts = currentFolder.split("\\");
      parts.pop();
      let parent = parts.join("\\") || "C:\\";
      if (parent.endsWith(":")) {
        parent += "\\";
      }
      currentFolder = parent;
    }

    updatePrompt();
    return;
  }

  if (folder.toLowerCase() === "\\") {
    currentFolder = "C:\\";
    updatePrompt();
    return;
  }

  if (/^[a-z]:\\?$/i.test(folder)) {
    currentFolder = folder.length === 2
      ? `${folder}\\`
      : folder;
    updatePrompt();
    return;
  }

  if (folder.includes(":\\") || folder.startsWith("\\")) {
    currentFolder = folder.replace(/\/+/g, "\\");
    updatePrompt();
    return;
  }

  currentFolder = currentFolder.endsWith("\\")
    ? currentFolder + folder
    : currentFolder + "\\" + folder;

  updatePrompt();
}

function changeColor(argument) {
  const colors = {
    "0a": "#39ff5a",
    "0b": "#47fff7",
    "0c": "#ff5555",
    "0d": "#ff55ff",
    "0e": "#ffff55",
    "0f": "#f2f2f2",
    green: "#39ff5a",
    red: "#ff5555",
    blue: "#47fff7",
    yellow: "#ffff55",
    white: "#f2f2f2"
  };

  const selected = colors[argument.trim().toLowerCase()];

  if (!selected) {
    addText("Invalid color code.\n");
    return;
  }

  document.body.style.color = selected;
  commandInput.style.color = selected;
  commandInput.style.caretColor = selected;
  addText(`Color changed.\n`);
}

function addLines() {
  if (!running) return;

  let text = "";

  if (Math.random() > 0.78) {
    text += `\n Directory of ${randomItem(folders)}\n\n`;
  }

  for (let i = 0; i < 20; i++) {
    text += createFakeLine() + "\n";
  }

  output.textContent += text;

  const lines = output.textContent.split("\n");

  if (lines.length > 260) {
    output.textContent = lines.slice(-260).join("\n");
  }

  terminal.scrollTop = terminal.scrollHeight;
}

function startTerminal() {
  running = true;
  gPresses = 0;

  commandInput.disabled = true;
  commandForm.style.display = "none";
  output.textContent = "";
  counter.style.display = "block";
  counter.style.opacity = "1";
  counter.textContent = "G : 0 / 5";

  playStartSound();

  clearInterval(intervalId);
  intervalId = setInterval(addLines, 42);
}

function stopTerminal(showFinalScreen = true) {
  running = false;
  clearInterval(intervalId);

  counter.style.display = "none";

  if (showFinalScreen) {
    playStopSound();
    finished.style.display = "grid";
  } else {
    commandInput.disabled = false;
    commandForm.style.display = "flex";
    commandInput.focus();
  }
}

function resetTerminal() {
  clearInterval(intervalId);

  running = false;
  gPresses = 0;
  currentFolder = "C:\\Users\\User";
  updatePrompt();

  history.textContent = `Microsoft Windows [Version 10.0.19045.0000]
(c) Microsoft Corporation. All rights reserved.


Type "help" for available commands.


`;

  output.textContent = "";
  commandInput.value = "";
  commandInput.disabled = false;
  commandForm.style.display = "flex";
  counter.style.display = "none";
  finished.style.display = "none";

  commandInput.focus();
}

commandInput.addEventListener("keydown", (event) => {
  if (event.key.length === 1) {
    playKeySound();
  }
});

commandForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const originalCommand = commandInput.value.trim();
  const normalizedCommand = originalCommand.toLowerCase();
  const [command, ...args] = normalizedCommand.split(/\s+/);
  const argument = originalCommand.substring(command.length).trim();

  if (!originalCommand) {
    addPrompt("");
    return;
  }

  addPrompt(originalCommand);
  commandInput.value = "";

  if (command === "dir") {
    if (normalizedCommand.includes("/s")) {
      startTerminal();
    } else {
      showDirectory();
    }
    return;
  }

  if (command === "cls" || command === "clear") {
    clearTerminal();
    return;
  }

  if (command === "help" || command === "/?") {
    showHelp();
    return;
  }

  if (command === "echo") {
    addText(`${argument}\n`);
    return;
  }

  if (command === "cd" || command === "chdir") {
    changeFolder(argument);
    return;
  }

  if (command === "whoami") {
    addText("desktop-user\\theo\n");
    return;
  }

  if (command === "ver") {
    addText("Microsoft Windows [Version 10.0.19045.0000]\n");
    return;
  }

  if (command === "date") {
    showDate();
    return;
  }

  if (command === "time") {
    showTime();
    return;
  }

  if (command === "ipconfig") {
    showIpconfig();
    return;
  }

  if (command === "systeminfo") {
    showSystemInfo();
    return;
  }

  if (command === "color") {
    changeColor(args[0] || "");
    return;
  }

  if (command === "stop") {
    addText("No scan is currently running.\n");
    return;
  }

  if (command === "exit") {
    clearTerminal();
    addText("Session closed. Refresh the page to restart.\n");
    commandInput.disabled = true;
    return;
  }

  addText(
    `'${originalCommand}' is not recognized as an internal or external command,\n` +
    `operable program or batch file.\n`
  );
});

document.addEventListener("keydown", (event) => {
  if (!running) return;

  if (event.key.toLowerCase() === "g") {
    gPresses++;
    counter.textContent = `G : ${gPresses} / 5`;

    if (gPresses >= 5) {
      stopTerminal(true);
    }
  }
});

restartButton.addEventListener("click", resetTerminal);

window.addEventListener("load", () => {
  updatePrompt();
  commandInput.focus();
});
