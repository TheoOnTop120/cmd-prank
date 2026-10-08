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

const commandRegistry = new Map();

function registerCommand(command) {
  commandRegistry.set(command.name.toLowerCase(), command);

  for (const alias of command.aliases) {
    commandRegistry.set(alias.toLowerCase(), command);
  }
}

function findCommand(name) {
  return commandRegistry.get(name.toLowerCase());
}

function parseCommandLine(input) {
  const tokens = [];
  let token = "";
  let inQuotes = false;
  let tokenStarted = false;

  for (const character of input) {
    if (character === '"') {
      inQuotes = !inQuotes;
      tokenStarted = true;
    } else if (/\s/.test(character) && !inQuotes) {
      if (tokenStarted) {
        tokens.push(token);
        token = "";
        tokenStarted = false;
      }
    } else {
      token += character;
      tokenStarted = true;
    }
  }

  if (tokenStarted) {
    tokens.push(token);
  }

  return {
    command: (tokens.shift() || "").toLowerCase(),
    args: tokens
  };
}

function showHelp(commandName) {
  if (commandName) {
    const command = findCommand(commandName);

    if (!command) {
      addText(`No help available for '${commandName}'.\n`);
      return;
    }

    addText(
      `\nName: ${command.name}\n` +
      `Description: ${command.description}\n` +
      `Usage: ${command.usage}\n` +
      `Aliases: ${command.aliases.length ? command.aliases.join(", ") : "None"}\n\n`
    );
    return;
  }

  const commands = [...new Set(commandRegistry.values())];
  const nameWidth = Math.max(...commands.map(({ name }) => name.length));
  const listing = commands
    .map(({ name, description }) => `  ${name.padEnd(nameWidth)}  ${description}`)
    .join("\n");

  addText(`\nCommands available in this console:\n\n${listing}\n\n`);
}

registerCommand({
  name: "dir",
  aliases: [],
  description: "Lists files or scans all folders and subfolders.",
  usage: "dir [/s]",
  execute(args) {
    if (args.some((argument) => argument.toLowerCase() === "/s")) {
      startTerminal();
    } else {
      showDirectory();
    }
  }
});

registerCommand({
  name: "clear",
  aliases: ["cls"],
  description: "Clears the console.",
  usage: "clear",
  execute() {
    clearTerminal();
  }
});

registerCommand({
  name: "help",
  aliases: ["/?"],
  description: "Displays available commands or detailed command help.",
  usage: "help [command]",
  execute(args) {
    showHelp(args[0]);
  }
});

registerCommand({
  name: "echo",
  aliases: [],
  description: "Displays text.",
  usage: "echo [text]",
  execute(args) {
    addText(`${args.join(" ")}\n`);
  }
});

registerCommand({
  name: "cd",
  aliases: ["chdir"],
  description: "Changes the current folder or displays it.",
  usage: "cd [folder]",
  execute(args) {
    changeFolder(args.join(" "));
  }
});

registerCommand({
  name: "whoami",
  aliases: [],
  description: "Displays the current user.",
  usage: "whoami",
  execute() {
    addText("desktop-user\\theo\n");
  }
});

registerCommand({
  name: "ver",
  aliases: [],
  description: "Displays the Windows version.",
  usage: "ver",
  execute() {
    addText("Microsoft Windows [Version 10.0.19045.0000]\n");
  }
});

registerCommand({
  name: "date",
  aliases: [],
  description: "Displays the current date.",
  usage: "date",
  execute() {
    showDate();
  }
});

registerCommand({
  name: "time",
  aliases: [],
  description: "Displays the current time.",
  usage: "time",
  execute() {
    showTime();
  }
});

registerCommand({
  name: "ipconfig",
  aliases: [],
  description: "Displays the network configuration.",
  usage: "ipconfig",
  execute() {
    showIpconfig();
  }
});

registerCommand({
  name: "systeminfo",
  aliases: [],
  description: "Displays system information.",
  usage: "systeminfo",
  execute() {
    showSystemInfo();
  }
});

registerCommand({
  name: "color",
  aliases: [],
  description: "Changes the text color.",
  usage: "color <code>",
  execute(args) {
    changeColor(args[0] || "");
  }
});

registerCommand({
  name: "stop",
  aliases: [],
  description: "Reports that no scan is currently running.",
  usage: "stop",
  execute() {
    addText("No scan is currently running.\n");
  }
});

registerCommand({
  name: "exit",
  aliases: [],
  description: "Closes the session.",
  usage: "exit",
  execute() {
    addText("Session closed. Refresh the page to restart.\n");
    commandInput.disabled = true;
  }
});

commandInput.addEventListener("keydown", (event) => {
  if (event.key.length === 1) {
    playKeySound();
  }
});

commandForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const originalCommand = commandInput.value.trim();

  if (!originalCommand) {
    addPrompt("");
    return;
  }

  addPrompt(originalCommand);
  commandInput.value = "";

  const { command: commandName, args } = parseCommandLine(originalCommand);
  const command = findCommand(commandName);

  if (command) {
    command.execute(args);
  } else {
    addText(
      `'${originalCommand}' is not recognized as an internal or external command,\n` +
      `operable program or batch file.\n`
    );
  }
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
