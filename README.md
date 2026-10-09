# cmd-prank

<p align="center">
  <img src="https://img.shields.io/badge/JavaScript-ES6-F7DF1E?style=for-the-badge&logo=javascript" alt="JavaScript" />
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5" alt="HTML5" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3" alt="CSS3" />
</p>

A fake Windows terminal built in the browser, inspired by the aesthetic of a classic `cmd.exe` session, but turned into a humorous prank experience. It simulates a command-line environment, fake system commands, a virtual filesystem, and a dramatic scanning sequence that ends with a final joke.

> ⚠️ This project is a purely fictional and entertainment-focused simulation. It does not read or modify real files, does not collect user data, and the ending message is designed as a joke rather than a legitimate payment request.

## ✨ What it does

- simulates a Windows terminal in plain HTML and JavaScript
- supports a large set of command-like system, network, and file operations
- creates a fake virtual filesystem in memory
- displays a `dir /s` scan with visual effects and sound
- ends with a humorous prank screen and a restart button

## 🎬 Preview

```text
Microsoft Windows [Version 10.0.19045.0000]
(c) Microsoft Corporation. All rights reserved.

C:\Users\User> dir /s

 Directory of C:\Windows\System32

02/07/2026  14:22    <DIR>          System
02/07/2026  14:22        4 821 337 kernel32.dll
...
```

## 🚀 Quick start

No installation or dependencies are required. Just open the app in a browser.

### Option 1 — open directly

```bash
git clone https://github.com/TheoOnTop120/cmd-prank.git
cd cmd-prank
# then open index.html in your browser
```

### Option 2 — local server

```bash
git clone https://github.com/TheoOnTop120/cmd-prank.git
cd cmd-prank
python3 -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

## 🧩 Supported commands

| Category | Commands |
| --- | --- |
| System | `hostname`, `ver`, `systeminfo`, `whoami`, `date`, `time`, `driverquery`, `tasklist`, `taskkill`, `wmic` |
| Network | `ping`, `tracert`, `nslookup`, `netstat`, `arp`, `route`, `getmac`, `pathping`, `nbtstat`, `ipconfig` |
| Files and folders | `dir`, `tree`, `cd` / `chdir`, `mkdir` / `md`, `rmdir` / `rd`, `copy`, `xcopy`, `move`, `del` / `erase`, `type`, `more`, `ren` / `rename`, `attrib`, `where`, `find`, `findstr`, `fc` |
| Configuration and utilities | `set`, `path`, `assoc`, `ftype`, `title`, `color`, `cls` / `clear`, `pause`, `start`, `help`, `exit`, `echo` |
| Services and administration | `sc`, `schtasks`, `shutdown`, `powercfg`, `sfc`, `chkdsk`, `dism`, `gpupdate` |

File operations use an in-memory fake filesystem, with support for absolute and relative paths, quoted paths with spaces, and output redirection via `>` and `>>`.

Example:

```bat
echo Hello > "My Documents\note.txt"
```

## 🧪 Testing

The project includes Node.js tests with no external dependencies:

```bash
node --test tests/app.test.js
```

## ⏱️ How to trigger the prank scan

During the fake scan started by `dir /s`, press the `G` key 5 times to interrupt the animation and reveal the final prank screen. The `Restart` button resets the terminal.

## 📁 Project structure

```text
cmd-prank/
├── index.html          # main page and terminal shell structure
├── css/
│   └── style.css      # terminal styling and prank screen visuals
├── js/
│   └── app.js         # command logic, fake filesystem, scan behavior, and sound effects
├── tests/
│   └── app.test.js    # behavior validation tests
├── README.md          # project documentation
└── .git/              # Git metadata (hidden folder)
```

## 📝 Note

This project is mainly a front-end experiment and terminal simulation designed for fun and visual jokes. It is not intended to reproduce a real Windows environment or be used as a serious productivity tool.
