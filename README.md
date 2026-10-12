<div align="center">

# cmd-prank

**A fake Windows `cmd.exe` and a fake Ubuntu terminal, with a fake system scan that ends in a joke.**

![JavaScript](https://img.shields.io/badge/JavaScript-ES6-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen?style=for-the-badge)

[Overview](#overview) · [Getting started](#getting-started) · [Commands](#supported-commands-windows) · [The prank](#triggering-the-prank) · [Tests](#testing)

</div>

---

cmd-prank is a browser-based imitation of a Windows command prompt **and** of a Linux (Ubuntu/bash) terminal. A boot menu lets you choose the system, then you get a working set of commands, an in-memory filesystem, and a staged "system scan" that ends in a joke.

> [!NOTE]
> This is a front-end experiment built for fun. Everything runs locally in the page: no real files are read or modified, no data is collected, and the final message is a gag, not a genuine payment request.

## Overview

| | Windows | Linux |
| --- | --- | --- |
| Look | Green `cmd.exe` | Red, slightly creepy Ubuntu/bash |
| Commands | About 70 | About 70 |
| Filesystem | Virtual, in memory | Virtual, in memory |
| Shell features | Redirection (`>`, `>>`), quoted paths | Pipes, `;`, `&&`, `\|\|`, globs, variables, quotes, `sudo`/`su`, permissions |
| Prank trigger | `dir /s` | `ls -R /` |

- Plain HTML, CSS and JavaScript, with **no dependencies**
- Boot menu to choose the system, and a `switchos` command to change at any time
- Commands cover system, network, file, configuration and administration categories
- Absolute and relative paths, and quoted paths containing spaces
- Animated fake scan with visual and sound effects
- Prank ending screen with a restart button that returns to the boot menu

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

```bash
git clone https://github.com/TheoOnTop120/cmd-prank.git
cd cmd-prank
```

**Option 1: open the file directly.** Open `index.html` in your browser.

**Option 2: serve it locally.**

```bash
python3 -m http.server 8000
```

Then go to <http://localhost:8000>.

## Choosing the system

On startup, a boot menu asks which system to start. Press `1` (Windows) or `2` (Linux), or click an option.

| Action | Effect |
| --- | --- |
| `switchos` | Returns to the menu (press `Esc` there to stay where you were) |
| `switchos windows` / `switchos linux` | Switches directly. Each system keeps its own screen, files and folder, so you can go back and forth |
| `Restart` button (prank screen) | Resets everything and returns to the menu |

## Supported commands (Windows)

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

## Supported commands (Linux)

| Category | Commands |
| --- | --- |
| System | `hostname`, `uname`, `whoami`, `id`, `groups`, `date`, `uptime`, `free`, `df`, `lscpu`, `lsb_release`, `neofetch`, `ps`, `top`, `kill`, `killall`, `lsblk`, `dmesg`, `env`, `printenv`, `export`, `history`, `who`, `w`, `last` |
| Network | `ping`, `traceroute`, `nslookup`, `dig`, `netstat`, `ss`, `arp`, `route`, `ip`, `ifconfig` |
| Files and folders | `ls`, `cd`, `pwd`, `mkdir`, `rmdir`, `touch`, `rm`, `cp`, `mv`, `cat`, `less` / `more`, `head`, `tail`, `wc`, `grep`, `find`, `tree`, `stat`, `chmod`, `chown`, `file`, `du`, `echo`, `tee`, `sort`, `uniq`, `which`, `sleep` |
| Administration and shell | `sudo`, `su`, `systemctl`, `service`, `apt` / `apt-get`, `shutdown` / `reboot`, `crontab`, `journalctl`, `ufw`, `passwd`, `man`, `help`, `clear`, `alias`, `exit`, `switchos` |

Every command accepts `--help`. Restricted files (`/etc/shadow`, `/root`, `/var/log/auth.log`) need `sudo`. The simulation never touches anything real, and `sudo` only unlocks the virtual files.

```bash
echo "Hello" > note.txt && cat note.txt | grep -c Hello
sudo cat /var/log/auth.log
```

## Triggering the prank

| System | Start the fake scan with |
| --- | --- |
| Windows | `dir /s` |
| Linux | `ls -R /` (also `ls -lR /` or `find /`) |

While the scan is running, press the `G` key **five times** to interrupt the animation and reveal the final screen. The `Restart` button then resets the terminal and returns to the boot menu.

> [!TIP]
> On Linux, the scan only starts when the command prints to the terminal. `ls -R / | grep etc` just prints a normal listing.

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
│   ├── linux.js        # Linux engine: bash parser, virtual filesystem, Linux commands
│   └── app.js          # Windows commands, boot menu, scan logic, sound effects
├── tests/
│   └── app.test.js     # Behavior tests
└── README.md           # Project documentation
```

## Disclaimer

> [!WARNING]
> This project is a simulation intended for entertainment. It does not reproduce a real Windows environment and is not meant to be used as a productivity tool. Please use it only on people who will find it funny, and be ready to explain that it is a joke.
