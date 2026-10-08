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

| Command | Effect |
| --- | --- |
| `dir` | Lists the (fictional) files in the current folder |
| `dir /s` | Starts the fake scan of all folders |
| `clear` / `cls` | Clears the console |
| `help [command]` | Shows available commands or detailed help for one command |
| `cd <folder>` / `chdir <folder>` | Changes directory (fictional); `cd ..` goes to the parent folder |
| `echo <text>` | Displays the text |
| `whoami` | Shows the current user |
| `ver` | Shows the Windows version |
| `date` / `time` | Shows the date / time |
| `ipconfig` | Displays a fictional network configuration |
| `systeminfo` | Displays fictional system information |
| `color <code>` | Changes the text color (`0a`, `0c`, `0e`, `green`, `red`, ...) |
| `stop` | Reports that no scan is currently running |
| `exit` | Closes the session |

Commands are registered in the terminal and their aliases are resolved by the same registry. Quote arguments containing spaces, for example `cd "Program Files"`.

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