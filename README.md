# cmd-prank

![JavaScript](https://img.shields.io/badge/JavaScript-ES6-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)

cmd-prank is a browser-based imitation of the Windows command prompt. It reproduces the look and feel of a classic `cmd.exe` session, with a working set of commands, an in-memory filesystem, and a staged "system scan" that ends in a joke.

It is a front-end experiment built for fun. Everything runs locally in the page: no real files are read or modified, no data is collected, and the final message is a gag, not a genuine payment request.

## Overview

- Terminal interface built with plain HTML, CSS, and JavaScript, with no dependencies
- Around 70 supported commands covering system, network, file, configuration, and administration categories
- Virtual filesystem kept in memory, with absolute and relative paths, quoted paths containing spaces, and output redirection (`>` and `>>`)
- Animated `dir /s` scan with visual and sound effects
- Prank ending screen with a restart button

## Preview

```text
Microsoft Windows [Version 10.0.19045.0000]
(c) Microsoft Corporation. All rights reserved.

C:\Users\User> dir /s

 Directory of C:\Windows\System32

02/07/2026  14:22    <DIR>          System
02/07/2026  14:22        4 821 337 kernel32.dll
...
```

## Getting started

No installation is required. You only need a modern web browser.

### Open the file directly

```bash
git clone https://github.com/TheoOnTop120/cmd-prank.git
cd cmd-prank
```

Then open `index.html` in your browser.

### Serve it locally

```bash
git clone https://github.com/TheoOnTop120/cmd-prank.git
cd cmd-prank
python3 -m http.server 8000
```

Then go to `http://localhost:8000`.

## Supported commands

| Category | Commands |
| --- | --- |
| System | `hostname`, `ver`, `systeminfo`, `whoami`, `date`, `time`, `driverquery`, `tasklist`, `taskkill`, `wmic` |
| Network | `ping`, `tracert`, `nslookup`, `netstat`, `arp`, `route`, `getmac`, `pathping`, `nbtstat`, `ipconfig` |
| Files and folders | `dir`, `tree`, `cd` / `chdir`, `mkdir` / `md`, `rmdir` / `rd`, `copy`, `xcopy`, `move`, `del` / `erase`, `type`, `more`, `ren` / `rename`, `attrib`, `where`, `find`, `findstr`, `fc` |
| Configuration and utilities | `set`, `path`, `assoc`, `ftype`, `title`, `color`, `cls` / `clear`, `pause`, `start`, `help`, `exit`, `echo` |
| Services and administration | `sc`, `schtasks`, `shutdown`, `powercfg`, `sfc`, `chkdsk`, `dism`, `gpupdate` |

File commands operate on the virtual filesystem only. For example:

```bat
echo Hello > "My Documents\note.txt"
```

## Triggering the prank

Start the fake scan with `dir /s`. While it is running, press the `G` key five times to interrupt the animation and reveal the final screen. The `Restart` button resets the terminal to its initial state.

## Testing

The test suite uses the built-in Node.js test runner and has no external dependencies:

```bash
node --test tests/app.test.js
```

## Project structure

```text
cmd-prank/
├── index.html          # Main page and terminal shell
├── css/
│   └── style.css       # Terminal styling and prank screen
├── js/
│   └── app.js          # Commands, virtual filesystem, scan logic, sound effects
├── tests/
│   └── app.test.js     # Behavior tests
└── README.md           # Project documentation
```

## Disclaimer

This project is a simulation intended for entertainment. It does not reproduce a real Windows environment and is not meant to be used as a productivity tool. Please use it only on people who will find it funny, and be ready to explain that it is a joke.