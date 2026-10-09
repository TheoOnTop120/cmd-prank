# cmd-prank — Windows Terminal Simulator (Prank)

A replica of the Windows command prompt (`cmd.exe`) that runs in the browser, with a "hacker" vibe. The user types `dir /s`, a fake scan of all folders starts with a fast-scrolling list of fictional files and beeping sounds, and the final screen displays a humorous fake ransom message.

> **Disclaimer**: this project is a pure simulation made for fun. No real files are read, modified or sent, no data is collected, and the final message is a joke — it is not a real payment demand.

## Preview


```
Microsoft Windows [Version 10.0.19045.0000]
(c) Microsoft Corporation. All rights reserved.


C:\Users\User> dir /s


 Directory of C:\Windows\System32


02/07/2026  14:22    <DIR>          System
02/07/2026  14:22        4 821 337 kernel32.dll
...
```

## Usage

No installation, no dependencies: just open `index.html` in a browser.

```bash
# clone then open
git clone https://github.com/<your-username>/cmd-prank.git
cd cmd-prank
# then **double-click** index.html, or:
python3 -m http.server 8000
# and open http://localhost:8000
```

### Available commands

Commands are registered in one command registry. Use `help <command>` for each command's description, syntax, and aliases. The simulator includes:

- **System:** `hostname`, `ver`, `systeminfo`, `whoami`, `date`, `time`, `driverquery`, `tasklist`, `taskkill`, `wmic`
- **Network:** `ping`, `tracert`, `nslookup`, `netstat`, `arp`, `route`, `getmac`, `pathping`, `nbtstat`, `ipconfig`
- **Virtual files and folders:** `dir`, `tree`, `cd` / `chdir`, `mkdir` / `md`, `rmdir` / `rd`, `copy`, `xcopy`, `move`, `del` / `erase`, `type`, `more`, `ren` / `rename`, `attrib`, `where`, `find`, `findstr`, `fc`
- **Configuration and utilities:** `set`, `path`, `assoc`, `ftype`, `title`, `color`, `cls` / `clear`, `pause`, `start`, `help`, `exit`, `echo`
- **Services and administration:** `sc`, `schtasks`, `shutdown`, `powercfg`, `sfc`, `chkdsk`, `dism`, `gpupdate`

All file operations use a shared in-memory Windows-like file system. Absolute and relative paths, quoted paths with spaces, and `>` / `>>` output redirection are supported; for example, `echo Hello > "My Documents\note.txt"`. System, process, service, disk, and network commands use consistent fictional data. They do not access the network or change the real computer. `dir /s` retains the original fake scan and keyboard interaction.

### Tests

Run the dependency-free command and file-system tests with Node.js:

```bash
node --test tests/app.test.js
```

### Stopping the scan

During the scan triggered by `dir /s`, press the **`G` key 5 times** to interrupt it and display the final screen. The **Restart** button resets the terminal from scratch.

## Project structure

```text
cmd-prank/
├── index.html    # Page structure
├── css/
│   └── style.css # Styles (neon green terminal, final screen)
└── js/
    └── app.js    # Terminal logic (commands, scan, sounds)
```