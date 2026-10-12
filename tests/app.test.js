"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const linuxSource = fs.readFileSync(path.join(__dirname, "..", "js", "linux.js"), "utf8");
const source = fs.readFileSync(path.join(__dirname, "..", "js", "app.js"), "utf8");

function createTerminal() {
  function element() {
    return {
      textContent: "",
      value: "",
      disabled: false,
      style: {},
      listeners: {},
      addEventListener(name, handler) {
        this.listeners[name] = handler;
      },
      querySelectorAll() {
        return [];
      },
      focus() {}
    };
  }
  const elements = new Map([
    ["terminal", element()],
    ["history", element()],
    ["command-form", element()],
    ["command-input", element()],
    ["output", element()],
    ["prompt", element()],
    ["counter", element()],
    ["finished", element()],
    ["restart", element()],
    ["os-select", element()]
  ]);
  elements.get("history").textContent = "Microsoft Windows [Version 10.0.19045.0000]\n";
  const document = {
    body: { style: {} },
    title: "cmd.exe",
    listeners: {},
    getElementById(id) {
      return elements.get(id);
    },
    addEventListener(name, handler) {
      this.listeners[name] = handler;
    }
  };
  const window = {
    listeners: {},
    addEventListener(name, handler) {
      this.listeners[name] = handler;
    }
  };
  const context = vm.createContext({
    document,
    window,
    setInterval: () => 1,
    clearInterval() {},
    setTimeout() {}
  });
  vm.runInContext(linuxSource, context, { filename: "js/linux.js" });
  vm.runInContext(source, context, { filename: "js/app.js" });

  return {
    elements,
    context,
    load() {
      window.listeners.load();
    },
    run(command) {
      const input = elements.get("command-input");
      const start = elements.get("history").textContent.length;
      input.value = command;
      elements.get("command-form").listeners.submit({ preventDefault() {} });
      return elements.get("history").textContent.slice(start);
    },
    history() {
      return elements.get("history").textContent;
    },
    pressKey(key) {
      document.listeners.keydown({ key });
    }
  };
}

test("help lists registered commands and provides command-specific help", () => {
  const terminal = createTerminal();
  const listing = terminal.run("help");
  for (const name of ["hostname", "systeminfo", "taskkill", "ping", "netstat", "tree", "mkdir", "dism", "ipconfig"]) {
    assert.match(listing, new RegExp(`\\b${name}\\b`));
  }
  const detail = terminal.run("help ping");
  assert.match(detail, /Tests connectivity using simulated replies/);
  assert.match(detail, /Usage: ping \[-n count\] target/);
});

test("system and network commands return compatible simulated information", () => {
  const terminal = createTerminal();
  assert.match(terminal.run("hostname"), /DESKTOP-USER/);
  assert.match(terminal.run("systeminfo"), /Host Name:\s+DESKTOP-USER/);
  assert.match(terminal.run("tasklist"), /explorer\.exe/);
  const ping = terminal.run("ping 8.8.8.8");
  assert.match(ping, /Reply from 8\.8\.8\.8:/);
  assert.match(ping, /Sent = 4, Received = 4, Lost = 0 \(0% loss\)/);
  const netstat = terminal.run("netstat -ano");
  assert.match(netstat, /Foreign Address/);
  assert.match(netstat, /ESTABLISHED/);
  assert.match(netstat, /\s6512$/m);
  const ipconfig = terminal.run("ipconfig");
  assert.match(ipconfig, /192\.168\.1\.42/);
  assert.match(ipconfig, /192\.168\.1\.1/);
});

test("virtual file commands share state and support redirects and aliases", () => {
  const terminal = createTerminal();
  terminal.run("mkdir test");
  terminal.run("cd test");
  assert.match(terminal.run("dir"), /Directory of C:\\Users\\User\\test/);
  terminal.run("cd ..");
  terminal.run("echo Bonjour > test.txt");
  assert.match(terminal.run("type test.txt"), /Bonjour/);
  terminal.run("copy test.txt copie.txt");
  assert.match(terminal.run("type copie.txt"), /Bonjour/);
  terminal.run("ren copie.txt nouveau.txt");
  assert.match(terminal.run("type nouveau.txt"), /Bonjour/);
  terminal.run("del nouveau.txt");
  assert.match(terminal.run("rmdir test"), /removed/);
  assert.match(terminal.run("dir"), /test\.txt/);
  assert.doesNotMatch(terminal.run("dir"), /nouveau\.txt|copie\.txt/);
});

test("quoted paths, non-empty directory errors and recursive tree use the virtual file system", () => {
  const terminal = createTerminal();
  terminal.run('mkdir "My Documents"');
  terminal.run('echo hello > "My Documents\\hello world.txt"');
  assert.match(terminal.run('type "My Documents\\hello world.txt"'), /hello/);
  assert.match(terminal.run('rmdir "My Documents"'), /not empty/);
  assert.match(terminal.run("tree"), /My Documents/);
  terminal.run('del "My Documents\\hello world.txt"');
  terminal.run('rmdir "My Documents"');
  assert.doesNotMatch(terminal.run("tree"), /My Documents/);
});

test("absolute paths, append redirection, copy and recursive removal stay virtual", () => {
  const terminal = createTerminal();
  terminal.run('mkdir "C:\\Users\\User\\Work Files"');
  terminal.run('echo First > "C:\\Users\\User\\Work Files\\notes file.txt"');
  terminal.run('echo Second >> "C:\\Users\\User\\Work Files\\notes file.txt"');
  assert.match(terminal.run('type "C:\\Users\\User\\Work Files\\notes file.txt"'), /First\nSecond/);
  terminal.run('mkdir "C:\\Users\\User\\Archive"');
  terminal.run('copy "C:\\Users\\User\\Work Files\\notes file.txt" "C:\\Users\\User\\Archive"');
  assert.match(terminal.run('type "C:\\Users\\User\\Archive\\notes file.txt"'), /Second/);
  terminal.run('rmdir /s /q "C:\\Users\\User\\Work Files"');
  assert.match(terminal.run('type "C:\\Users\\User\\Work Files\\notes file.txt"'), /cannot find the file/i);
  assert.match(terminal.run('type "C:\\Users\\User\\Archive\\notes file.txt"'), /First\nSecond/);
});

test("unknown commands and invalid arguments report errors without escaping simulation", () => {
  const terminal = createTerminal();
  assert.match(terminal.run("not-a-command"), /not recognized as an internal or external command/);
  assert.match(terminal.run("ping -n 0 8.8.8.8"), /Bad value for option -n/);
  assert.match(terminal.run("cd missing-folder"), /cannot find the path specified/i);
  assert.match(terminal.run("taskkill /pid 4"), /cannot be terminated/);
  assert.match(terminal.run("shutdown /s /t 0"), /computer remains running/);
});

test("every requested command is registered with command-specific help", () => {
  const terminal = createTerminal();
  const listing = terminal.run("help");
  const names = [
    "hostname", "ver", "systeminfo", "whoami", "date", "time", "driverquery", "tasklist",
    "taskkill", "wmic", "ping", "tracert", "nslookup", "netstat", "arp", "route", "getmac",
    "pathping", "nbtstat", "dir", "tree", "cd", "mkdir", "rmdir", "copy", "xcopy", "move",
    "del", "erase", "type", "more", "ren", "attrib", "where", "find", "findstr", "fc", "set",
    "path", "assoc", "ftype", "title", "color", "cls", "pause", "start", "help", "exit", "sc",
    "schtasks", "shutdown", "powercfg", "sfc", "chkdsk", "dism", "gpupdate", "ipconfig"
  ];
  for (const name of names) {
    if (!["erase", "cls"].includes(name)) {
      assert.match(listing, new RegExp(`\\b${name}\\b`), `${name} should be in help`);
    }
    assert.match(terminal.run(`help ${name}`), /Usage:/);
  }
});

test("all command handlers execute representative valid invocations without JavaScript errors", () => {
  const terminal = createTerminal();
  const samples = [
    "hostname", "ver", "systeminfo", "whoami", "date /t", "time /t", "driverquery",
    "tasklist", "taskkill /pid 6512", "wmic cpu", "ping 8.8.8.8", "tracert google.com",
    "nslookup google.com", "netstat -ano", "arp -a", "route print", "getmac", "pathping 8.8.8.8",
    "nbtstat -n", "dir", "tree", "cd", "mkdir smoke", "cd smoke", "dir", "cd ..",
    "rmdir smoke", "copy Documents\\notes.txt smoke.txt", "xcopy Documents DocsCopy /e",
    "move smoke.txt moved.txt", "del moved.txt", "erase DocsCopy\\notes.txt", "type Documents\\notes.txt",
    "more Documents\\notes.txt", "ren Documents\\notes.txt renamed.txt", "attrib Documents\\renamed.txt",
    "where cmd.exe", 'find "Remember" Documents\\renamed.txt', 'findstr /i Remember Documents\\renamed.txt',
    "fc Documents\\renamed.txt Documents\\renamed.txt", "set USERNAME=simulated", "set USERNAME", "path", "assoc .txt",
    "ftype txtfile", "title Simulated CMD", "color 0a", "cls", "pause", "start notepad.exe",
    "sc query", "sc stop Spooler", "schtasks /query",
    "schtasks /run /tn \"\\\\Microsoft\\\\Windows\\\\UpdateOrchestrator\\\\Schedule Scan\"",
    "shutdown /r /t 5", "powercfg /getactivescheme", "sfc /verifyonly", "chkdsk C:",
    "dism /online /cleanup-image /scanhealth", "gpupdate", "ipconfig /all", "exit"
  ];
  for (const sample of samples) {
    assert.doesNotThrow(() => terminal.run(sample), sample);
    assert.doesNotMatch(terminal.history(), /is not recognized as an internal or external command/);
  }
});

function createLinuxTerminal() {
  const terminal = createTerminal();
  terminal.load();
  assert.equal(terminal.elements.get("os-select").style.display, "flex");
  terminal.pressKey("2");
  return terminal;
}

test("windows stays the default and the OS menu can pick either system", () => {
  const windows = createTerminal();
  windows.load();
  windows.pressKey("w");
  assert.equal(windows.elements.get("os-select").style.display, "none");
  assert.match(windows.run("ver"), /Microsoft Windows \[Version/);

  const linux = createLinuxTerminal();
  assert.match(linux.history(), /Ubuntu 22\.04\.4 LTS/);
  assert.equal(linux.elements.get("prompt").textContent, "user@ghost:~$ ");
  assert.equal(linux.elements.get("os-select").style.display, "none");
});

test("switchos moves between systems and keeps each system's state", () => {
  const terminal = createTerminal();
  terminal.load();
  terminal.pressKey("1");
  terminal.run("mkdir keepme");
  terminal.run("cd keepme");
  terminal.run("switchos linux");
  assert.equal(terminal.elements.get("prompt").textContent, "user@ghost:~$ ");
  terminal.run("mkdir linuxdir");
  terminal.run("switchos windows");
  assert.equal(terminal.elements.get("prompt").textContent, "C:\\Users\\User\\keepme> ");
  assert.match(terminal.history(), /mkdir keepme/);
  terminal.run("switchos linux");
  assert.match(terminal.run("ls"), /linuxdir/);
  assert.match(terminal.run("switchos beos"), /Unknown system/);
  assert.match(terminal.run("switchos linux"), /Already running Linux/);
});

test("switchos without argument shows the menu and Escape returns to the current system", () => {
  const terminal = createLinuxTerminal();
  terminal.run("echo hello > keep.txt");
  terminal.run("switchos");
  assert.equal(terminal.elements.get("os-select").style.display, "flex");
  assert.equal(terminal.elements.get("command-input").disabled, true);
  terminal.pressKey("Escape");
  assert.equal(terminal.elements.get("os-select").style.display, "none");
  assert.match(terminal.run("cat keep.txt"), /hello/);
  terminal.run("switchos");
  terminal.pressKey("1");
  assert.equal(terminal.elements.get("prompt").textContent.startsWith("C:\\"), true);
});

test("linux file commands, redirects and the prompt follow the working directory", () => {
  const terminal = createLinuxTerminal();
  terminal.run("mkdir -p projects/demo");
  terminal.run("cd projects/demo");
  assert.equal(terminal.elements.get("prompt").textContent, "user@ghost:~/projects/demo$ ");
  assert.match(terminal.run("pwd"), /\/home\/user\/projects\/demo/);
  terminal.run('echo "First line" > note.txt');
  terminal.run("echo Second >> note.txt");
  assert.match(terminal.run("cat note.txt"), /First line\nSecond\n/);
  assert.match(terminal.run("cat -n note.txt"), /\s1\tFirst line/);
  terminal.run("cp note.txt copy.txt");
  terminal.run("mv copy.txt moved.txt");
  assert.match(terminal.run("ls"), /moved\.txt\s+note\.txt/);
  assert.match(terminal.run("ls -l note.txt"), /^.*-rw-r--r-- 1 user user 18 /s);
  terminal.run("rm moved.txt");
  assert.match(terminal.run("cat moved.txt"), /No such file or directory/);
  terminal.run("cd ../..");
  assert.match(terminal.run("rmdir projects"), /Directory not empty/);
  terminal.run("rm -r projects");
  assert.doesNotMatch(terminal.run("ls"), /projects/);
  assert.match(terminal.run("cd /nowhere"), /No such file or directory/);
});

test("linux supports pipes, chaining, globs, variables and quoting", () => {
  const terminal = createLinuxTerminal();
  terminal.run("cd Documents");
  assert.match(terminal.run("cat notes.txt todo.txt | grep -c ."), /^.*\n?5\n$/s);
  assert.match(terminal.run("cat todo.txt | grep call | wc -l"), /^.*\n1\n$/s);
  assert.match(terminal.run("ls *.txt"), /notes\.txt\s+todo\.txt/);
  assert.match(terminal.run("echo $USER at $HOME"), /user at \/home\/user/);
  assert.match(terminal.run("echo 'single $USER'"), /single \$USER/);
  assert.match(terminal.run("false && echo no || echo yes"), /\nyes\n/);
  assert.doesNotMatch(terminal.run("false && echo hidden"), /hidden\n$/m.test("") ? /^$/ : /\nhidden\n/);
  assert.match(terminal.run("echo b; echo a | sort"), /\nb\na\n/);
  assert.match(terminal.run("export GREETING=salut"), /export GREETING=salut/);
  assert.match(terminal.run("echo $GREETING"), /\nsalut\n/);
  assert.match(terminal.run("tail -n 1 todo.txt"), /update the server/);
  assert.match(terminal.run("head -1 todo.txt"), /finish report/);
  assert.match(terminal.run("grep -rni password ~"), /notes\.txt:2:Password manager/);
});

test("linux permissions: restricted files need sudo and sudo never touches the real system", () => {
  const terminal = createLinuxTerminal();
  assert.match(terminal.run("cat /etc/shadow"), /Permission denied/);
  assert.match(terminal.run("cd /root"), /Permission denied/);
  assert.match(terminal.run("mkdir /opt/x"), /Permission denied/);
  assert.match(terminal.run("echo hi > /etc/hosts"), /Permission denied/);
  assert.match(terminal.run("sudo cat /etc/shadow"), /root:\$6\$simulated/);
  assert.equal(terminal.run("sudo mkdir /opt/x"), "user@ghost:~$ sudo mkdir /opt/x\n");
  assert.match(terminal.run("ls /opt"), /x/);
  assert.match(terminal.run("rm -rf /"), /dangerous to operate recursively/);
  assert.match(terminal.run("sudo rm -rf /etc"), /Operation not permitted \(simulated safeguard\)/);
  assert.match(terminal.run("whoami"), /\nuser\n/);
  assert.match(terminal.run("sudo whoami"), /\nroot\n/);
  terminal.run("sudo -i");
  assert.equal(terminal.elements.get("prompt").textContent, "root@ghost:~# ");
  terminal.run("exit");
  assert.equal(terminal.elements.get("prompt").textContent, "user@ghost:~$ ");
});

test("linux system, network and admin commands return plausible simulated output", () => {
  const terminal = createLinuxTerminal();
  assert.match(terminal.run("uname -a"), /Linux ghost 5\.15\.0-91-generic .* GNU\/Linux/);
  assert.match(terminal.run("hostname"), /\nghost\n/);
  assert.match(terminal.run("free -h"), /Mem:\s+15Gi/);
  assert.match(terminal.run("df -h"), /\/dev\/sda2/);
  assert.match(terminal.run("ps aux"), /sshd/);
  assert.match(terminal.run("ip a"), /192\.168\.1\.58\/24/);
  assert.match(terminal.run("ifconfig"), /netmask 255\.255\.255\.0/);
  assert.match(terminal.run("netstat -an"), /ESTABLISHED/);
  const ping = terminal.run("ping -c 3 8.8.8.8");
  assert.match(ping, /PING 8\.8\.8\.8 \(8\.8\.8\.8\) 56\(84\) bytes of data\./);
  assert.match(ping, /3 packets transmitted, 3 received, 0% packet loss/);
  assert.match(terminal.run("ping not_a_host"), /Name or service not known/);
  assert.match(terminal.run("ping -c 0 8.8.8.8"), /invalid argument/);
  assert.match(terminal.run("systemctl status ssh"), /active \(running\)/);
  assert.match(terminal.run("systemctl stop ssh"), /Interactive authentication required/);
  assert.match(terminal.run("sudo systemctl stop ghostd"), /Operation not permitted/);
  assert.match(terminal.run("apt update"), /Permission denied/);
  assert.match(terminal.run("sudo apt update"), /All packages are up to date/);
  assert.match(terminal.run("kill 666"), /Operation not permitted/);
  assert.match(terminal.run("kill 99999"), /No such process/);
  assert.match(terminal.run("sudo shutdown -h now"), /the computer remains running/);
  assert.match(terminal.run("definitely-not-a-command"), /command not found/);
  assert.match(terminal.run("man ls"), /NAME\n\s+ls - List directory contents/);
  assert.match(terminal.run("tree Documents"), /├── budget_2026\.csv[\s\S]*0 directories, 3 files/);
  assert.match(terminal.run("find ~ -name '*.txt' -type f"), /\/home\/user\/Documents\/notes\.txt/);
});

test("every linux command appears in help and executes without internal errors", () => {
  const terminal = createLinuxTerminal();
  const names = vm.runInContext("linuxOS.commandNames()", terminal.context);
  assert.ok(names.length >= 70, `expected at least 70 commands, got ${names.length}`);
  const listing = terminal.run("help");
  for (const name of names) assert.match(listing, new RegExp(`\\b${name}\\b`), `${name} should be listed`);
  const samples = [
    "ls -la", "ls -R Documents", "cd ~", "pwd", "mkdir -p smoke/a", "touch smoke/f", "stat smoke/f", "chmod 600 smoke/f", "chmod u+x smoke/f",
    "file smoke/f", "du -sh smoke", "cp -r smoke smoke2", "mv smoke2 smoke3", "rm -rf smoke3", "rmdir smoke/a", "cat Documents/todo.txt",
    "less Documents/todo.txt", "head Documents/todo.txt", "tail Documents/todo.txt", "wc Documents/todo.txt", "grep call Documents/todo.txt",
    "find . -maxdepth 1", "tree -L 1", "echo hi | tee smoke/out.txt", "sort Documents/todo.txt", "uniq Documents/todo.txt", "which ls", "sleep 1",
    "true", "false", "nano x", "hostname", "uname", "whoami", "id", "groups", "date", "uptime", "free", "df", "lscpu", "lsb_release -a", "neofetch",
    "ps", "ps -ef", "top", "killall nothing", "lsblk", "dmesg", "sudo dmesg", "env", "printenv HOME", "export A=1", "history", "who", "w", "last",
    "ping -c 1 localhost", "traceroute google.com", "nslookup google.com", "dig +short google.com", "dig google.com", "netstat -an", "ss -tulpn",
    "arp -a", "route -n", "ip r", "ifconfig", "su", "exit", "systemctl list-units", "service ssh status", "sudo apt install htop", "sudo reboot",
    "crontab -l", "journalctl -n 2", "sudo ufw status", "passwd", "alias", "title test", "clear", "chown user smoke/f", "sudo chown root smoke/f"
  ];
  for (const sample of samples) {
    assert.doesNotThrow(() => terminal.run(sample), sample);
    assert.doesNotMatch(terminal.history(), /unexpected error|command not found/, `${sample} should not break`);
  }
});

test("ls -R / and find / start the scan; five G presses reveal the final screen; restart returns to the menu", () => {
  const terminal = createLinuxTerminal();
  terminal.run("ls -R Documents");
  assert.equal(terminal.elements.get("command-form").style.display, "flex");
  terminal.run("ls -lR /");
  assert.equal(terminal.elements.get("command-form").style.display, "none");
  assert.equal(terminal.elements.get("counter").textContent, "G : 0 / 5");
  for (let i = 0; i < 5; i++) terminal.pressKey("g");
  assert.equal(terminal.elements.get("finished").style.display, "grid");
  terminal.elements.get("restart").listeners.click();
  assert.equal(terminal.elements.get("finished").style.display, "none");
  assert.equal(terminal.elements.get("os-select").style.display, "flex");
  terminal.pressKey("2");
  const again = terminal.run("find /");
  assert.equal(terminal.elements.get("command-form").style.display, "none");
  assert.equal(again, "user@ghost:~$ find /\n");
});

test("piped or filtered ls -R / does not start the scan", () => {
  const terminal = createLinuxTerminal();
  assert.match(terminal.run("ls -R / | grep etc"), /\/etc/);
  assert.equal(terminal.elements.get("command-form").style.display, "flex");
});
