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

const system = {
  hostName: "DESKTOP-USER",
  userName: "desktop-user\\theo",
  osName: "Microsoft Windows 10 Pro",
  version: "10.0.19045",
  build: "19045",
  manufacturer: "HP Inc.",
  model: "HP ENVY 700 PC SERIES",
  systemType: "x64-based PC",
  processor: "Intel(R) Core(TM) i7-9700 CPU @ 3.00GHz",
  memoryMb: 16384,
  bios: "HP Q.12, 15/01/2024",
  installDate: "15/01/2024, 10:24:12",
  bootTime: "09/10/2026, 04:42:18",
  volumeSerial: "7A3F-19B2",
  diskFreeBytes: 184927428608,
  ipv4: "192.168.1.42",
  subnet: "255.255.255.0",
  gateway: "192.168.1.1",
  dnsServers: ["192.168.1.1", "8.8.8.8"],
  mac: "A4-5E-60-2B-19-7C"
};

const initialProcesses = [
  { image: "System Idle Process", pid: 0, session: "Services", memory: "8 K" },
  { image: "System", pid: 4, session: "Services", memory: "1,204 K" },
  { image: "smss.exe", pid: 596, session: "Services", memory: "1,120 K" },
  { image: "csrss.exe", pid: 884, session: "Services", memory: "5,248 K" },
  { image: "wininit.exe", pid: 972, session: "Services", memory: "6,132 K" },
  { image: "services.exe", pid: 1080, session: "Services", memory: "8,412 K" },
  { image: "svchost.exe", pid: 1420, session: "Services", memory: "24,560 K" },
  { image: "explorer.exe", pid: 4820, session: "Console", memory: "72,640 K" },
  { image: "chrome.exe", pid: 6512, session: "Console", memory: "312,840 K" },
  { image: "cmd.exe", pid: 7316, session: "Console", memory: "4,892 K" }
];

const networkConnections = [
  { protocol: "TCP", local: "0.0.0.0:135", remote: "0.0.0.0:0", state: "LISTENING", pid: 1080 },
  { protocol: "TCP", local: "0.0.0.0:445", remote: "0.0.0.0:0", state: "LISTENING", pid: 4 },
  { protocol: "TCP", local: "127.0.0.1:49664", remote: "0.0.0.0:0", state: "LISTENING", pid: 972 },
  { protocol: "TCP", local: `${system.ipv4}:139`, remote: "0.0.0.0:0", state: "LISTENING", pid: 4 },
  { protocol: "TCP", local: `${system.ipv4}:52318`, remote: "142.250.72.14:443", state: "ESTABLISHED", pid: 6512 },
  { protocol: "TCP", local: `${system.ipv4}:52322`, remote: "151.101.1.69:443", state: "ESTABLISHED", pid: 6512 },
  { protocol: "UDP", local: "0.0.0.0:5353", remote: "*:*", state: "", pid: 1420 },
  { protocol: "UDP", local: `${system.ipv4}:68`, remote: "*:*", state: "", pid: 1420 }
];

const initialServices = [
  { name: "Dhcp", display: "DHCP Client", state: "RUNNING", start: "AUTO" },
  { name: "Dnscache", display: "DNS Client", state: "RUNNING", start: "AUTO" },
  { name: "Spooler", display: "Print Spooler", state: "RUNNING", start: "AUTO" },
  { name: "Themes", display: "Themes", state: "RUNNING", start: "AUTO" },
  { name: "wuauserv", display: "Windows Update", state: "STOPPED", start: "DEMAND" }
];

const initialTasks = [
  { name: "\\Microsoft\\Windows\\UpdateOrchestrator\\Schedule Scan", next: "10/09/2026 06:00:00", status: "Ready" },
  { name: "\\Microsoft\\Windows\\Defrag\\ScheduledDefrag", next: "11/09/2026 01:00:00", status: "Ready" },
  { name: "\\Microsoft\\Windows\\Windows Defender\\Cache Maintenance", next: "10/09/2026 12:00:00", status: "Ready" }
];

const initialRoutes = [
  { network: "0.0.0.0", mask: "0.0.0.0", gateway: system.gateway, interface: system.ipv4, metric: 25 },
  { network: "127.0.0.0", mask: "255.0.0.0", gateway: "On-link", interface: "127.0.0.1", metric: 331 },
  { network: "192.168.1.0", mask: "255.255.255.0", gateway: "On-link", interface: system.ipv4, metric: 281 }
];

const initialArp = [
  { ip: system.gateway, mac: "3C-84-6A-12-34-56", type: "dynamic" },
  { ip: "192.168.1.18", mac: "A4-5E-60-11-22-33", type: "dynamic" },
  { ip: "192.168.1.255", mac: "FF-FF-FF-FF-FF-FF", type: "static" }
];

const systemFolders = [
  "C:\\",
  "C:\\Windows",
  "C:\\Windows\\System32",
  "C:\\Windows\\Temp",
  "C:\\Program Files",
  "C:\\Program Files\\Common Files",
  "C:\\Program Files\\Google",
  "C:\\Program Files\\Google\\Chrome",
  "C:\\Users",
  "C:\\Users\\User",
  "C:\\Users\\User\\Desktop",
  "C:\\Users\\User\\Documents",
  "C:\\Users\\User\\Downloads",
  "C:\\Users\\User\\AppData",
  "C:\\Users\\User\\AppData\\Local",
  "C:\\Users\\User\\AppData\\Roaming"
];

const seededFiles = [
  ["C:\\Windows\\System32\\kernel32.dll", "Windows system library (simulated)."],
  ["C:\\Windows\\System32\\notepad.exe", "Simulated Windows Notepad executable."],
  ["C:\\Windows\\System32\\cmd.exe", "Simulated Windows Command Processor."],
  ["C:\\Windows\\System32\\drivers\\etc\\hosts", "127.0.0.1       localhost\n"],
  ["C:\\Windows\\Temp\\update_cache.bin", "Temporary update cache (simulated)."],
  ["C:\\Program Files\\Google\\Chrome\\chrome.exe", "Simulated browser executable."],
  ["C:\\Users\\User\\Desktop\\Readme.txt", "Welcome to the simulated Windows desktop.\n"],
  ["C:\\Users\\User\\Documents\\notes.txt", "Remember to back up the project files.\n"],
  ["C:\\Users\\User\\Documents\\network.log", "09/10/2026 04:42:18 DHCP lease renewed.\n"],
  ["C:\\Users\\User\\Downloads\\backup_2026.zip", "Simulated archive contents."]
];

const environment = new Map([
  ["COMSPEC", "C:\\Windows\\System32\\cmd.exe"],
  ["HOMEDRIVE", "C:"],
  ["HOMEPATH", "\\Users\\User"],
  ["OS", "Windows_NT"],
  ["PATHEXT", ".COM;.EXE;.BAT;.CMD"],
  ["PROCESSOR_ARCHITECTURE", "AMD64"],
  ["SystemRoot", "C:\\Windows"],
  ["TEMP", "C:\\Windows\\Temp"],
  ["USERNAME", "theo"],
  ["windir", "C:\\Windows"]
]);

let currentFolder = "C:\\Users\\User";
let gPresses = 0;
let running = false;
let intervalId;
let audioContext;
let redirectOutput = null;
let virtualFS;
let processes;
let services;
let scheduledTasks;
let routes;
let arpTable;
let associations;
let fileTypes;

function playTone(frequency, duration, volume = 0.04) {
  try {
    audioContext = audioContext ||
      new (window.AudioContext || window.webkitAudioContext)();

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "square";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch (error) {
    // Audio is optional; the terminal remains fully usable without it.
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

function addText(text) {
  const value = String(text);
  if (redirectOutput !== null) {
    redirectOutput += value;
    return;
  }
  history.textContent += value;
  terminal.scrollTop = terminal.scrollHeight;
}

function updatePrompt() {
  prompt.textContent = `${currentFolder}> `;
}

function addPrompt(command) {
  addText(`\n${currentFolder}>${command}\n`);
}

function clearTerminal() {
  history.textContent = "";
  output.textContent = "";
}

function normalizePath(path) {
  let value = String(path || "").replace(/\//g, "\\");
  let drive = "C:";

  if (/^[a-z]:/i.test(value)) {
    drive = value.slice(0, 2);
    value = value.slice(2);
  } else if (value.startsWith("\\")) {
    value = value;
  } else {
    value = `${currentFolder}\\${value}`;
    drive = value.slice(0, 2);
    value = value.slice(2);
  }

  const parts = [];
  for (const part of value.split("\\")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      parts.pop();
    } else {
      parts.push(part);
    }
  }

  return `${drive}\\${parts.join("\\")}`.replace(/\\+$/, parts.length ? "" : "\\");
}

function pathKey(path) {
  return normalizePath(path).toLowerCase();
}

function parentPath(path) {
  const normalized = normalizePath(path);
  if (/^[a-z]:\\$/i.test(normalized)) return normalized;
  const index = normalized.lastIndexOf("\\");
  return index < 2 ? `${normalized.slice(0, 2)}\\` : normalized.slice(0, index);
}

function baseName(path) {
  const normalized = normalizePath(path);
  return normalized.slice(normalized.lastIndexOf("\\") + 1);
}

function resolvePath(path, base = currentFolder) {
  const value = String(path || "").replace(/\//g, "\\");
  if (/^[a-z]:\\/i.test(value)) return normalizePath(value);
  if (/^[a-z]:$/i.test(value)) return `${value}\\`;
  if (value.startsWith("\\")) return normalizePath(`${currentFolder.slice(0, 2)}${value}`);
  return normalizePath(`${base}\\${value}`);
}

function getEntry(path) {
  return virtualFS.get(pathKey(path));
}

function addDirectory(path) {
  const normalized = normalizePath(path);
  if (getEntry(normalized)) return;
  virtualFS.set(pathKey(normalized), {
    path: normalized,
    type: "directory",
    attributes: new Set(["D"]),
    created: new Date("2026-10-09T04:42:18")
  });
}

function addFile(path, content) {
  const normalized = normalizePath(path);
  virtualFS.set(pathKey(normalized), {
    path: normalized,
    type: "file",
    content,
    attributes: new Set(),
    created: new Date("2026-10-09T04:42:18")
  });
}

function resetVirtualEnvironment() {
  virtualFS = new Map();
  for (const folder of systemFolders) addDirectory(folder);
  addDirectory("C:\\Windows\\System32\\drivers");
  addDirectory("C:\\Windows\\System32\\drivers\\etc");
  for (const [path, content] of seededFiles) addFile(path, content);
  processes = initialProcesses.map((process) => ({ ...process }));
  services = initialServices.map((service) => ({ ...service }));
  scheduledTasks = initialTasks.map((task) => ({ ...task }));
  routes = initialRoutes.map((route) => ({ ...route }));
  arpTable = initialArp.map((entry) => ({ ...entry }));
  associations = new Map([
    [".txt", "txtfile"],
    [".log", "txtfile"],
    [".exe", "exefile"],
    [".dll", "dllfile"],
    [".bat", "batfile"]
  ]);
  fileTypes = new Map([
    ["txtfile", "notepad.exe %1"],
    ["exefile", '"%1" %*'],
    ["dllfile", "rundll32.exe %1,%*"],
    ["batfile", '"%1" %*']
  ]);
}

function listChildren(path) {
  const key = pathKey(path);
  return [...virtualFS.values()].filter((entry) =>
    entry.path.toLowerCase() !== key &&
    pathKey(parentPath(entry.path)) === key
  );
}

function formatBytes(bytes) {
  return String(bytes).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function dosDate(date) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function dosTime(date) {
  const hours = date.getHours() % 12 || 12;
  return `${String(hours).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")} ${date.getHours() >= 12 ? "PM" : "AM"}`;
}

function wildcardRegex(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`, "i");
}

function expandVirtualPath(value, includeDirectories = true) {
  const normalized = resolvePath(value);
  if (!/[*?]/.test(normalized)) {
    const entry = getEntry(normalized);
    return entry ? [entry] : [];
  }

  const parent = parentPath(normalized);
  const pattern = wildcardRegex(baseName(normalized));
  return listChildren(parent).filter((entry) =>
    pattern.test(baseName(entry.path)) && (includeDirectories || entry.type === "file")
  );
}

function showDirectory(args = []) {
  const pathArg = args.find((arg) => !arg.startsWith("/"));
  const target = resolvePath(pathArg || currentFolder);
  const entry = pathArg && /[*?]/.test(pathArg)
    ? getEntry(parentPath(target))
    : getEntry(target);
  if (!entry) {
    addText(`File Not Found - ${pathArg || target}\n`);
    return;
  }

  let entries = entry.type === "directory" ? listChildren(entry.path) : [entry];
  const wildcard = pathArg && /[*?]/.test(pathArg);
  if (wildcard) {
    entries = expandVirtualPath(pathArg);
  }
  const folders = entries.filter((item) => item.type === "directory");
  const files = entries.filter((item) => item.type === "file");
  if (isSwitch(args, "/b")) {
    addText(entries.map((item) => baseName(item.path)).join("\n") + (entries.length ? "\n" : ""));
    return;
  }
  const lines = entries
    .sort((left, right) => left.type === right.type
      ? baseName(left.path).localeCompare(baseName(right.path))
      : left.type === "directory" ? -1 : 1)
    .map((item) => {
      const name = baseName(item.path);
      if (item.type === "directory") {
        return `${dosDate(item.created)}  ${dosTime(item.created)}    <DIR>          ${name}`;
      }
      return `${dosDate(item.created)}  ${dosTime(item.created)}    ${formatBytes(item.content.length).padStart(14)} ${name}`;
    });
  const fileBytes = files.reduce((sum, item) => sum + item.content.length, 0);
  addText(
    ` Volume in drive C has no label.\n Volume Serial Number is ${system.volumeSerial}\n\n` +
    ` Directory of ${entry.type === "file" ? parentPath(entry.path) : entry.path}\n\n` +
    `${lines.length ? `${lines.join("\n")}\n` : ""}` +
    `               ${files.length} File(s)      ${formatBytes(fileBytes)} bytes\n` +
    `               ${folders.length} Dir(s)   ${formatBytes(system.diskFreeBytes)} bytes free\n`
  );
}

function walkTree(path, prefix = "", lines = [], depth = 0, showFiles = false) {
  if (depth > 12) return lines;
  const children = listChildren(path).filter((entry) =>
    showFiles || entry.type === "directory"
  ).sort((left, right) =>
    left.type === right.type
      ? baseName(left.path).localeCompare(baseName(right.path))
      : left.type === "directory" ? -1 : 1
  );
  children.forEach((child, index) => {
    const last = index === children.length - 1;
    lines.push(`${prefix}${last ? "`---" : "+---"}${baseName(child.path)}`);
    if (child.type === "directory") {
      walkTree(child.path, `${prefix}${last ? "    " : "|   "}`, lines, depth + 1, showFiles);
    }
  });
  return lines;
}

function showIpconfig(args = []) {
  if (args.some((arg) => arg.toLowerCase() === "/flushdns")) {
    addText("Windows IP Configuration\n\nSuccessfully flushed the DNS Resolver Cache.\n");
    return;
  }
  const all = args.some((arg) => arg.toLowerCase() === "/all");
  addText(
    `Windows IP Configuration\n\n${all ? `   Host Name . . . . . . . . . . . . : ${system.hostName}\n` : ""}` +
    `\nEthernet adapter Ethernet:\n\n` +
    `   Connection-specific DNS Suffix  . : home\n` +
    `   Description . . . . . . . . . . . : Intel(R) Ethernet Connection\n` +
    `   Physical Address. . . . . . . . . : ${system.mac}\n` +
    `   DHCP Enabled. . . . . . . . . . . : Yes\n` +
    `   IPv4 Address. . . . . . . . . . . : ${system.ipv4}\n` +
    `   Subnet Mask . . . . . . . . . . . : ${system.subnet}\n` +
    `   Default Gateway . . . . . . . . . : ${system.gateway}\n` +
    `${all ? `   DNS Servers . . . . . . . . . . . : ${system.dnsServers.join("\n                                       : ")}\n` : ""}`
  );
}

function showSystemInfo() {
  addText(
    `Host Name:                 ${system.hostName}\n` +
    `OS Name:                   ${system.osName}\n` +
    `OS Version:                ${system.version} Build ${system.build}\n` +
    `OS Manufacturer:           Microsoft Corporation\n` +
    `OS Configuration:          Standalone Workstation\n` +
    `OS Build Type:             Multiprocessor Free\n` +
    `Registered Owner:          theo\n` +
    `Original Install Date:     ${system.installDate}\n` +
    `System Boot Time:          ${system.bootTime}\n` +
    `System Manufacturer:       ${system.manufacturer}\n` +
    `System Model:              ${system.model}\n` +
    `System Type:               ${system.systemType}\n` +
    `Processor(s):              1 Processor(s) Installed.\n` +
    `                           [01]: ${system.processor}\n` +
    `BIOS Version:              ${system.bios}\n` +
    `Windows Directory:         C:\\Windows\n` +
    `System Directory:          C:\\Windows\\System32\n` +
    `Boot Device:               \\Device\\HarddiskVolume1\n` +
    `Total Physical Memory:     ${formatBytes(system.memoryMb)} MB\n` +
    `Available Physical Memory:  9,216 MB\n` +
    `Virtual Memory: Max Size:   20,480 MB\n` +
    `Virtual Memory: Available:  12,288 MB\n` +
    `Virtual Memory: In Use:     8,192 MB\n` +
    `Domain:                    WORKGROUP\n` +
    `Network Card(s):            1 NIC(s) Installed.\n` +
    `                           [01]: Intel(R) Ethernet Connection\n` +
    `                                 IP address(es): ${system.ipv4}\n`
  );
}

function changeFolder(args) {
  const folder = args.join(" ");
  if (!folder) {
    addText(`${currentFolder}\n`);
    return;
  }
  const target = resolvePath(folder);
  const entry = getEntry(target);
  if (!entry || entry.type !== "directory") {
    addText(`The system cannot find the path specified.\n`);
    return;
  }
  currentFolder = entry.path;
  updatePrompt();
}

function changeColor(argument) {
  const colors = {
    "0a": "#39ff5a", "0b": "#47fff7", "0c": "#ff5555",
    "0d": "#ff55ff", "0e": "#ffff55", "0f": "#f2f2f2",
    green: "#39ff5a", red: "#ff5555", blue: "#47fff7",
    yellow: "#ffff55", white: "#f2f2f2"
  };
  const selected = colors[argument.trim().toLowerCase()];
  if (!selected) {
    addText("Invalid color code.\n");
    return;
  }
  document.body.style.color = selected;
  commandInput.style.color = selected;
  commandInput.style.caretColor = selected;
  addText("Color changed.\n");
}

function addFakeScanLines() {
  if (!running) return;
  let text = "";
  if (Math.random() > 0.78) text += `\n Directory of ${randomItem(systemFolders)}\n\n`;
  for (let i = 0; i < 20; i++) text += createFakeLine() + "\n";
  output.textContent += text;
  const lines = output.textContent.split("\n");
  if (lines.length > 260) output.textContent = lines.slice(-260).join("\n");
  terminal.scrollTop = terminal.scrollHeight;
}

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function createFakeLine() {
  const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, "0");
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, "0");
  const hour = String(Math.floor(Math.random() * 24)).padStart(2, "0");
  const minute = String(Math.floor(Math.random() * 60)).padStart(2, "0");
  const isFolder = Math.random() < 0.18;
  const name = isFolder
    ? randomItem(["System", "Temp", "Cache", "Logs", "Backup", "Data"])
    : randomItem(["config.sys", "system_cache.dat", "desktop.ini", "settings.json", "backup_2026.zip", "photo_001.jpg", "notes.txt", "runtime.dll", "network.log", "user_data.tmp"]);
  return `${day}/${month}/2026  ${hour}:${minute}    ${isFolder ? "<DIR>      " : "           "}${isFolder ? "          " : String(Math.floor(Math.random() * 9999999)).padStart(10, " ")} ${name}`;
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
  intervalId = setInterval(addFakeScanLines, 42);
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
  resetVirtualEnvironment();
  environment.set("PATH", "C:\\Windows\\System32;C:\\Windows;C:\\Program Files\\Google\\Chrome");
  associations.set(".txt", "txtfile");
  updatePrompt();
  history.textContent = `Microsoft Windows [Version ${system.version}.0000]\n(c) Microsoft Corporation. All rights reserved.\n\n\nType "help" for available commands.\n\n\n`;
  output.textContent = "";
  commandInput.value = "";
  commandInput.disabled = false;
  commandForm.style.display = "flex";
  document.body.style.color = "#39ff5a";
  commandInput.style.color = "#39ff5a";
  commandInput.style.caretColor = "#39ff5a";
  counter.style.display = "none";
  finished.style.display = "none";
  commandInput.focus();
}

const commandRegistry = new Map();

function registerCommand(command) {
  commandRegistry.set(command.name.toLowerCase(), command);
  for (const alias of command.aliases) commandRegistry.set(alias.toLowerCase(), command);
}

function findCommand(name) {
  return commandRegistry.get(name.toLowerCase());
}

function tokenize(input) {
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
  if (tokenStarted) tokens.push(token);
  return tokens;
}

function parseCommandLine(input) {
  let inQuotes = false;
  let redirectIndex = -1;
  let redirectMode = "";
  for (let index = 0; index < input.length; index++) {
    if (input[index] === '"') inQuotes = !inQuotes;
    if (!inQuotes && input[index] === ">") {
      redirectIndex = index;
      redirectMode = input[index + 1] === ">" ? "append" : "write";
      break;
    }
  }

  const commandText = redirectIndex < 0 ? input : input.slice(0, redirectIndex);
  const redirectText = redirectIndex < 0
    ? ""
    : input.slice(redirectIndex + (redirectMode === "append" ? 2 : 1)).trim();
  const tokens = tokenize(commandText.trim());
  const targets = redirectText ? tokenize(redirectText) : [];
  return {
    command: (tokens.shift() || "").toLowerCase(),
    args: tokens,
    redirect: redirectIndex < 0
      ? null
      : { mode: redirectMode, path: targets.join(" ") }
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
      `\nName: ${command.name}\nDescription: ${command.description}\n` +
      `Usage: ${command.usage}\n` +
      `Aliases: ${command.aliases.length ? command.aliases.join(", ") : "None"}\n\n`
    );
    return;
  }
  const commands = [...new Set(commandRegistry.values())];
  const nameWidth = Math.max(...commands.map(({ name }) => name.length));
  addText(
    `\nCommands available in this console:\n\n` +
    `${commands.map(({ name, description }) => `  ${name.padEnd(nameWidth)}  ${description}`).join("\n")}\n\n`
  );
}

function command(name, aliases, description, usage, execute) {
  registerCommand({ name, aliases, description, usage, execute });
}

function invalidUsage(name) {
  const entry = findCommand(name);
  addText(`Invalid syntax.\n${entry ? `Usage: ${entry.usage}\n` : ""}`);
}

function createDirectory(path) {
  const target = resolvePath(path);
  const components = target.match(/^[a-z]:\\|[^\\]+/gi) || [];
  let current = components[0] || "C:\\";
  if (!getEntry(current)) addDirectory(current);
  for (const component of components.slice(1)) {
    current = current.endsWith("\\") ? `${current}${component}` : `${current}\\${component}`;
    if (!getEntry(current)) addDirectory(current);
    else if (getEntry(current).type !== "directory") return false;
  }
  return true;
}

function moveEntry(sourcePath, destinationPath) {
  const source = getEntry(sourcePath);
  if (!source) return { error: "missing" };
  const requestedDestination = resolvePath(destinationPath);
  const destinationEntry = getEntry(requestedDestination);
  const target = destinationEntry?.type === "directory"
    ? resolvePath(baseName(source.path), requestedDestination)
    : requestedDestination;
  if (source.type === "directory" && pathKey(target).startsWith(`${pathKey(source.path)}\\`)) {
    return { error: "inside" };
  }
  if (!getEntry(parentPath(target)) || getEntry(parentPath(target)).type !== "directory") return { error: "parent" };
  if (getEntry(target)) return { error: "exists" };

  const affected = [...virtualFS.values()].filter((entry) =>
    pathKey(entry.path) === pathKey(source.path) ||
    pathKey(entry.path).startsWith(`${pathKey(source.path)}\\`)
  );
  for (const entry of affected) virtualFS.delete(pathKey(entry.path));
  for (const entry of affected) {
    const suffix = entry.path.slice(source.path.length);
    entry.path = `${target}${suffix}`;
    virtualFS.set(pathKey(entry.path), entry);
  }
  return { target };
}

function readFile(path) {
  const entry = getEntry(path);
  if (!entry || entry.type !== "file") return null;
  return entry.content;
}

function readLines(path) {
  const content = readFile(path);
  return content === null ? null : content.replace(/\r\n/g, "\n").split("\n");
}

function isSwitch(args, value) {
  const expected = value.toLowerCase();
  return args.some((arg) => {
    const actual = arg.toLowerCase();
    if (actual === expected) return true;
    return expected.length === 2 && expected.startsWith("-") && expected !== "-p" &&
      actual.startsWith("-") && actual.length > 2 && actual.slice(1).includes(expected[1]);
  });
}

function networkError(commandName, target) {
  addText(`'${target}' is not recognized as a valid host name or address for ${commandName}.\n`);
}

function simulatePing(target, count = 4) {
  if (!target || target.startsWith("-")) {
    invalidUsage("ping");
    return;
  }
  const known = target === "8.8.8.8" || target === system.gateway || target === system.ipv4 ||
    target.toLowerCase() === system.hostName.toLowerCase() || target.toLowerCase() === "google.com" ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(target);
  if (!known) {
    networkError("ping", target);
    return;
  }
  const address = target.toLowerCase() === "google.com" ? "142.250.72.14" :
    target.toLowerCase() === system.hostName.toLowerCase() ? system.ipv4 : target;
  const times = Array.from({ length: count }, (_, index) => 14 + ((index * 7 + target.length) % 19));
  addText(
    `Pinging ${target} [${address}] with 32 bytes of data:\n` +
    times.map((time) => `Reply from ${address}: bytes=32 time=${time}ms TTL=${address === system.ipv4 ? 128 : 117}`).join("\n") +
    `\n\nPing statistics for ${address}:\n` +
    `    Packets: Sent = ${count}, Received = ${count}, Lost = 0 (0% loss),\n` +
    `Approximate round trip times in milli-seconds:\n` +
    `    Minimum = ${Math.min(...times)}ms, Maximum = ${Math.max(...times)}ms, Average = ${Math.round(times.reduce((a, b) => a + b, 0) / count)}ms\n`
  );
}

function showNetstat(args) {
  const listening = isSwitch(args, "-n") || isSwitch(args, "-a");
  const showPid = isSwitch(args, "-o");
  let rows = networkConnections.filter((item) =>
    processes.some((process) => process.pid === item.pid) &&
    (listening || item.state !== "LISTENING") &&
    (isSwitch(args, "-p") ? item.protocol.toLowerCase() === args[args.findIndex((arg) => arg.toLowerCase() === "-p") + 1]?.toLowerCase() : true)
  );
  if (isSwitch(args, "-e")) {
    addText("Interface Statistics\n\n                            Received            Sent\nBytes                        9823418           6042231\nUnicast packets                84321             77102\nErrors                             0                 0\n");
    return;
  }
  if (isSwitch(args, "-r")) {
    showRouteTable();
    return;
  }
  addText(
    `Active Connections\n\n  Proto  Local Address          Foreign Address        State${showPid ? "           PID" : ""}\n` +
    rows.map((item) =>
      `  ${item.protocol.padEnd(5)} ${item.local.padEnd(22)} ${item.remote.padEnd(22)} ${item.state.padEnd(13)}${showPid ? ` ${item.pid}` : ""}`
    ).join("\n") + "\n"
  );
}

function showRouteTable() {
  addText(
    `===========================================================================\n` +
    `Interface List\n ${system.ipv4} ... A4-5E-60-2B-19-7C ...... Intel(R) Ethernet Connection\n` +
    `===========================================================================\n` +
    `IPv4 Route Table\n` +
    `===========================================================================\n` +
    `Active Routes:\n` +
    `Network Destination        Netmask          Gateway       Interface  Metric\n` +
    routes.map((route) =>
      `${route.network.padEnd(27)} ${route.mask.padEnd(16)} ${route.gateway.padEnd(13)} ${route.interface.padEnd(11)} ${route.metric}`
    ).join("\n") +
    `\nPersistent Routes:\n  None\n`
  );
}

function showArpTable() {
  addText(
    `Interface: ${system.ipv4} --- 0x8\n  Internet Address      Physical Address      Type\n` +
    arpTable.map((item) =>
      `  ${item.ip.padEnd(22)} ${item.mac.padEnd(21)} ${item.type}`
    ).join("\n") + "\n"
  );
}

function showDriverQuery() {
  addText(
    `Module Name  Display Name                  Driver Type   Link Date\n` +
    `============ ============================= ============= =====================\n` +
    `ACPI         Microsoft ACPI Driver         Kernel        06/21/2006\n` +
    `disk         Disk Driver                   Kernel        06/21/2006\n` +
    `NDIS         NDIS System Driver            Kernel        06/21/2006\n` +
    `tcpip        TCP/IP Protocol Driver        Kernel        06/21/2006\n` +
    `W32Time      Windows Time Service          Share         06/21/2006\n`
  );
}

function showTasklist(args) {
  const filterIndex = args.findIndex((arg) => arg.toLowerCase() === "/fi");
  const filter = filterIndex >= 0 ? args[filterIndex + 1] : "";
  let rows = processes;
  const match = filter.match(/^(imagename|pid|sessionname)\s*(?:eq|ne)\s*(.+)$/i);
  if (match) {
    const [, key, operator, rawValue] = match;
    const value = rawValue.replace(/^"|"$/g, "").toLowerCase();
    rows = rows.filter((process) => {
      const actual = key.toLowerCase() === "imagename" ? process.image :
        key.toLowerCase() === "pid" ? String(process.pid) : process.session;
      return (actual.toLowerCase() === value) === (operator.toLowerCase() === "eq");
    });
  }
  if (isSwitch(args, "/fo") && args[args.findIndex((arg) => arg.toLowerCase() === "/fo") + 1]?.toLowerCase() === "csv") {
    addText(`"Image Name","PID","Session Name","Session#","Mem Usage"\n` +
      rows.map((p) => `"${p.image}",${p.pid},"${p.session}",1,"${p.memory}"`).join("\n") + "\n");
    return;
  }
  addText(
    `Image Name                     PID Session Name        Session#    Mem Usage\n` +
    `========================= ======== ================ =========== ============\n` +
    rows.map((p) => `${p.image.padEnd(26)} ${String(p.pid).padStart(7)} ${p.session.padEnd(17)}         1 ${p.memory.padStart(11)}`).join("\n") +
    `\n\n${rows.length} processes\n`
  );
}

function showServices() {
  addText("SERVICE_NAME: " + services.map((service) => service.name).join("\nSERVICE_NAME: ") + "\n");
}

function runAdminCheck(commandName, mode) {
  if (commandName === "sfc") {
    if (!isSwitch(mode, "/scannow") && !isSwitch(mode, "/verifyonly")) {
      invalidUsage("sfc");
      return;
    }
    const verify = isSwitch(mode, "/verifyonly");
    addText(
      `Beginning system scan. This process will take some time.\n` +
      `Beginning verification phase of system scan.\nVerification ${verify ? "100" : "100"}% complete.\n` +
      (verify
        ? "Windows Resource Protection did not find any integrity violations.\n"
        : "Windows Resource Protection found corrupt files and successfully repaired them.\n")
    );
  } else if (commandName === "dism") {
    if (!isSwitch(mode, "/online") || !isSwitch(mode, "/cleanup-image")) {
      invalidUsage("dism");
      return;
    }
    const action = mode.find((arg) => /^\/(scanhealth|checkhealth|restorehealth)$/i.test(arg));
    if (!action) {
      invalidUsage("dism");
      return;
    }
    const verb = action.slice(1).toLowerCase();
    addText(
      `Deployment Image Servicing and Management tool\nVersion: ${system.version}.0000\n\n` +
      `Image Version: ${system.version}.0000\n\n` +
      `${verb === "restorehealth" ? "The restore operation completed successfully." : "No component store corruption detected."}\nThe operation completed successfully.\n`
    );
  } else if (commandName === "chkdsk") {
    const target = mode.find((arg) => !arg.startsWith("/")) || "C:";
    const disk = target.replace(/:.*$/, "").toUpperCase();
    addText(
      `The type of the file system is NTFS.\n` +
      `Volume label is Windows.\n\n` +
      `WARNING!  /F parameter not specified.\n` +
      `Running CHKDSK in read-only mode.\n\n` +
      `Stage 1: Examining basic file system structure ... 100% complete.\n` +
      `Stage 2: Examining file name linkage ... 100% complete.\n` +
      `Stage 3: Examining security descriptors ... 100% complete.\n` +
      `Windows has scanned the file system and found no problems.\n` +
      `${formatBytes(system.diskFreeBytes)} bytes available on ${disk}:\n`
    );
  }
}

function registerCommands() {
  command("dir", [], "Lists files or starts the fake recursive scan with /s.", "dir [path] [/s] [/b] [/a]", (args) => {
    if (isSwitch(args, "/s") && !args.some((arg) => !arg.startsWith("/"))) startTerminal();
    else showDirectory(args);
  });
  command("clear", ["cls"], "Clears the console.", "cls", () => clearTerminal());
  command("help", ["/?"], "Displays available commands or detailed command help.", "help [command]", (args) => showHelp(args[0]));
  command("echo", [], "Displays a message or turns command echoing on or off.", "echo [text|ON|OFF]", (args) => {
    const text = args.join(" ");
    addText(`${text.toUpperCase() === "OFF" ? "" : text.toUpperCase() === "ON" ? "ECHO is on." : text}\n`);
  });

  command("hostname", [], "Displays the computer name.", "hostname", () => addText(`${system.hostName}\n`));
  command("ver", [], "Displays the Windows version.", "ver", () => addText(`Microsoft Windows [Version ${system.version}.0000]\n`));
  command("systeminfo", [], "Displays detailed system configuration.", "systeminfo", () => showSystemInfo());
  command("whoami", [], "Displays the current user.", "whoami", () => addText(`${system.userName}\n`));
  command("date", [], "Displays the current date.", "date [/t]", (args) => {
    addText(`The current date is: ${new Date().toLocaleDateString("en-GB")}${isSwitch(args, "/t") ? "" : "\nEnter the new date: (simulated; system date unchanged)\n"}`);
  });
  command("time", [], "Displays the current time.", "time [/t]", (args) => {
    addText(`The current time is: ${new Date().toLocaleTimeString("en-GB")}${isSwitch(args, "/t") ? "" : "\nEnter the new time: (simulated; system time unchanged)\n"}`);
  });
  command("driverquery", [], "Lists installed drivers (simulated).", "driverquery [/v] [/si]", () => showDriverQuery());
  command("tasklist", [], "Lists running processes (simulated).", "tasklist [/fi filter] [/fo table|csv]", (args) => showTasklist(args));
  command("taskkill", [], "Ends a simulated process without affecting the computer.", "taskkill /pid PID | /im IMAGE [/f] [/t]", (args) => {
    const pidIndex = args.findIndex((arg) => arg.toLowerCase() === "/pid");
    const imageIndex = args.findIndex((arg) => arg.toLowerCase() === "/im");
    const byPid = pidIndex >= 0;
    const selector = byPid ? args[pidIndex + 1] : imageIndex >= 0 ? args[imageIndex + 1] : "";
    if (!selector) {
      invalidUsage("taskkill");
      return;
    }
    const targets = processes.filter((process) => byPid
      ? process.pid === Number(selector)
      : process.image.toLowerCase() === selector.toLowerCase());
    const protectedProcess = targets.find((process) => process.pid === 0 || process.pid === 4);
    if (protectedProcess) {
      addText(`ERROR: The process "${protectedProcess.image}" with PID ${protectedProcess.pid} cannot be terminated.\n`);
      return;
    }
    if (!targets.length) {
      addText(`ERROR: The process "${selector}" not found.\n`);
      return;
    }
    processes = processes.filter((process) => !targets.includes(process));
    for (const process of targets) addText(`SUCCESS: The process "${process.image}" with PID ${process.pid} has been terminated.\n`);
  });
  command("wmic", [], "Queries simulated Windows Management Instrumentation data.", "wmic [cpu|os|computersystem|process [list brief]]", (args) => {
    const subject = (args.find((arg) => !arg.startsWith("/")) || "os").toLowerCase();
    if (subject === "cpu") addText(`Name=${system.processor}\nNumberOfCores=8\nNumberOfLogicalProcessors=8\n`);
    else if (subject === "computersystem") addText(`Name=${system.hostName}\nManufacturer=${system.manufacturer}\nModel=${system.model}\nTotalPhysicalMemory=${system.memoryMb * 1024 * 1024}\n`);
    else if (subject === "process") addText(`Name                 ProcessId\n${processes.map((p) => `${p.image.padEnd(21)} ${p.pid}`).join("\n")}\n`);
    else if (subject === "os") addText(`Caption=${system.osName}\nBuildNumber=${system.build}\nCSName=${system.hostName}\nOSArchitecture=64-bit\n`);
    else invalidUsage("wmic");
  });

  command("ping", [], "Tests connectivity using simulated replies; no network requests are made.", "ping [-n count] target", (args) => {
    let count = 4;
    const countIndex = args.findIndex((arg) => arg.toLowerCase() === "-n");
    if (countIndex >= 0) {
      count = Number(args[countIndex + 1]);
      args.splice(countIndex, 2);
      if (!Number.isInteger(count) || count < 1 || count > 10) {
        addText("Bad value for option -n. Count must be between 1 and 10.\n");
        return;
      }
    }
    simulatePing(args.find((arg) => !arg.startsWith("-")), count);
  });
  command("tracert", [], "Shows a simulated route to a destination.", "tracert [-d] [-h maximum_hops] target", (args) => {
    const target = args.find((arg) => !arg.startsWith("-"));
    if (!target) return invalidUsage("tracert");
    const known = target === "8.8.8.8" || target.toLowerCase() === "google.com" || target === system.gateway;
    if (!known) return networkError("tracert", target);
    const destination = target.toLowerCase() === "google.com" ? "142.250.72.14" : target;
    addText(`Tracing route to ${target} [${destination}]\nover a maximum of 30 hops:\n\n` +
      `  1     1 ms     1 ms     2 ms  ${system.gateway}\n` +
      `  2    12 ms    11 ms    13 ms  10.10.0.1\n` +
      `  3    18 ms    16 ms    17 ms  ${destination}\n\nTrace complete.\n`);
  });
  command("nslookup", [], "Looks up a host using the simulated DNS resolver.", "nslookup [name]", (args) => {
    const target = args[0];
    if (!target) {
      addText(`Default Server:  router.home\nAddress:  ${system.gateway}\n\n`);
      return;
    }
    const known = target.toLowerCase() === "google.com" || target.toLowerCase() === system.hostName.toLowerCase() ||
      /^\d{1,3}(?:\.\d{1,3}){3}$/.test(target);
    if (!known) {
      addText(`Server:  router.home\nAddress:  ${system.gateway}\n\n*** router.home can't find ${target}: Non-existent domain\n`);
      return;
    }
    const address = target.toLowerCase() === "google.com" ? "142.250.72.14" : system.ipv4;
    addText(`Server:  router.home\nAddress:  ${system.gateway}\n\nName:    ${target}\nAddress: ${address}\n`);
  });
  command("netstat", [], "Displays simulated network connections and listening ports.", "netstat [-a] [-n] [-o] [-p protocol] [-r]", (args) => showNetstat(args));
  command("arp", [], "Displays the simulated ARP cache.", "arp -a | -d address", (args) => {
    if (isSwitch(args, "-d")) {
      const target = args[args.findIndex((arg) => arg.toLowerCase() === "-d") + 1];
      if (!target) return invalidUsage("arp");
      const priorLength = arpTable.length;
      arpTable = arpTable.filter((item) => item.ip !== target);
      addText(priorLength === arpTable.length ? "The entry was not found.\n" : `ARP entry ${target} deleted (simulated).\n`);
    } else showArpTable();
  });
  command("route", [], "Displays or changes the simulated IP routing table.", "route print | route add network mask mask gateway | route delete network", (args) => {
    const action = args[0]?.toLowerCase();
    if (!action || action === "print") return showRouteTable();
    if (action === "delete" && args[1]) {
      routes = routes.filter((route) => route.network !== args[1]);
      addText(`OK!\n`);
      return;
    }
    if (action === "add") {
      const values = args.slice(1);
      const gatewayIndex = values.findIndex((arg) => arg.toLowerCase() === "mask");
      const gateway = values[ gatewayIndex + 2 ];
      if (values.length < 4 || !gateway) return invalidUsage("route");
      routes.push({ network: values[0], mask: values[gatewayIndex + 1], gateway, interface: system.ipv4, metric: 25 });
      addText("OK! Route added to simulated routing table.\n");
      return;
    }
    invalidUsage("route");
  });
  command("getmac", [], "Displays the simulated network adapter MAC address.", "getmac [/v] [/fo list|table]", () => addText(
    `Physical Address    Transport Name\n=================== ==========================================================\n${system.mac}      \\Device\\Tcpip_{A42B19C7-2D31-4C5E-9F10-123456789ABC}\n`
  ));
  command("pathping", [], "Combines simulated route tracing and packet statistics.", "pathping [-n] target", (args) => {
    const target = args.find((arg) => !arg.startsWith("-"));
    if (!target) return invalidUsage("pathping");
    if (!(target === "8.8.8.8" || target.toLowerCase() === "google.com" || target === system.gateway)) return networkError("pathping", target);
    addText(`Tracing route to ${target} over a maximum of 30 hops:\n  0  ${system.hostName} [${system.ipv4}]\n  1  ${system.gateway}\n  2  ${target}\n\nComputing statistics for 50 seconds...\nSource to Here   This Node/Link\nHop  RTT    Lost/Sent = Pct  Address\n  0   1ms    0/ 10 =  0%  ${system.hostName}\n  1  2ms    0/ 10 =  0%  ${system.gateway}\n  2 18ms    0/ 10 =  0%  ${target}\n`);
  });
  command("nbtstat", [], "Displays simulated NetBIOS over TCP/IP information.", "nbtstat [-n] [-c] [-a name]", (args) => {
    if (isSwitch(args, "-c")) addText(`Node IpAddress: [${system.ipv4}] Scope Id: []\n\n    NetBIOS Remote Cache Name Table\n    Name               Type         Host Address    Life\n    ${system.hostName.padEnd(18)} <20>  UNIQUE       ${system.ipv4}     600\n`);
    else addText(`Ethernet:\nNode IpAddress: [${system.ipv4}] Scope Id: []\n\n                NetBIOS Local Name Table\n       Name               Type         Status\n    ${system.hostName.padEnd(19)} <00>  UNIQUE      Registered\n    WORKGROUP          <00>  GROUP       Registered\n    ${system.hostName.padEnd(19)} <20>  UNIQUE      Registered\n`);
  });

  command("tree", [], "Displays the virtual directory structure recursively.", "tree [path] [/f]", (args) => {
    const targetArg = args.find((arg) => !arg.startsWith("/")) || currentFolder;
    const target = resolvePath(targetArg);
    const entry = getEntry(target);
    if (!entry || entry.type !== "directory") {
      addText("The system cannot find the path specified.\n");
      return;
    }
    const lines = [`Folder PATH listing for volume Windows`, `${entry.path}`];
    const treeLines = walkTree(entry.path, "", [], 0, isSwitch(args, "/f"));
    addText(`${lines.join("\n")}\n${treeLines.join("\n")}\n`);
  });
  command("cd", ["chdir"], "Changes the current virtual directory or displays it.", "cd [path]", (args) => changeFolder(args));
  command("mkdir", ["md"], "Creates one or more virtual directories.", "mkdir directory [...]", (args) => {
    const paths = args.filter((arg) => !arg.startsWith("/"));
    if (!paths.length) return invalidUsage("mkdir");
    for (const path of paths) {
      if (getEntry(resolvePath(path))?.type === "file") addText(`A file with the name ${path} already exists.\n`);
      else if (!createDirectory(path)) addText(`The directory could not be created: ${path}\n`);
    }
  });
  command("rmdir", ["rd"], "Removes an empty virtual directory; /s removes its contents.", "rmdir [/s] [/q] directory", (args) => {
    const targetArg = args.find((arg) => !arg.startsWith("/"));
    if (!targetArg) return invalidUsage("rmdir");
    const target = resolvePath(targetArg);
    const entry = getEntry(target);
    if (!entry || entry.type !== "directory") return addText("The system cannot find the path specified.\n");
    if (pathKey(target) === "c:\\") return addText("The system cannot remove the root directory.\n");
    const descendants = [...virtualFS.values()].filter((item) => pathKey(item.path).startsWith(`${pathKey(target)}\\`));
    if (descendants.length && !isSwitch(args, "/s")) return addText("The directory is not empty.\n");
    for (const child of descendants) virtualFS.delete(pathKey(child.path));
    virtualFS.delete(pathKey(entry.path));
    if (pathKey(currentFolder) === pathKey(target) || pathKey(currentFolder).startsWith(`${pathKey(target)}\\`)) {
      currentFolder = parentPath(target);
      updatePrompt();
    }
    if (!isSwitch(args, "/q")) addText(`${target} removed.\n`);
  });
  command("copy", [], "Copies a virtual file to another virtual path.", "copy source destination", (args) => {
    const paths = args.filter((arg) => !arg.startsWith("/"));
    if (paths.length !== 2) return invalidUsage("copy");
    const sources = expandVirtualPath(paths[0], false);
    if (!sources.length) return addText("The system cannot find the file specified.\n");
    const destination = resolvePath(paths[1]);
    const destinationEntry = getEntry(destination);
    for (const source of sources) {
      const target = destinationEntry?.type === "directory" ? resolvePath(baseName(source.path), destination) : destination;
      if (!getEntry(parentPath(target)) || getEntry(parentPath(target)).type !== "directory") return addText("The system cannot find the path specified.\n");
      if (getEntry(target)) return addText("Overwrite destination file? (Y/N): N\n");
      addFile(target, source.content);
    }
    addText(`${sources.length} file(s) copied.\n`);
  });
  command("xcopy", [], "Copies files or a directory tree within the virtual file system.", "xcopy source destination [/s] [/e] [/i] [/y]", (args) => {
    const paths = args.filter((arg) => !arg.startsWith("/"));
    if (paths.length !== 2) return invalidUsage("xcopy");
    const sourcePath = resolvePath(paths[0]);
    const source = getEntry(sourcePath);
    if (!source) return addText("File not found - " + paths[0] + "\n");
    if (source.type === "file") {
      const target = getEntry(resolvePath(paths[1]))?.type === "directory"
        ? resolvePath(baseName(source.path), resolvePath(paths[1]))
        : resolvePath(paths[1]);
      if (!getEntry(parentPath(target))) return addText("Invalid path.\n");
      addFile(target, source.content);
      addText("1 File(s) copied\n");
      return;
    }
    const destination = resolvePath(paths[1]);
    if (!createDirectory(destination)) return addText("Invalid path.\n");
    const sourceEntries = [...virtualFS.values()].filter((entry) =>
      pathKey(entry.path).startsWith(`${pathKey(source.path)}\\`)
    ).sort((left, right) => left.type === right.type
      ? left.path.localeCompare(right.path)
      : left.type === "directory" ? -1 : 1);
    for (const entry of sourceEntries) {
      const suffix = entry.path.slice(source.path.length);
      const target = `${destination}${suffix}`;
      if (entry.type === "directory") createDirectory(target);
      else if (isSwitch(args, "/s") || isSwitch(args, "/e")) {
        if (getEntry(target) && !isSwitch(args, "/y")) {
          addText(`Overwrite ${target}? (Y/N): N\n`);
          continue;
        }
        addFile(target, entry.content);
      }
    }
    addText(`${sourceEntries.filter((entry) => entry.type === "file").length} File(s) copied\n`);
  });
  command("move", [], "Moves or renames a virtual file or directory.", "move source destination", (args) => {
    const paths = args.filter((arg) => !arg.startsWith("/"));
    if (paths.length !== 2) return invalidUsage("move");
    const result = moveEntry(paths[0], paths[1]);
    if (result.error === "missing") addText("The system cannot find the file specified.\n");
    else if (result.error === "parent") addText("The system cannot find the path specified.\n");
    else if (result.error === "exists") addText("A file or directory with that name already exists.\n");
    else if (result.error === "inside") addText("Cannot move a directory into itself.\n");
    else addText("        1 file(s) moved.\n");
  });
  command("del", ["erase"], "Deletes virtual files; it never touches files on the computer.", "del [/q] [/s] file [...]", (args) => {
    const paths = args.filter((arg) => !arg.startsWith("/"));
    if (!paths.length) return invalidUsage("del");
    let deleted = 0;
    for (const path of paths) {
      let matches = expandVirtualPath(path, false);
      if (isSwitch(args, "/s") && /[*?]/.test(path)) {
        const target = resolvePath(path);
        const root = parentPath(target);
        const pattern = wildcardRegex(baseName(target));
        matches = [...virtualFS.values()].filter((entry) =>
          entry.type === "file" &&
          pathKey(parentPath(entry.path)).startsWith(pathKey(root)) &&
          pattern.test(baseName(entry.path))
        );
      }
      if (!matches.length) {
        addText(`Could Not Find ${path}\n`);
        continue;
      }
      for (const entry of matches) {
        virtualFS.delete(pathKey(entry.path));
        deleted++;
      }
    }
    if (!isSwitch(args, "/q")) addText(`${deleted} file(s) deleted.\n`);
  });
  command("type", [], "Displays the contents of virtual text files.", "type file [...]", (args) => {
    if (!args.length) return invalidUsage("type");
    for (const path of args) {
      const content = readFile(resolvePath(path));
      if (content === null) addText(`The system cannot find the file specified: ${path}\n`);
      else addText(content.endsWith("\n") ? content : `${content}\n`);
    }
  });
  command("more", [], "Displays the contents of virtual files page by page (all pages shown here).", "more file [...]", (args) => {
    if (!args.length) return invalidUsage("more");
    for (const path of args) {
      const content = readFile(resolvePath(path));
      if (content === null) addText(`The system cannot find the file specified: ${path}\n`);
      else addText(content.endsWith("\n") ? content : `${content}\n`);
    }
  });
  command("ren", ["rename"], "Renames a virtual file or directory.", "ren source newname", (args) => {
    if (args.length !== 2 || args[1].includes("\\") || args[1].includes("/")) return invalidUsage("ren");
    const sourcePath = resolvePath(args[0]);
    const source = getEntry(sourcePath);
    if (!source) return addText("The system cannot find the file specified.\n");
    const result = moveEntry(sourcePath, resolvePath(args[1], parentPath(sourcePath)));
    if (result.error === "exists") addText("A file or directory with that name already exists.\n");
    else if (result.error) addText("The system cannot find the path specified.\n");
    else addText("");
  });
  command("attrib", [], "Displays or changes virtual file attributes.", "attrib [+R|-R] [+H|-H] [+S|-S] [path]", (args) => {
    const changes = args.filter((arg) => /^[+-][rhs]$/i.test(arg));
    const paths = args.filter((arg) => !arg.startsWith("/")).filter((arg) => !/^[+-][rhs]$/i.test(arg));
    const matches = paths.length ? paths.flatMap((path) => expandVirtualPath(path)) : [getEntry(currentFolder)];
    if (!matches.filter(Boolean).length) return addText("File not found.\n");
    for (const entry of matches.filter(Boolean)) {
      for (const change of changes) {
        if (change[0] === "+") entry.attributes.add(change[1].toUpperCase());
        else entry.attributes.delete(change[1].toUpperCase());
      }
      const attrs = ["R", "H", "S", "A"].map((attribute) =>
        entry.attributes.has(attribute) ? attribute : " "
      ).join("");
      addText(`${attrs}    ${entry.path}\n`);
    }
  });
  command("where", [], "Searches virtual PATH directories for files.", "where [path;path] pattern", (args) => {
    const pattern = args.at(-1);
    if (!pattern) return invalidUsage("where");
    const requestedPaths = args.length > 1 ? args.slice(0, -1).join(" ").split(";") : (environment.get("PATH") || "").split(";");
    const regex = wildcardRegex(pattern);
    const found = [...virtualFS.values()].filter((entry) =>
      entry.type === "file" && requestedPaths.some((path) =>
        pathKey(parentPath(entry.path)) === pathKey(resolvePath(path)) && regex.test(baseName(entry.path))
      )
    );
    if (!found.length) addText(`INFO: Could not find files for the given pattern(s).\n`);
    else addText(`${found.map((entry) => entry.path).join("\n")}\n`);
  });
  command("find", [], "Searches for text in virtual files.", "find [/i] [/n] [/v] [/c] \"string\" file [...]", (args) => {
    const switches = args.filter((arg) => arg.startsWith("/"));
    const rest = args.filter((arg) => !arg.startsWith("/"));
    const needle = rest.shift();
    if (!needle || !rest.length) return invalidUsage("find");
    for (const file of rest) {
      const lines = readLines(resolvePath(file));
      if (!lines) {
        addText(`---------- ${file}\nThe system cannot find the file specified.\n`);
        continue;
      }
      const matches = lines.map((line, index) => ({ line, index })).filter(({ line }) =>
        (isSwitch(switches, "/i") ? line.toLowerCase().includes(needle.toLowerCase()) : line.includes(needle)) !== isSwitch(switches, "/v")
      );
      if (!isSwitch(switches, "/c") && !isSwitch(switches, "/n")) addText(`---------- ${file}\n`);
      if (isSwitch(switches, "/c")) addText(`${matches.length}\n`);
      else for (const match of matches) addText(`${isSwitch(switches, "/n") ? `${match.index + 1}:` : ""}${match.line}\n`);
    }
  });
  command("findstr", [], "Searches for text patterns in virtual files.", "findstr [/i] [/n] [/s] [/r] pattern [file ...]", (args) => {
    const switches = args.filter((arg) => arg.startsWith("/"));
    const rest = args.filter((arg) => !arg.startsWith("/"));
    const pattern = rest.shift();
    if (!pattern || !rest.length) return invalidUsage("findstr");
    let regex;
    try {
      regex = isSwitch(switches, "/r") ? new RegExp(pattern, isSwitch(switches, "/i") ? "i" : "") :
        new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), isSwitch(switches, "/i") ? "i" : "");
    } catch (error) {
      addText(`FINDSTR: Regular expression error.\n`);
      return;
    }
    const files = new Set();
    for (const target of rest) {
      const matches = expandVirtualPath(target, false);
      for (const match of matches) files.add(match.path);
      if (isSwitch(switches, "/s")) {
        const targetPath = resolvePath(target);
        const directory = getEntry(targetPath)?.type === "directory" ? targetPath : parentPath(targetPath);
        for (const entry of virtualFS.values()) {
          if (entry.type === "file" && pathKey(entry.path).startsWith(`${pathKey(directory)}\\`)) files.add(entry.path);
        }
      }
    }
    let found = false;
    for (const file of files) {
      const lines = readLines(file) || [];
      lines.forEach((line, index) => {
        if (regex.test(line)) {
          found = true;
          addText(`${isSwitch(switches, "/n") ? `${index + 1}:` : ""}${file}:${line}\n`);
        }
      });
    }
    if (!found) addText("FINDSTR: Cannot open file or no matching lines found.\n");
  });
  command("fc", [], "Compares the contents of two virtual files.", "fc [/b] file1 file2", (args) => {
    const files = args.filter((arg) => !arg.startsWith("/"));
    if (files.length !== 2) return invalidUsage("fc");
    const left = readLines(resolvePath(files[0]));
    const right = readLines(resolvePath(files[1]));
    if (!left || !right) return addText("FC: Cannot open one or both files.\n");
    if (left.join("\n") === right.join("\n")) addText("FC: no differences encountered\n");
    else {
      addText(`Comparing files ${files[0]} and ${files[1]}\n`);
      const max = Math.max(left.length, right.length);
      for (let index = 0; index < max; index++) {
        if (left[index] !== right[index]) addText(`***** ${index + 1} *****\n${left[index] || ""}\n***** ${index + 1} *****\n${right[index] || ""}\n`);
      }
    }
  });

  command("set", [], "Displays or changes simulated environment variables.", "set [variable=[string]]", (args) => {
    if (!args.length) {
      addText([...environment].map(([key, value]) => `${key}=${value}`).sort((a, b) => a.localeCompare(b)).join("\n") + "\n");
      return;
    }
    const assignment = args.join(" ");
    const separator = assignment.indexOf("=");
    if (separator < 0) {
      const matching = [...environment].filter(([key]) => key.toLowerCase().startsWith(assignment.toLowerCase()));
      if (!matching.length) addText("Environment variable not defined\n");
      else addText(matching.map(([key, value]) => `${key}=${value}`).join("\n") + "\n");
      return;
    }
    const key = assignment.slice(0, separator);
    if (!key) return invalidUsage("set");
    if (assignment.slice(separator + 1)) environment.set(key, assignment.slice(separator + 1));
    else environment.delete(key);
  });
  command("path", [], "Displays or sets the simulated executable search path.", "path [path;path]", (args) => {
    if (!args.length) addText(`PATH=${environment.get("PATH") || ""}\n`);
    else environment.set("PATH", args.join(" "));
  });
  command("assoc", [], "Displays or changes simulated file-extension associations.", "assoc [.ext[=fileType]]", (args) => {
    if (!args.length) addText([...associations].sort().map(([extension, type]) => `${extension}=${type}`).join("\n") + "\n");
    else {
      const [extension, type] = args.join(" ").split("=", 2);
      if (!extension.startsWith(".")) return invalidUsage("assoc");
      if (type === undefined) addText(associations.has(extension) ? `${extension}=${associations.get(extension)}\n` : "File association not found.\n");
      else if (type) associations.set(extension, type);
      else associations.delete(extension);
    }
  });
  command("ftype", [], "Displays or changes simulated file-type open commands.", "ftype [fileType[=command]]", (args) => {
    if (!args.length) addText([...fileTypes].sort().map(([type, action]) => `${type}=${action}`).join("\n") + "\n");
    else {
      const [type, action] = args.join(" ").split("=", 2);
      if (action === undefined) addText(fileTypes.has(type) ? `${type}=${fileTypes.get(type)}\n` : "File type not found.\n");
      else if (action) fileTypes.set(type, action);
      else fileTypes.delete(type);
    }
  });
  command("title", [], "Sets the terminal window title.", "title [text]", (args) => {
    document.title = args.join(" ") || "cmd.exe";
  });
  command("color", [], "Changes the terminal text color.", "color <code>", (args) => changeColor(args[0] || ""));
  command("pause", [], "Simulates the CMD pause prompt.", "pause", () => addText("Press any key to continue . . . (simulated)\n"));
  command("start", [], "Simulates starting a program; no external program is launched.", "start [title] [command|path]", (args) => {
    const target = args.filter((arg) => arg).at(-1);
    if (!target) {
      addText("A new simulated command window would be opened.\n");
      return;
    }
    const entry = getEntry(resolvePath(target));
    addText(entry?.type === "file"
      ? `Starting ${target} (simulated).\n`
      : `Starting "${target}" (simulated; no application was launched).\n`);
  });
  command("exit", [], "Closes the simulated command session.", "exit", () => {
    addText("Session closed. Refresh the page or use Restart to begin again.\n");
    commandInput.disabled = true;
  });
  command("stop", [], "Reports that no scan is currently running.", "stop", () => addText("No scan is currently running.\n"));

  command("sc", [], "Queries or controls simulated Windows services.", "sc query [service] | sc start|stop service", (args) => {
    const action = args[0]?.toLowerCase();
    const name = args[1];
    if (!action || action === "query") {
      const selected = name ? services.filter((service) => service.name.toLowerCase() === name.toLowerCase()) : services;
      if (!selected.length) return addText("[SC] EnumQueryServicesStatus:OpenService FAILED 1060:\nThe specified service does not exist as an installed service.\n");
      for (const service of selected) addText(`SERVICE_NAME: ${service.name}\n        TYPE               : 20  WIN32_SHARE_PROCESS\n        STATE              : ${service.state === "RUNNING" ? "4  RUNNING" : "1  STOPPED"}\n        DISPLAY_NAME       : ${service.display}\n`);
      return;
    }
    if (!["start", "stop"].includes(action) || !name) return invalidUsage("sc");
    const service = services.find((item) => item.name.toLowerCase() === name.toLowerCase());
    if (!service) return addText("[SC] OpenService FAILED 1060:\nThe specified service does not exist as an installed service.\n");
    service.state = action === "start" ? "RUNNING" : "STOPPED";
    addText(`[SC] ${action === "start" ? "StartService" : "ControlService"} SUCCESS\n${service.name} is now ${service.state} (simulated).\n`);
  });
  command("schtasks", [], "Lists or simulates scheduled task operations.", "schtasks /query | /run /tn taskname", (args) => {
    if (isSwitch(args, "/query") || !args.length) {
      addText(`Folder: \\\nTaskName                                      Next Run Time           Status\n============================================= ======================= ===============\n` +
        scheduledTasks.map((task) => `${task.name.padEnd(46)} ${task.next.padEnd(23)} ${task.status}`).join("\n") + "\n");
      return;
    }
    if (isSwitch(args, "/run")) {
      const index = args.findIndex((arg) => arg.toLowerCase() === "/tn");
      const taskName = args[index + 1];
      const task = scheduledTasks.find((item) => item.name.toLowerCase() === taskName?.toLowerCase());
      if (!task) return addText("ERROR: The system cannot find the task specified.\n");
      addText(`SUCCESS: Attempted to run the scheduled task "${task.name}" (simulated).\n`);
      return;
    }
    invalidUsage("schtasks");
  });
  command("shutdown", [], "Simulates shutdown or restart without affecting the computer.", "shutdown [/s|/r|/l] [/t seconds] [/a]", (args) => {
    if (isSwitch(args, "/a")) addText("The simulated system shutdown has been aborted.\n");
    else if (isSwitch(args, "/l")) addText("A simulated logoff would occur now. The computer remains running.\n");
    else if (isSwitch(args, "/s") || isSwitch(args, "/r")) {
      const index = args.findIndex((arg) => arg.toLowerCase() === "/t");
      const seconds = index < 0 ? 0 : Number(args[index + 1]);
      if (!Number.isInteger(seconds) || seconds < 0) return addText("Invalid time-out period.\n");
      addText(`The simulated system ${isSwitch(args, "/r") ? "restart" : "shutdown"} is scheduled in ${seconds} second(s). The computer remains running.\n`);
    } else invalidUsage("shutdown");
  });
  command("powercfg", [], "Displays or simulates power configuration operations.", "powercfg [/list|/getactivescheme|/energy|/batteryreport]", (args) => {
    if (isSwitch(args, "/list")) addText(`Existing Power Schemes (* Active)\n-----------------------------------\nPower Scheme GUID: 381b4222-f694-41f0-9685-ff5bb260df2e  (Balanced) *\nPower Scheme GUID: a1841308-3541-4fab-bc81-f71556f20b4a  (Power saver)\n`);
    else if (isSwitch(args, "/getactivescheme")) addText("Power Scheme GUID: 381b4222-f694-41f0-9685-ff5bb260df2e  (Balanced)\n");
    else if (isSwitch(args, "/energy") || isSwitch(args, "/batteryreport")) addText("Power report generated in the simulated file system. No host power settings were changed.\n");
    else addText("Power configuration utility (simulated). Use /list or /getactivescheme.\n");
  });
  command("sfc", [], "Simulates System File Checker; it does not inspect or repair the host.", "sfc /scannow | /verifyonly", (args) => runAdminCheck("sfc", args));
  command("chkdsk", [], "Simulates a disk check of the virtual C: volume.", "chkdsk [drive:] [/f] [/r]", (args) => runAdminCheck("chkdsk", args));
  command("dism", [], "Simulates DISM component-store checks and repair.", "dism /online /cleanup-image /checkhealth|/scanhealth|/restorehealth", (args) => runAdminCheck("dism", args));
  command("gpupdate", [], "Simulates updating local group policy.", "gpupdate [/target:computer|user] [/force]", () => addText("Updating policy...\nComputer Policy update has completed successfully.\nUser Policy update has completed successfully.\n"));
  command("ipconfig", [], "Displays simulated network settings; no network access is performed.", "ipconfig [/all|/flushdns]", (args) => showIpconfig(args));
}

registerCommands();
resetVirtualEnvironment();
environment.set("PATH", "C:\\Windows\\System32;C:\\Windows;C:\\Program Files\\Google\\Chrome");

function storeRedirect(redirect, content) {
  if (!redirect.path) {
    addText("The syntax of the command is incorrect.\n");
    return;
  }
  const path = resolvePath(redirect.path);
  const existing = getEntry(path);
  if (existing?.type === "directory") {
    addText("Access is denied.\n");
    return;
  }
  const parent = getEntry(parentPath(path));
  if (!parent || parent.type !== "directory") {
    addText("The system cannot find the path specified.\n");
    return;
  }
  if (redirect.mode === "append" && existing?.type === "file") existing.content += content;
  else addFile(path, content);
}

function executeCommandLine(input) {
  const { command: commandName, args, redirect } = parseCommandLine(input);
  const registered = findCommand(commandName);
  if (!registered) {
    addText(`'${input}' is not recognized as an internal or external command,\noperable program or batch file.\n`);
    return;
  }
  if (redirect) {
    redirectOutput = "";
    registered.execute(args);
    const captured = redirectOutput;
    redirectOutput = null;
    storeRedirect(redirect, captured);
  } else {
    registered.execute(args);
  }
}

commandInput.addEventListener("keydown", (event) => {
  if (event.key.length === 1) playKeySound();
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
  executeCommandLine(originalCommand);
});

document.addEventListener("keydown", (event) => {
  if (!running) return;
  if (event.key.toLowerCase() === "g") {
    gPresses++;
    counter.textContent = `G : ${gPresses} / 5`;
    if (gPresses >= 5) stopTerminal(true);
  }
});

restartButton.addEventListener("click", resetTerminal);

window.addEventListener("load", () => {
  updatePrompt();
  commandInput.focus();
});
