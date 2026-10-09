"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

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
    ["restart", element()]
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
    addEventListener() {}
  };
  const context = vm.createContext({
    document,
    window,
    setInterval: () => 1,
    clearInterval() {},
    setTimeout() {}
  });
  vm.runInContext(source, context, { filename: "js/app.js" });

  return {
    elements,
    run(command) {
      const input = elements.get("command-input");
      const start = elements.get("history").textContent.length;
      input.value = command;
      elements.get("command-form").listeners.submit({ preventDefault() {} });
      return elements.get("history").textContent.slice(start);
    },
    history() {
      return elements.get("history").textContent;
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
