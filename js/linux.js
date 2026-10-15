"use strict";

/*
 * Simulated Linux (bash) engine for cmd-prank.
 * Everything lives in memory: no real file is read or modified.
 * It relies on a few globals provided by app.js: addText, clearTerminal,
 * startTerminal, closeSession, requestOSSwitch and setWindowTitle.
 */
const linuxOS = (() => {
  const HOST = "ghost";
  const KERNEL = "5.15.0-91-generic";
  const KERNEL_BUILD = "#101-Ubuntu SMP Tue Nov 14 13:30:08 UTC 2023";
  const REMOTE_IP = "203.0.113.66";
  const MY_IP = "192.168.1.58";
  const GATEWAY = "192.168.1.1";
  const IFACE = "enp3s0";
  const MAC = "4c:cc:6a:2b:19:7c";
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const BASE_DATE = new Date("2026-10-09T04:42:18Z");
  const DEFAULT_PATH = "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games";

  const pad = (value, width = 2) => String(value).padStart(width, "0");
  const sp = (value, width = 2) => String(value).padStart(width, " ");

  const state = {
    user: "user",
    sudo: false,
    cwd: "/home/user",
    oldpwd: "/home/user",
    status: 0,
    history: [],
    aliases: new Map(),
    env: new Map(),
    shellStack: []
  };

  let fs = new Map();
  let processes = [];
  let services = [];
  let nextPid = 3120;
  const registry = new Map();

  /* ------------------------------------------------------------------ */
  /* Paths and virtual file system                                       */
  /* ------------------------------------------------------------------ */

  const isRoot = () => state.user === "root" || state.sudo;
  const effectiveUser = () => (isRoot() ? "root" : state.user);
  const homeDir = () => (state.user === "root" ? "/root" : "/home/user");

  function norm(path, base = state.cwd) {
    let value = String(path ?? "");
    if (value === "~" || value.startsWith("~/")) value = homeDir() + value.slice(1);
    if (!value.startsWith("/")) value = `${base}/${value}`;
    const parts = [];
    for (const part of value.split("/")) {
      if (!part || part === ".") continue;
      if (part === "..") parts.pop();
      else parts.push(part);
    }
    return `/${parts.join("/")}`;
  }

  const parentOf = (path) => {
    const index = path.lastIndexOf("/");
    return index <= 0 ? "/" : path.slice(0, index);
  };
  const baseOf = (path) => (path === "/" ? "/" : path.slice(path.lastIndexOf("/") + 1));
  const joinPath = (dir, name) => (dir === "/" ? `/${name}` : `${dir}/${name}`);
  const depthOf = (path) => (path === "/" ? 0 : path.split("/").length - 1);
  const underPath = (path, root) => path === root || path.startsWith(root === "/" ? "/" : `${root}/`);

  const at = (path) => fs.get(norm(path));

  function isDenied(path) {
    if (isRoot()) return false;
    let current = path;
    for (;;) {
      const entry = fs.get(current);
      if (entry && entry.rootOnly) return true;
      if (current === "/") return false;
      current = parentOf(current);
    }
  }

  function canWrite(path) {
    if (isRoot()) return true;
    return underPath(path, "/home/user") || underPath(path, "/tmp");
  }

  function ownerFor(path) {
    if (isRoot()) return "root";
    return underPath(path, "/home/user") || underPath(path, "/tmp") ? "user" : "root";
  }

  function makeEntry(path, type, options = {}) {
    const owner = options.owner || (underPath(path, "/home/user") ? "user" : "root");
    return {
      path,
      type,
      content: type === "file" ? (options.content ?? "") : "",
      size: options.size,
      mode: options.mode ?? (type === "dir" ? 0o755 : 0o644),
      owner,
      group: options.group || (owner === "user" ? "user" : "root"),
      mtime: options.mtime || BASE_DATE,
      rootOnly: Boolean(options.rootOnly)
    };
  }

  function mkdirp(path, options = {}) {
    const parts = path.split("/").filter(Boolean);
    let current = "/";
    if (!fs.has("/")) fs.set("/", makeEntry("/", "dir"));
    for (const part of parts) {
      current = joinPath(current, part);
      if (!fs.has(current)) fs.set(current, makeEntry(current, "dir", options));
    }
  }

  function putFile(path, content, options = {}) {
    mkdirp(parentOf(path));
    fs.set(path, makeEntry(path, "file", { ...options, content }));
  }

  function children(path) {
    const result = [];
    for (const entry of fs.values()) {
      if (entry.path !== "/" && parentOf(entry.path) === path) result.push(entry);
    }
    return result;
  }

  function descendants(path) {
    const prefix = path === "/" ? "/" : `${path}/`;
    return [...fs.values()].filter((entry) => entry.path !== path && entry.path.startsWith(prefix));
  }

  const sizeOf = (entry) => (entry.type === "dir" ? 4096 : (entry.size ?? entry.content.length));
  const compareNames = (a, b) => {
    const left = a.replace(/^\./, "").toLowerCase();
    const right = b.replace(/^\./, "").toLowerCase();
    return left < right ? -1 : left > right ? 1 : a < b ? -1 : a > b ? 1 : 0;
  };
  const byName = (a, b) => compareNames(baseOf(a.path), baseOf(b.path));

  function modeString(entry) {
    const bits = "rwxrwxrwx";
    let text = entry.type === "dir" ? "d" : "-";
    for (let i = 0; i < 9; i++) text += entry.mode & (1 << (8 - i)) ? bits[i] : "-";
    return text;
  }

  function human(bytes) {
    if (bytes < 1024) return String(bytes);
    const units = ["K", "M", "G", "T"];
    let value = bytes / 1024;
    let index = 0;
    while (value >= 1024 && index < units.length - 1) {
      value /= 1024;
      index++;
    }
    return `${value < 10 ? (Math.ceil(value * 10) / 10).toFixed(1) : Math.ceil(value)}${units[index]}`;
  }

  function lsDate(date) {
    return `${MONTHS[date.getUTCMonth()]} ${sp(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
  }

  function fullDate(date) {
    return `${DAYS[date.getUTCDay()]} ${MONTHS[date.getUTCMonth()]} ${sp(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} UTC ${date.getUTCFullYear()}`;
  }

  function isoDate(date) {
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}.000000000 +0000`;
  }

  const clock = (date = new Date()) => `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;

  function globRegex(pattern) {
    let source = "";
    for (let i = 0; i < pattern.length; i++) {
      const ch = pattern[i];
      if (ch === "*") source += "[^/]*";
      else if (ch === "?") source += "[^/]";
      else if (ch === "[") {
        const end = pattern.indexOf("]", i + 1);
        if (end > i + 1) {
          source += `[${pattern.slice(i + 1, end).replace(/^!/, "^")}]`;
          i = end;
        } else source += "\\[";
      } else source += ch.replace(/[.+^${}()|\\\]]/g, "\\$&");
    }
    return new RegExp(`^${source}$`);
  }

  /* ------------------------------------------------------------------ */
  /* Initial state                                                       */
  /* ------------------------------------------------------------------ */

  function seedProcesses() {
    const make = (pid, ppid, user, cpu, mem, vsz, rss, tty, stat, start, time, cmd) =>
      ({ pid, ppid, user, cpu, mem, vsz, rss, tty, stat, start, time, cmd });
    processes = [
      make(1, 0, "root", 0.0, 0.2, 168940, 13312, "?", "Ss", "Oct09", "0:09", "/sbin/init splash"),
      make(2, 0, "root", 0.0, 0.0, 0, 0, "?", "S", "Oct09", "0:00", "[kthreadd]"),
      make(412, 1, "root", 0.0, 0.5, 66584, 20480, "?", "Ss", "Oct09", "0:03", "/lib/systemd/systemd-journald"),
      make(438, 1, "root", 0.0, 0.1, 25832, 6144, "?", "Ss", "Oct09", "0:01", "/lib/systemd/systemd-udevd"),
      make(689, 1, "root", 0.1, 0.3, 335240, 15872, "?", "Ssl", "Oct09", "0:41", "/usr/sbin/NetworkManager --no-daemon"),
      make(703, 1, "root", 0.0, 0.1, 15440, 7168, "?", "Ss", "Oct09", "0:00", "sshd: /usr/sbin/sshd -D [listener]"),
      make(711, 1, "root", 0.0, 0.0, 8536, 2816, "?", "Ss", "Oct09", "0:00", "/usr/sbin/cron -f -P"),
      make(744, 1, "syslog", 0.0, 0.1, 222404, 5120, "?", "Ssl", "Oct09", "0:02", "/usr/sbin/rsyslogd -n -iNONE"),
      make(666, 1, "root", 1.8, 0.4, 91204, 24576, "?", "Ss", "03:14", "2:07", "/tmp/.x11-cache/ghostd --silent --upload /home"),
      make(1204, 1, "user", 0.0, 0.2, 17176, 9216, "?", "Ss", "Oct09", "0:00", "/lib/systemd/systemd --user"),
      make(1587, 1204, "user", 2.4, 4.1, 3524880, 671744, "tty7", "Sl", "Oct09", "18:22", "/usr/lib/firefox/firefox"),
      make(2210, 703, "user", 0.0, 0.1, 17508, 6656, "?", "S", "03:14", "0:00", "sshd: user@pts/1"),
      make(2211, 2210, "user", 0.0, 0.1, 9692, 5120, "pts/1", "Ss", "03:14", "0:00", "-bash"),
      make(3001, 1204, "user", 0.0, 0.1, 9616, 5376, "pts/0", "Ss", "11:48", "0:00", "-bash")
    ];
    nextPid = 3120;
  }

  function seedServices() {
    services = [
      { name: "ssh", description: "OpenBSD Secure Shell server", active: true },
      { name: "cron", description: "Regular background program processing daemon", active: true },
      { name: "NetworkManager", description: "Network Manager", active: true },
      { name: "rsyslog", description: "System Logging Service", active: true },
      { name: "ufw", description: "Uncomplicated firewall", active: true },
      { name: "cups", description: "CUPS Scheduler", active: false },
      { name: "ghostd", description: "Ghost background daemon", active: true }
    ];
  }

  function reset() {
    fs = new Map();
    const dirs = [
      "/", "/bin", "/boot", "/dev", "/etc", "/etc/ssh", "/etc/cron.d", "/lib", "/media", "/mnt", "/opt",
      "/proc", "/run", "/sbin", "/srv", "/sys", "/usr", "/usr/bin", "/usr/lib", "/usr/local",
      "/usr/sbin", "/usr/share", "/var", "/var/lib", "/var/backups", "/var/www", "/var/www/html"
    ];
    for (const dir of dirs) mkdirp(dir);
    mkdirp("/tmp", { mode: 0o777, owner: "root" });
    mkdirp("/tmp/.x11-cache", { owner: "root", mode: 0o700 });
    mkdirp("/var/log");
    mkdirp("/home");
    mkdirp("/home/user", { owner: "user", group: "user", mode: 0o750 });
    for (const dir of ["Desktop", "Documents", "Downloads", "Pictures", "Music", ".ssh", ".config"]) {
      mkdirp(`/home/user/${dir}`, { owner: "user", group: "user", mode: dir === ".ssh" ? 0o700 : 0o755 });
    }
    mkdirp("/root", { owner: "root", mode: 0o700, rootOnly: true });

    for (const name of ["ls", "cat", "bash", "cp", "mv", "rm", "mkdir", "grep", "ps", "sleep", "echo", "chmod"]) {
      putFile(`/bin/${name}`, "\u007fELF", { size: 40000 + name.length * 7919, mode: 0o755 });
    }
    for (const name of ["sudo", "find", "ssh", "python3", "nano", "top", "curl", "ping"]) {
      putFile(`/usr/bin/${name}`, "\u007fELF", { size: 120000 + name.length * 13331, mode: 0o755 });
    }

    putFile("/etc/hostname", `${HOST}\n`);
    putFile("/etc/hosts", `127.0.0.1\tlocalhost\n127.0.1.1\t${HOST}\n\n::1     ip6-localhost ip6-loopback\n`);
    putFile("/etc/passwd",
      "root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\n" +
      "syslog:x:107:113::/home/syslog:/usr/sbin/nologin\nsshd:x:110:65534::/run/sshd:/usr/sbin/nologin\n" +
      "user:x:1000:1000:user,,,:/home/user:/bin/bash\n");
    putFile("/etc/shadow", "root:$6$simulated$notarealhash:19640:0:99999:7:::\nuser:$6$simulated$notarealhash:19640:0:99999:7:::\n",
      { mode: 0o640, rootOnly: true, group: "shadow" });
    putFile("/etc/os-release",
      'PRETTY_NAME="Ubuntu 22.04.4 LTS"\nNAME="Ubuntu"\nVERSION_ID="22.04"\nVERSION="22.04.4 LTS (Jammy Jellyfish)"\n' +
      "VERSION_CODENAME=jammy\nID=ubuntu\nID_LIKE=debian\n");
    putFile("/etc/resolv.conf", "nameserver 127.0.0.53\noptions edns0 trust-ad\nsearch lan\n");
    putFile("/etc/fstab", "UUID=7a3f19b2-0c4e-4d11-9a1e-5b2e8f1c0d33 /  ext4  errors=remount-ro  0  1\n");
    putFile("/etc/ssh/sshd_config", "Port 22\nPermitRootLogin prohibit-password\nPasswordAuthentication yes\n");
    putFile("/proc/version", `Linux version ${KERNEL} (buildd@lcy02-amd64-045) (gcc (Ubuntu 11.4.0-1ubuntu1~22.04) 11.4.0) ${KERNEL_BUILD}\n`);
    putFile("/proc/cpuinfo", "processor\t: 0\nmodel name\t: Intel(R) Core(TM) i7-9700 CPU @ 3.00GHz\ncpu MHz\t\t: 3000.000\ncache size\t: 12288 KB\n");
    putFile("/proc/meminfo", "MemTotal:       16318400 kB\nMemFree:         8115028 kB\nMemAvailable:   10758652 kB\n");
    putFile("/dev/null", "");
    putFile("/var/log/syslog",
      `Oct 12 03:14:02 ${HOST} systemd[1]: Started Session 14 of user user.\nOct 12 03:14:05 ${HOST} ghostd[666]: connection established with ${REMOTE_IP}\n` +
      `Oct 12 03:14:09 ${HOST} ghostd[666]: indexing /home/user ... done\nOct 12 11:48:31 ${HOST} systemd[1]: Started Session 15 of user user.\n`,
      { group: "adm", mode: 0o640 });
    putFile("/var/log/auth.log",
      `Oct 12 03:13:41 ${HOST} sshd[2188]: Failed password for root from ${REMOTE_IP} port 51342 ssh2\n` +
      `Oct 12 03:13:49 ${HOST} sshd[2188]: Failed password for root from ${REMOTE_IP} port 51342 ssh2\n` +
      `Oct 12 03:14:07 ${HOST} sshd[2210]: Accepted password for user from ${REMOTE_IP} port 51344 ssh2\n` +
      `Oct 12 03:14:07 ${HOST} sshd[2210]: pam_unix(sshd:session): session opened for user user\n`,
      { group: "adm", mode: 0o640, rootOnly: true });
    putFile("/tmp/.x11-cache/ghostd", "\u007fELF", { size: 91204, mode: 0o700, owner: "root" });
    putFile("/root/.watching", "we were never alone.\n", { owner: "root", mode: 0o600, rootOnly: true });

    putFile("/home/user/Documents/notes.txt", "Remember to back up the project files.\nPassword manager: ask Theo.\n", { owner: "user" });
    putFile("/home/user/Documents/todo.txt", "- finish report\n- call mom\n- update the server\n", { owner: "user" });
    putFile("/home/user/Documents/budget_2026.csv", "month,income,expenses\njan,2400,1850\nfeb,2400,1790\n", { owner: "user" });
    putFile("/home/user/Desktop/DO_NOT_OPEN.txt", "Too late. We can already see this file.\n", { owner: "user" });
    putFile("/home/user/Downloads/backup_2026.zip", "PK(simulated archive)", { owner: "user", size: 48213377 });
    putFile("/home/user/Pictures/vacation_001.jpg", "(simulated image)", { owner: "user", size: 3342981 });
    putFile("/home/user/.ssh/id_rsa", "-----BEGIN OPENSSH PRIVATE KEY-----\n(simulated key, not real)\n-----END OPENSSH PRIVATE KEY-----\n", { owner: "user", mode: 0o600 });
    putFile("/home/user/.ssh/known_hosts", "10.0.0.5 ssh-ed25519 AAAA(simulated)\n", { owner: "user" });
    putFile("/home/user/.bash_history", "ls -la\nsudo apt update\nssh admin@10.0.0.5\ncat /var/log/auth.log\n", { owner: "user" });
    putFile("/home/user/.bashrc", "# ~/.bashrc: executed by bash for non-login shells.\nalias ll='ls -alF'\n", { owner: "user" });

    state.user = "user";
    state.sudo = false;
    state.shellStack = [];
    state.cwd = "/home/user";
    state.oldpwd = "/home/user";
    state.status = 0;
    state.history = ["ls -la", "sudo apt update", "ssh admin@10.0.0.5"];
    state.aliases = new Map([["ll", "ls -alF"], ["la", "ls -A"], ["l", "ls -CF"]]);
    state.env = new Map([
      ["HOME", "/home/user"], ["USER", "user"], ["LOGNAME", "user"], ["SHELL", "/bin/bash"],
      ["PATH", DEFAULT_PATH], ["LANG", "en_US.UTF-8"], ["TERM", "xterm-256color"], ["HOSTNAME", HOST]
    ]);
    seedProcesses();
    seedServices();
  }

  /* ------------------------------------------------------------------ */
  /* Prompt and banner                                                   */
  /* ------------------------------------------------------------------ */

  function prompt() {
    const home = homeDir();
    let shown = state.cwd;
    if (shown === home) shown = "~";
    else if (shown.startsWith(`${home}/`)) shown = `~${shown.slice(home.length)}`;
    return `${state.user}@${HOST}:${shown}${state.user === "root" ? "#" : "$"} `;
  }

  function banner() {
    return [
      `Welcome to Ubuntu 22.04.4 LTS (GNU/Linux ${KERNEL} x86_64)`,
      "",
      " * Documentation:  https://help.ubuntu.com",
      " * Support:        https://ubuntu.com/pro",
      "",
      "!!!  WARNING: A REMOTE SESSION IS ACTIVE ON THIS MACHINE  !!!",
      `     Remote host ${REMOTE_IP} has been connected since 03:14.`,
      "",
      "Last login: Mon Oct 12 03:14:07 2026 from " + REMOTE_IP,
      "",
      'Type "help" to list the available commands.',
      "", ""
    ].join("\n");
  }

  /* ------------------------------------------------------------------ */
  /* Parsing                                                             */
  /* ------------------------------------------------------------------ */

  function parseLine(input) {
    const commands = [];
    let current = { joiner: ";", stages: [] };
    let buffer = "";
    let quote = "";
    const flush = () => {
      current.stages.push(buffer);
      buffer = "";
    };
    for (let i = 0; i < input.length; i++) {
      const ch = input[i];
      if (quote) {
        buffer += ch;
        if (ch === "\\" && quote === '"') buffer += input[++i] || "";
        else if (ch === quote) quote = "";
        continue;
      }
      if (ch === "'" || ch === '"') { quote = ch; buffer += ch; continue; }
      if (ch === "\\") { buffer += ch + (input[++i] || ""); continue; }
      if (ch === "|" && input[i + 1] === "|") { flush(); commands.push(current); current = { joiner: "||", stages: [] }; i++; continue; }
      if (ch === "|") { flush(); continue; }
      if (ch === "&" && input[i + 1] === "&") { flush(); commands.push(current); current = { joiner: "&&", stages: [] }; i++; continue; }
      if (ch === ";") { flush(); commands.push(current); current = { joiner: ";", stages: [] }; continue; }
      buffer += ch;
    }
    flush();
    commands.push(current);
    return commands;
  }

  function expandVariable(text, index) {
    // text[index] === "$"; returns [value, nextIndex]
    const rest = text.slice(index + 1);
    let match = rest.match(/^\{([A-Za-z_][A-Za-z0-9_]*)\}/);
    if (match) return [state.env.get(match[1]) ?? "", index + 1 + match[0].length];
    match = rest.match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (match) return [match[0] === "PWD" ? state.cwd : (state.env.get(match[0]) ?? ""), index + 1 + match[0].length];
    if (rest[0] === "?") return [String(state.status), index + 2];
    return ["$", index + 1];
  }

  function tokenizeStage(text) {
    const words = [];
    const redirects = { out: null, err: null, input: null };
    let word = "";
    let started = false;
    let glob = false;
    let quoted = false;
    const pushWord = () => {
      if (started) words.push({ text: word, glob: glob && !quoted });
      word = "";
      started = false;
      glob = false;
      quoted = false;
    };
    const readTarget = (from) => {
      let i = from;
      while (text[i] === " ") i++;
      let target = "";
      let q = "";
      while (i < text.length) {
        const ch = text[i];
        if (q) {
          if (ch === q) q = "";
          else target += ch;
        } else if (ch === "'" || ch === '"') q = ch;
        else if (/\s/.test(ch)) break;
        else target += ch;
        i++;
      }
      return [target, i];
    };
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === "'") {
        const end = text.indexOf("'", i + 1);
        const stop = end < 0 ? text.length : end;
        word += text.slice(i + 1, stop);
        started = true;
        quoted = true;
        i = stop;
      } else if (ch === '"') {
        started = true;
        quoted = true;
        i++;
        while (i < text.length && text[i] !== '"') {
          if (text[i] === "\\" && '"$\\`'.includes(text[i + 1] || "")) {
            word += text[i + 1];
            i += 2;
          } else if (text[i] === "$") {
            const [value, next] = expandVariable(text, i);
            word += value;
            i = next;
          } else word += text[i++];
        }
      } else if (ch === "\\") {
        word += text[++i] ?? "";
        started = true;
      } else if (ch === "$") {
        const [value, next] = expandVariable(text, i);
        word += value;
        started = true;
        i = next - 1;
      } else if (ch === "~" && !started && (i + 1 >= text.length || text[i + 1] === "/" || text[i + 1] === " ")) {
        word += homeDir();
        started = true;
      } else if (ch === ">" || (ch === "&" && text[i + 1] === ">")) {
        let fd = 1;
        if (ch === "&") { fd = 3; i++; }
        else if (started && !quoted && (word === "2" || word === "1")) { fd = Number(word); started = false; word = ""; }
        else pushWord();
        let append = false;
        if (text[i + 1] === ">") { append = true; i++; }
        if (text[i + 1] === "&" && /[12]/.test(text[i + 2] || "")) { i += 2; continue; }
        const [target, next] = readTarget(i + 1);
        i = next - 1;
        const redirect = { path: target, append };
        if (fd === 2) redirects.err = redirect;
        else if (fd === 3) { redirects.out = redirect; redirects.err = redirect; }
        else redirects.out = redirect;
      } else if (ch === "<") {
        pushWord();
        const [target, next] = readTarget(i + 1);
        i = next - 1;
        redirects.input = target;
      } else if (/\s/.test(ch)) {
        pushWord();
      } else {
        if (ch === "*" || ch === "?" || ch === "[") glob = true;
        word += ch;
        started = true;
      }
    }
    pushWord();
    return { words, redirects };
  }

  function expandGlob(word) {
    if (!word.glob) return [word.text];
    const slash = word.text.lastIndexOf("/");
    const dirPart = slash >= 0 ? word.text.slice(0, slash + 1) : "";
    const pattern = word.text.slice(slash + 1);
    if (/[*?[]/.test(dirPart)) return [word.text];
    const dirPath = norm(dirPart || ".");
    const dir = fs.get(dirPath);
    if (!dir || dir.type !== "dir" || isDenied(dirPath)) return [word.text];
    const regex = globRegex(pattern);
    const names = children(dirPath)
      .map((entry) => baseOf(entry.path))
      .filter((name) => regex.test(name) && (pattern.startsWith(".") || !name.startsWith(".")))
      .sort(compareNames);
    return names.length ? names.map((name) => dirPart + name) : [word.text];
  }

  /* ------------------------------------------------------------------ */
  /* Execution                                                           */
  /* ------------------------------------------------------------------ */

  function writeRedirect(redirect, text, label = redirect.path) {
    if (redirect.path === "/dev/null") return;
    const path = norm(redirect.path);
    const existing = fs.get(path);
    if (existing && existing.type === "dir") return `bash: ${label}: Is a directory\n`;
    const parent = fs.get(parentOf(path));
    if (!parent || parent.type !== "dir") return `bash: ${label}: No such file or directory\n`;
    if (!canWrite(path) || (state.sudo ? false : isDenied(path))) return `bash: ${label}: Permission denied\n`;
    if (existing && redirect.append) {
      existing.content += text;
      existing.mtime = new Date();
    } else {
      fs.set(path, makeEntry(path, "file", { content: text, owner: ownerFor(path), mtime: new Date() }));
    }
    return "";
  }

  function invoke(words, ctx) {
    const name = words[0];
    const entry = registry.get(name);
    if (!entry) {
      if (name.includes("/")) {
        const target = at(name);
        if (!target) ctx.err(`bash: ${name}: No such file or directory\n`), ctx.status = 127;
        else if (target.type === "dir") ctx.err(`bash: ${name}: Is a directory\n`), ctx.status = 126;
        else ctx.err(`bash: ${name}: Permission denied\n`), ctx.status = 126;
      } else {
        ctx.err(`${name}: command not found\n`);
        ctx.status = 127;
      }
      return;
    }
    if (words[1] === "--help" && name !== "echo") {
      ctx.out(`Usage: ${entry.usage}\n${entry.description}\n`);
      return;
    }
    try {
      entry.fn(words.slice(1), ctx);
    } catch (error) {
      ctx.err(`${name}: unexpected error\n`);
      ctx.status = 1;
    }
  }

  function execStage(text, stdin, isLast) {
    const { words: rawWords, redirects } = tokenizeStage(text);
    const chunks = [];
    const ctx = {
      stdin,
      status: 0,
      tty: isLast && !redirects.out,
      out(value) { chunks.push([false, String(value)]); },
      err(value) { chunks.push([true, String(value)]); }
    };

    if (redirects.input) {
      const source = at(redirects.input);
      if (!source || source.type !== "file") ctx.err(`bash: ${redirects.input}: No such file or directory\n`), ctx.status = 1;
      else ctx.stdin = source.content;
    }

    let words = [];
    for (const word of rawWords) words.push(...expandGlob(word));

    if (ctx.status === 0 && words.length) {
      if (words.every((word) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(word))) {
        for (const word of words) {
          const index = word.indexOf("=");
          state.env.set(word.slice(0, index), word.slice(index + 1));
        }
      } else {
        const alias = state.aliases.get(words[0]);
        if (alias) words = [...tokenizeStage(alias).words.map((w) => w.text), ...words.slice(1)];
        invoke(words, ctx);
      }
    } else if (!words.length && redirects.out && ctx.status === 0) {
      // "> file" alone creates or truncates the file.
    }

    let stdout = "";
    const shown = [];
    for (const [isErr, value] of chunks) {
      if (isErr) shown.push(value);
      else stdout += value;
    }
    let errText = chunks.filter(([isErr]) => isErr).map(([, value]) => value).join("");
    if (redirects.err) {
      const problem = writeRedirect(redirects.err, errText);
      errText = problem || "";
    }
    let outText = "";
    let passOn = "";
    if (redirects.out) {
      const problem = writeRedirect(redirects.out, stdout);
      if (problem) { errText += problem; ctx.status = 1; }
    } else if (isLast) outText = stdout;
    else passOn = stdout;

    // Keep stdout/stderr in the order the command produced them on a terminal.
    let display = "";
    if (isLast && !redirects.out && !redirects.err) display = chunks.map(([, value]) => value).join("");
    else display = outText + errText;
    return { display, passOn, status: ctx.status };
  }

  function runPipeline(stages) {
    let stdin = null;
    let status = 0;
    stages.forEach((stage, index) => {
      const isLast = index === stages.length - 1;
      const result = execStage(stage, stdin, isLast);
      if (result.display) addText(result.display);
      stdin = result.passOn;
      status = result.status;
    });
    state.status = status;
  }

  function run(input) {
    const line = String(input).trim();
    if (!line) return;
    state.history.push(line);
    for (const command of parseLine(line)) {
      if (command.joiner === "&&" && state.status !== 0) continue;
      if (command.joiner === "||" && state.status === 0) continue;
      runPipeline(command.stages);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Helpers for commands                                                */
  /* ------------------------------------------------------------------ */

  function cmd(name, aliases, description, usage, fn) {
    const entry = { name, aliases, description, usage, fn };
    registry.set(name, entry);
    for (const alias of aliases) registry.set(alias, entry);
  }

  function splitArgs(args, valueOptions = "") {
    const flags = new Set();
    const values = {};
    const operands = [];
    let endOfOptions = false;
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (endOfOptions || arg === "-" || !arg.startsWith("-")) { operands.push(arg); continue; }
      if (arg === "--") { endOfOptions = true; continue; }
      if (arg.startsWith("--")) {
        const [key, value] = arg.slice(2).split("=");
        flags.add(key);
        if (value !== undefined) values[key] = value;
        continue;
      }
      if (/^-\d+$/.test(arg)) { values.n = arg.slice(1); continue; }
      for (let j = 1; j < arg.length; j++) {
        const ch = arg[j];
        flags.add(ch);
        if (valueOptions.includes(ch)) {
          values[ch] = arg.slice(j + 1) || args[++i];
          break;
        }
      }
    }
    return { flags, values, operands };
  }

  function splitLines(text) {
    if (text === "") return [];
    const lines = text.split("\n");
    if (lines[lines.length - 1] === "") lines.pop();
    return lines;
  }

  function gatherFiles(ctx, name, operands) {
    if (!operands.length) {
      return ctx.stdin !== null ? [{ label: "-", text: ctx.stdin }] : [];
    }
    const result = [];
    for (const operand of operands) {
      if (operand === "-" && ctx.stdin !== null) { result.push({ label: "-", text: ctx.stdin }); continue; }
      const path = norm(operand);
      const entry = fs.get(path);
      if (!entry) { ctx.err(`${name}: ${operand}: No such file or directory\n`); ctx.status = 1; continue; }
      if (entry.type === "dir") { ctx.err(`${name}: ${operand}: Is a directory\n`); ctx.status = 1; continue; }
      if (isDenied(path)) { ctx.err(`${name}: ${operand}: Permission denied\n`); ctx.status = 1; continue; }
      result.push({ label: operand, text: entry.content });
    }
    return result;
  }

  function columns(names, width = 80) {
    if (!names.length) return "";
    const colWidth = Math.max(...names.map((n) => n.length)) + 2;
    let cols = Math.min(names.length, Math.max(1, Math.floor(width / colWidth)));
    const rows = Math.ceil(names.length / cols);
    cols = Math.ceil(names.length / rows);
    const lines = [];
    for (let r = 0; r < rows; r++) {
      let line = "";
      for (let c = 0; c < cols; c++) {
        const index = c * rows + r;
        if (index >= names.length) break;
        const isLastInRow = (c + 1) * rows + r >= names.length;
        line += isLastInRow ? names[index] : names[index].padEnd(colWidth);
      }
      lines.push(line);
    }
    return `${lines.join("\n")}\n`;
  }

  function hashString(text) {
    let hash = 5381;
    for (const ch of text) hash = ((hash << 5) + hash + ch.charCodeAt(0)) >>> 0;
    return hash;
  }

  function resolveHost(host) {
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return host.split(".").every((part) => Number(part) <= 255) ? host : null;
    if (host === "localhost") return "127.0.0.1";
    if (host === "google.com" || host === "www.google.com") return "142.250.74.46";
    if (/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(host)) {
      const h = hashString(host.toLowerCase());
      return `${[34, 52, 104, 151, 172, 185][h % 6]}.${(h >> 3) % 256}.${(h >> 11) % 256}.${((h >> 19) % 253) + 1}`;
    }
    return null;
  }

  const randomBetween = (min, max) => min + Math.random() * (max - min);

  function removeTree(path) {
    for (const entry of descendants(path)) fs.delete(entry.path);
    fs.delete(path);
  }

  function copyTree(source, target) {
    const sourceEntry = fs.get(source);
    const clone = (entry, to) => {
      fs.set(to, { ...entry, path: to, owner: ownerFor(to), group: ownerFor(to) === "user" ? "user" : "root", mtime: new Date(), rootOnly: false });
    };
    clone(sourceEntry, target);
    if (sourceEntry.type === "dir") {
      for (const entry of descendants(source)) clone(entry, target + entry.path.slice(source.length));
    }
  }

  function moveTree(source, target) {
    const affected = [fs.get(source), ...descendants(source)];
    for (const entry of affected) fs.delete(entry.path);
    for (const entry of affected) {
      entry.path = target + entry.path.slice(source.length);
      fs.set(entry.path, entry);
    }
  }

  const protectedPath = (path) =>
    depthOf(path) <= 1 || path === "/home/user" || path === "/root";

  /* ------------------------------------------------------------------ */
  /* File commands                                                       */
  /* ------------------------------------------------------------------ */

  function lsFormatEntries(entries, flags, tty) {
    const sorted = [...entries].sort((a, b) => compareNames(a.name, b.name));
    if (flags.has("l")) {
      const rows = sorted.map(({ name, entry }) => {
        const links = entry.type === "dir" ? 2 + children(entry.path).filter((c) => c.type === "dir").length : 1;
        const size = sizeOf(entry);
        return [modeString(entry), String(links), entry.owner, entry.group, flags.has("h") ? human(size) : String(size), lsDate(entry.mtime), name + (flags.has("F") && entry.type === "dir" ? "/" : "")];
      });
      const widths = [0, 1, 2, 3, 4].map((i) => Math.max(...rows.map((row) => row[i].length), 0));
      const blocks = sorted.reduce((sum, { entry }) => sum + Math.max(4, Math.ceil(sizeOf(entry) / 4096) * 4), 0);
      return `total ${blocks}\n` + rows.map((r) =>
        `${r[0]} ${r[1].padStart(widths[1])} ${r[2].padEnd(widths[2])} ${r[3].padEnd(widths[3])} ${r[4].padStart(widths[4])} ${r[5]} ${r[6]}`).join("\n") + "\n";
    }
    const names = sorted.map(({ name, entry }) => name + (flags.has("F") && entry.type === "dir" ? "/" : ""));
    if (!names.length) return "";
    return tty && !flags.has("1") ? columns(names) : `${names.join("\n")}\n`;
  }

  function lsDirectory(ctx, flags, label, path, withHeader, seen = []) {
    if (isDenied(path)) {
      ctx.err(`ls: cannot open directory '${label}': Permission denied\n`);
      ctx.status = 2;
      return;
    }
    const showAll = flags.has("a") || flags.has("all");
    let entries = children(path).map((entry) => ({ name: baseOf(entry.path), entry }));
    if (!showAll) entries = entries.filter(({ name }) => !name.startsWith("."));
    if (showAll && flags.has("a")) {
      const self = fs.get(path);
      entries.push({ name: ".", entry: self }, { name: "..", entry: fs.get(parentOf(path)) || self });
    }
    if (withHeader) ctx.out(`${seen.length ? "\n" : ""}${label}:\n`);
    ctx.out(lsFormatEntries(entries, flags, ctx.tty));
    seen.push(path);
    if (flags.has("R")) {
      const subdirs = children(path).filter((entry) => entry.type === "dir" && (showAll || !baseOf(entry.path).startsWith("."))).sort(byName);
      for (const sub of subdirs) lsDirectory(ctx, flags, label === "/" || label.endsWith("/") ? label + baseOf(sub.path) : `${label}/${baseOf(sub.path)}`, sub.path, true, seen);
    }
  }

  function registerFileCommands() {
    cmd("ls", [], "List directory contents.", "ls [-alhRdF1] [file...]", (args, ctx) => {
      const { flags, operands } = splitArgs(args);
      if (flags.has("R") && operands.some((operand) => norm(operand) === "/") && ctx.tty) {
        startTerminal();
        return;
      }
      const targets = operands.length ? operands : ["."];
      const files = [];
      const dirs = [];
      for (const target of targets) {
        const path = norm(target);
        const entry = fs.get(path);
        if (!entry) {
          ctx.err(`ls: cannot access '${target}': No such file or directory\n`);
          ctx.status = 2;
        } else if (entry.type === "dir" && !flags.has("d")) dirs.push({ label: target, path });
        else files.push({ name: target, entry });
      }
      if (files.length) ctx.out(lsFormatEntries(files, flags, ctx.tty));
      const seen = [];
      dirs.forEach(({ label, path }, index) => {
        if (files.length || dirs.length > 1) {
          if (index > 0 || files.length) ctx.out("\n");
          lsDirectory(ctx, flags, label, path, true, [seen[0] ?? 1].slice(0, 0));
        } else lsDirectory(ctx, flags, label, path, flags.has("R"), seen);
      });
    });

    cmd("cd", [], "Change the working directory.", "cd [dir|-|~]", (args, ctx) => {
      let target = args[0] ?? "~";
      if (target === "-") {
        target = state.oldpwd;
        ctx.out(`${target}\n`);
      }
      const path = norm(target);
      const entry = fs.get(path);
      if (!entry) { ctx.err(`bash: cd: ${args[0]}: No such file or directory\n`); ctx.status = 1; return; }
      if (entry.type !== "dir") { ctx.err(`bash: cd: ${args[0]}: Not a directory\n`); ctx.status = 1; return; }
      if (isDenied(path)) { ctx.err(`bash: cd: ${args[0]}: Permission denied\n`); ctx.status = 1; return; }
      state.oldpwd = state.cwd;
      state.cwd = path;
    });

    cmd("pwd", [], "Print the current working directory.", "pwd", (args, ctx) => ctx.out(`${state.cwd}\n`));

    cmd("mkdir", [], "Create directories.", "mkdir [-p] dir...", (args, ctx) => {
      const { flags, operands } = splitArgs(args);
      if (!operands.length) { ctx.err("mkdir: missing operand\n"); ctx.status = 1; return; }
      for (const operand of operands) {
        const path = norm(operand);
        if (fs.has(path)) {
          if (!flags.has("p")) { ctx.err(`mkdir: cannot create directory '${operand}': File exists\n`); ctx.status = 1; }
          continue;
        }
        if (!canWrite(path)) { ctx.err(`mkdir: cannot create directory '${operand}': Permission denied\n`); ctx.status = 1; continue; }
        const parent = fs.get(parentOf(path));
        if (!parent && !flags.has("p")) { ctx.err(`mkdir: cannot create directory '${operand}': No such file or directory\n`); ctx.status = 1; continue; }
        mkdirp(path, { owner: ownerFor(path) });
      }
    });

    cmd("rmdir", [], "Remove empty directories.", "rmdir dir...", (args, ctx) => {
      if (!args.length) { ctx.err("rmdir: missing operand\n"); ctx.status = 1; return; }
      for (const operand of args) {
        const path = norm(operand);
        const entry = fs.get(path);
        if (!entry) ctx.err(`rmdir: failed to remove '${operand}': No such file or directory\n`), ctx.status = 1;
        else if (entry.type !== "dir") ctx.err(`rmdir: failed to remove '${operand}': Not a directory\n`), ctx.status = 1;
        else if (children(path).length) ctx.err(`rmdir: failed to remove '${operand}': Directory not empty\n`), ctx.status = 1;
        else if (!canWrite(path) || protectedPath(path)) ctx.err(`rmdir: failed to remove '${operand}': Permission denied\n`), ctx.status = 1;
        else fs.delete(path);
      }
    });

    cmd("touch", [], "Create empty files or update timestamps.", "touch file...", (args, ctx) => {
      if (!args.length) { ctx.err("touch: missing file operand\n"); ctx.status = 1; return; }
      for (const operand of args.filter((arg) => !arg.startsWith("-"))) {
        const path = norm(operand);
        const existing = fs.get(path);
        if (!canWrite(path)) { ctx.err(`touch: cannot touch '${operand}': Permission denied\n`); ctx.status = 1; continue; }
        if (existing) existing.mtime = new Date();
        else if (!fs.get(parentOf(path))) { ctx.err(`touch: cannot touch '${operand}': No such file or directory\n`); ctx.status = 1; }
        else fs.set(path, makeEntry(path, "file", { owner: ownerFor(path), mtime: new Date() }));
      }
    });

    cmd("rm", [], "Remove files or directories.", "rm [-rf] file...", (args, ctx) => {
      const { flags, operands } = splitArgs(args);
      const recursive = flags.has("r") || flags.has("R") || flags.has("recursive");
      if (!operands.length) { ctx.err("rm: missing operand\n"); ctx.status = 1; return; }
      for (const operand of operands) {
        const path = norm(operand);
        const entry = fs.get(path);
        if (path === "/") {
          ctx.err("rm: it is dangerous to operate recursively on '/'\nrm: use --no-preserve-root to override this failsafe\n");
          ctx.status = 1;
        } else if (!entry) {
          if (!flags.has("f")) { ctx.err(`rm: cannot remove '${operand}': No such file or directory\n`); ctx.status = 1; }
        } else if (entry.type === "dir" && !recursive) {
          ctx.err(`rm: cannot remove '${operand}': Is a directory\n`); ctx.status = 1;
        } else if (!canWrite(path)) {
          ctx.err(`rm: cannot remove '${operand}': Permission denied\n`); ctx.status = 1;
        } else if (protectedPath(path)) {
          ctx.err(`rm: cannot remove '${operand}': Operation not permitted (simulated safeguard)\n`); ctx.status = 1;
        } else removeTree(path);
      }
    });

    cmd("cp", [], "Copy files and directories.", "cp [-r] source... dest", (args, ctx) => {
      const { flags, operands } = splitArgs(args);
      if (operands.length < 2) { ctx.err(`cp: missing destination file operand after '${operands[0] ?? ""}'\n`); ctx.status = 1; return; }
      const destArg = operands[operands.length - 1];
      const destPath = norm(destArg);
      const destEntry = fs.get(destPath);
      const sources = operands.slice(0, -1);
      if (sources.length > 1 && (!destEntry || destEntry.type !== "dir")) {
        ctx.err(`cp: target '${destArg}' is not a directory\n`); ctx.status = 1; return;
      }
      for (const operand of sources) {
        const source = norm(operand);
        const entry = fs.get(source);
        if (!entry) { ctx.err(`cp: cannot stat '${operand}': No such file or directory\n`); ctx.status = 1; continue; }
        if (isDenied(source)) { ctx.err(`cp: cannot open '${operand}' for reading: Permission denied\n`); ctx.status = 1; continue; }
        if (entry.type === "dir" && !(flags.has("r") || flags.has("R") || flags.has("a"))) {
          ctx.err(`cp: -r not specified; omitting directory '${operand}'\n`); ctx.status = 1; continue;
        }
        const target = destEntry && destEntry.type === "dir" ? joinPath(destPath, baseOf(source)) : destPath;
        if (entry.type === "dir" && underPath(target, source)) {
          ctx.err(`cp: cannot copy a directory, '${operand}', into itself, '${destArg}'\n`); ctx.status = 1; continue;
        }
        if (!fs.get(parentOf(target))) { ctx.err(`cp: cannot create regular file '${destArg}': No such file or directory\n`); ctx.status = 1; continue; }
        if (!canWrite(target)) { ctx.err(`cp: cannot create regular file '${destArg}': Permission denied\n`); ctx.status = 1; continue; }
        copyTree(source, target);
      }
    });

    cmd("mv", [], "Move or rename files.", "mv source... dest", (args, ctx) => {
      const { operands } = splitArgs(args);
      if (operands.length < 2) { ctx.err(`mv: missing destination file operand after '${operands[0] ?? ""}'\n`); ctx.status = 1; return; }
      const destArg = operands[operands.length - 1];
      const destPath = norm(destArg);
      const destEntry = fs.get(destPath);
      const sources = operands.slice(0, -1);
      if (sources.length > 1 && (!destEntry || destEntry.type !== "dir")) {
        ctx.err(`mv: target '${destArg}' is not a directory\n`); ctx.status = 1; return;
      }
      for (const operand of sources) {
        const source = norm(operand);
        const entry = fs.get(source);
        if (!entry) { ctx.err(`mv: cannot stat '${operand}': No such file or directory\n`); ctx.status = 1; continue; }
        const target = destEntry && destEntry.type === "dir" ? joinPath(destPath, baseOf(source)) : destPath;
        if (underPath(target, source)) { ctx.err(`mv: cannot move '${operand}' to a subdirectory of itself, '${destArg}'\n`); ctx.status = 1; continue; }
        if (!fs.get(parentOf(target))) { ctx.err(`mv: cannot move '${operand}' to '${destArg}': No such file or directory\n`); ctx.status = 1; continue; }
        if (!canWrite(source) || !canWrite(target) || protectedPath(source)) {
          ctx.err(`mv: cannot move '${operand}' to '${destArg}': Permission denied\n`); ctx.status = 1; continue;
        }
        if (fs.has(target)) removeTree(target);
        moveTree(source, target);
      }
    });

    cmd("cat", [], "Concatenate files and print them.", "cat [-n] [file...]", (args, ctx) => {
      const { flags, operands } = splitArgs(args);
      for (const file of gatherFiles(ctx, "cat", operands)) {
        if (flags.has("n")) {
          splitLines(file.text).forEach((line, index) => ctx.out(`${sp(index + 1, 6)}\t${line}\n`));
        } else ctx.out(file.text);
      }
    });

    cmd("less", ["more"], "Page through a file (prints it whole here).", "less file", (args, ctx) => {
      for (const file of gatherFiles(ctx, "less", splitArgs(args).operands)) ctx.out(file.text);
    });

    const headTail = (name, fromStart) => (args, ctx) => {
      const { values, operands } = splitArgs(args, "n");
      const count = values.n === undefined ? 10 : Number.parseInt(values.n, 10);
      if (!Number.isInteger(count) || count < 0) { ctx.err(`${name}: invalid number of lines: '${values.n}'\n`); ctx.status = 1; return; }
      const files = gatherFiles(ctx, name, operands);
      files.forEach((file, index) => {
        if (files.length > 1) ctx.out(`${index ? "\n" : ""}==> ${file.label} <==\n`);
        const lines = splitLines(file.text);
        const picked = fromStart ? lines.slice(0, count) : lines.slice(Math.max(0, lines.length - count));
        if (picked.length) ctx.out(`${picked.join("\n")}\n`);
      });
    };
    cmd("head", [], "Output the first lines of files.", "head [-n N] [file...]", headTail("head", true));
    cmd("tail", [], "Output the last lines of files.", "tail [-n N] [file...]", headTail("tail", false));

    cmd("wc", [], "Count lines, words and bytes.", "wc [-lwc] [file...]", (args, ctx) => {
      const { flags, operands } = splitArgs(args);
      const useAll = !flags.has("l") && !flags.has("w") && !flags.has("c");
      const files = gatherFiles(ctx, "wc", operands);
      const rows = files.map((file) => {
        const numbers = [];
        if (useAll || flags.has("l")) numbers.push(splitLines(file.text).length);
        if (useAll || flags.has("w")) numbers.push(file.text.split(/\s+/).filter(Boolean).length);
        if (useAll || flags.has("c")) numbers.push(file.text.length);
        return { numbers, label: file.label === "-" ? "" : file.label };
      });
      const width = Math.max(1, ...rows.flatMap((row) => row.numbers.map((n) => String(n).length)));
      for (const row of rows) ctx.out(`${row.numbers.map((n) => String(n).padStart(width)).join(" ")}${row.label ? ` ${row.label}` : ""}\n`);
    });

    cmd("grep", ["egrep", "fgrep"], "Print lines matching a pattern.", "grep [-inrvcl] pattern [file...]", (args, ctx) => {
      const { flags, operands } = splitArgs(args);
      const pattern = operands.shift();
      if (pattern === undefined) { ctx.err("Usage: grep [OPTION]... PATTERNS [FILE]...\n"); ctx.status = 2; return; }
      let regex;
      try {
        regex = new RegExp(flags.has("F") ? pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : pattern, flags.has("i") ? "i" : "");
      } catch (error) {
        ctx.err(`grep: Invalid regular expression\n`);
        ctx.status = 2;
        return;
      }
      const recursive = flags.has("r") || flags.has("R");
      let sources = [];
      if (!operands.length && ctx.stdin === null && recursive) operands.push(".");
      if (recursive) {
        for (const operand of operands) {
          const path = norm(operand);
          const entry = fs.get(path);
          if (!entry) { ctx.err(`grep: ${operand}: No such file or directory\n`); ctx.status = 2; continue; }
          const files = entry.type === "dir" ? descendants(path).filter((e) => e.type === "file").sort(byName) : [entry];
          for (const file of files) {
            if (isDenied(file.path)) continue;
            const shown = entry.type === "dir" ? `${operand === "." ? "." : operand.replace(/\/$/, "")}${file.path.slice(path.length)}` : operand;
            sources.push({ label: shown, text: file.content });
          }
        }
      } else sources = gatherFiles(ctx, "grep", operands);
      const prefix = sources.length > 1 || recursive;
      let matched = false;
      for (const source of sources) {
        let count = 0;
        for (const [index, line] of splitLines(source.text).entries()) {
          if (regex.test(line) === flags.has("v")) continue;
          count++;
          matched = true;
          if (!flags.has("c") && !flags.has("l")) ctx.out(`${prefix ? `${source.label}:` : ""}${flags.has("n") ? `${index + 1}:` : ""}${line}\n`);
        }
        if (flags.has("c")) ctx.out(`${prefix ? `${source.label}:` : ""}${count}\n`);
        if (flags.has("l") && count) ctx.out(`${source.label}\n`);
      }
      if (!matched && ctx.status === 0) ctx.status = 1;
    });

    cmd("find", [], "Search for files in a directory hierarchy.", "find [path] [-name pattern] [-type f|d] [-maxdepth N]", (args, ctx) => {
      const starts = [];
      let index = 0;
      while (index < args.length && !args[index].startsWith("-")) starts.push(args[index++]);
      let name = null;
      let type = null;
      let maxDepth = Infinity;
      let ignoreCase = false;
      for (; index < args.length; index++) {
        if (args[index] === "-name" || args[index] === "-iname") { ignoreCase = args[index] === "-iname"; name = args[++index]; }
        else if (args[index] === "-type") type = args[++index];
        else if (args[index] === "-maxdepth") maxDepth = Number.parseInt(args[++index], 10);
      }
      if (!starts.length) starts.push(".");
      if (starts.length === 1 && norm(starts[0]) === "/" && name === null && type === null && maxDepth === Infinity && ctx.tty) {
        startTerminal();
        return;
      }
      const regex = name ? new RegExp(globRegex(name).source, ignoreCase ? "i" : "") : null;
      for (const start of starts) {
        const path = norm(start);
        const root = fs.get(path);
        if (!root) { ctx.err(`find: '${start}': No such file or directory\n`); ctx.status = 1; continue; }
        const all = [root, ...descendants(path).sort((a, b) => (a.path < b.path ? -1 : 1))];
        for (const entry of all) {
          if (isDenied(entry.path)) {
            if (entry === root || parentOf(entry.path) === path) ctx.err(`find: '${start.replace(/\/$/, "")}${entry.path.slice(path === "/" ? 0 : path.length)}': Permission denied\n`);
            continue;
          }
          const relDepth = entry.path === path ? 0 : depthOf(entry.path) - depthOf(path);
          if (relDepth > maxDepth) continue;
          if (type === "f" && entry.type !== "file") continue;
          if (type === "d" && entry.type !== "dir") continue;
          if (regex && !regex.test(baseOf(entry.path))) continue;
          ctx.out(`${start.replace(/(.)\/$/, "$1")}${entry.path.slice(path === "/" ? 0 : path.length)}${entry.path === path ? "" : ""}\n`.replace("//", "/"));
        }
      }
    });

    cmd("tree", [], "List directory contents as a tree.", "tree [-a] [-L level] [dir]", (args, ctx) => {
      const { flags, values, operands } = splitArgs(args, "L");
      const target = operands[0] ?? ".";
      const path = norm(target);
      const root = fs.get(path);
      if (!root || root.type !== "dir") { ctx.err(`${target} [error opening dir]\n\n0 directories, 0 files\n`); ctx.status = 2; return; }
      if (isDenied(path)) { ctx.err(`${target}  [error opening dir]\n\n0 directories, 0 files\n`); ctx.status = 2; return; }
      const limit = values.L ? Number.parseInt(values.L, 10) : Infinity;
      const counts = { d: 0, f: 0 };
      const lines = [target];
      const walk = (dir, prefix, depth) => {
        const kids = children(dir).filter((entry) => flags.has("a") || !baseOf(entry.path).startsWith(".")).sort(byName);
        kids.forEach((entry, i) => {
          const last = i === kids.length - 1;
          lines.push(`${prefix}${last ? "└── " : "├── "}${baseOf(entry.path)}`);
          if (entry.type === "dir") {
            counts.d++;
            if (depth < limit && !isDenied(entry.path)) walk(entry.path, `${prefix}${last ? "    " : "│   "}`, depth + 1);
          } else counts.f++;
        });
      };
      walk(path, "", 1);
      ctx.out(`${lines.join("\n")}\n\n${counts.d} director${counts.d === 1 ? "y" : "ies"}, ${counts.f} file${counts.f === 1 ? "" : "s"}\n`);
    });

    cmd("stat", [], "Display file status.", "stat file...", (args, ctx) => {
      if (!args.length) { ctx.err("stat: missing operand\n"); ctx.status = 1; return; }
      for (const operand of args) {
        const path = norm(operand);
        const entry = fs.get(path);
        if (!entry) { ctx.err(`stat: cannot statx '${operand}': No such file or directory\n`); ctx.status = 1; continue; }
        const inode = 1300000 + (hashString(path) % 90000);
        const kind = entry.type === "dir" ? "directory" : sizeOf(entry) === 0 ? "regular empty file" : "regular file";
        const uid = entry.owner === "root" ? 0 : 1000;
        ctx.out(
          `  File: ${operand}\n  Size: ${String(sizeOf(entry)).padEnd(10)}\tBlocks: ${String(Math.ceil(sizeOf(entry) / 512)).padEnd(10)} IO Block: 4096   ${kind}\n` +
          `Device: 802h/2050d\tInode: ${String(inode).padEnd(11)} Links: ${entry.type === "dir" ? 2 : 1}\n` +
          `Access: (${pad(entry.mode.toString(8), 4)}/${modeString(entry)})  Uid: (${sp(uid, 5)}/${entry.owner.padStart(8)})   Gid: (${sp(uid, 5)}/${entry.group.padStart(8)})\n` +
          `Access: ${isoDate(entry.mtime)}\nModify: ${isoDate(entry.mtime)}\nChange: ${isoDate(entry.mtime)}\n Birth: -\n`);
      }
    });

    cmd("chmod", [], "Change file mode bits.", "chmod mode file...", (args, ctx) => {
      const { operands } = splitArgs(args.filter((arg) => !/^-[rR]$/.test(arg)));
      if (operands.length < 2) { ctx.err("chmod: missing operand\n"); ctx.status = 1; return; }
      const [mode, ...files] = operands;
      for (const operand of files) {
        const path = norm(operand);
        const entry = fs.get(path);
        if (!entry) { ctx.err(`chmod: cannot access '${operand}': No such file or directory\n`); ctx.status = 1; continue; }
        if (!canWrite(path) || (entry.owner === "root" && !isRoot())) { ctx.err(`chmod: changing permissions of '${operand}': Operation not permitted\n`); ctx.status = 1; continue; }
        if (/^[0-7]{3,4}$/.test(mode)) entry.mode = Number.parseInt(mode, 8) & 0o777;
        else {
          let valid = true;
          for (const clause of mode.split(",")) {
            const match = clause.match(/^([ugoa]*)([-+=])([rwx]*)$/);
            if (!match) { valid = false; break; }
            const who = match[1] || "a";
            let mask = 0;
            for (const permission of match[3]) {
              const bit = { r: 4, w: 2, x: 1 }[permission];
              if (who.includes("u") || who.includes("a")) mask |= bit << 6;
              if (who.includes("g") || who.includes("a")) mask |= bit << 3;
              if (who.includes("o") || who.includes("a")) mask |= bit;
            }
            if (match[2] === "+") entry.mode |= mask;
            else if (match[2] === "-") entry.mode &= ~mask;
            else entry.mode = mask;
          }
          if (!valid) { ctx.err(`chmod: invalid mode: '${mode}'\n`); ctx.status = 1; return; }
        }
      }
    });

    cmd("chown", [], "Change file owner and group.", "chown user[:group] file...", (args, ctx) => {
      const { operands } = splitArgs(args.filter((arg) => !/^-[rR]$/.test(arg)));
      if (operands.length < 2) { ctx.err("chown: missing operand\n"); ctx.status = 1; return; }
      const [spec, ...files] = operands;
      const [owner, group] = spec.split(":");
      for (const operand of files) {
        const entry = at(operand);
        if (!entry) { ctx.err(`chown: cannot access '${operand}': No such file or directory\n`); ctx.status = 1; continue; }
        if (!isRoot()) { ctx.err(`chown: changing ownership of '${operand}': Operation not permitted\n`); ctx.status = 1; continue; }
        if (owner) entry.owner = owner;
        if (group) entry.group = group;
      }
    });

    cmd("file", [], "Determine file type.", "file file...", (args, ctx) => {
      for (const operand of args) {
        const entry = at(operand);
        if (!entry) ctx.out(`${operand}: cannot open \`${operand}' (No such file or directory)\n`);
        else if (entry.type === "dir") ctx.out(`${operand}: directory\n`);
        else if (entry.content.startsWith("\u007fELF")) ctx.out(`${operand}: ELF 64-bit LSB pie executable, x86-64, dynamically linked, stripped\n`);
        else if (/\.zip$/.test(operand)) ctx.out(`${operand}: Zip archive data\n`);
        else if (/\.jpg$/.test(operand)) ctx.out(`${operand}: JPEG image data\n`);
        else ctx.out(`${operand}: ${entry.content === "" ? "empty" : "ASCII text"}\n`);
      }
    });

    cmd("du", [], "Estimate file space usage.", "du [-sh] [path...]", (args, ctx) => {
      const { flags, operands } = splitArgs(args);
      const show = (bytes) => (flags.has("h") ? human(bytes) : String(Math.max(4, Math.ceil(bytes / 1024))));
      for (const operand of operands.length ? operands : ["."]) {
        const path = norm(operand);
        const entry = fs.get(path);
        if (!entry) { ctx.err(`du: cannot access '${operand}': No such file or directory\n`); ctx.status = 1; continue; }
        const total = (dir) => descendants(dir).reduce((sum, e) => sum + sizeOf(e), 4096);
        if (entry.type !== "dir") { ctx.out(`${show(sizeOf(entry))}\t${operand}\n`); continue; }
        if (!flags.has("s")) {
          for (const sub of descendants(path).filter((e) => e.type === "dir" && !isDenied(e.path)).sort(byName)) {
            ctx.out(`${show(total(sub.path))}\t${operand.replace(/\/$/, "")}${sub.path.slice(path === "/" ? 0 : path.length)}\n`);
          }
        }
        ctx.out(`${show(total(path))}\t${operand}\n`);
      }
    });

    cmd("echo", [], "Display a line of text.", "echo [-ne] text", (args, ctx) => {
      let newline = true;
      let escapes = false;
      const rest = [...args];
      while (rest[0] && /^-[neE]+$/.test(rest[0])) {
        const flag = rest.shift();
        if (flag.includes("n")) newline = false;
        if (flag.includes("e")) escapes = true;
      }
      let text = rest.join(" ");
      if (escapes) text = text.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\\\/g, "\\");
      ctx.out(text + (newline ? "\n" : ""));
    });

    cmd("tee", [], "Read stdin, write to files and stdout.", "tee [-a] file...", (args, ctx) => {
      const { flags, operands } = splitArgs(args);
      const text = ctx.stdin ?? "";
      for (const operand of operands) {
        const problem = writeRedirect({ path: operand, append: flags.has("a") }, text, operand);
        if (problem) { ctx.err(problem.replace("bash: ", "tee: ")); ctx.status = 1; }
      }
      ctx.out(text);
    });

    cmd("sort", [], "Sort lines of text.", "sort [-rnu] [file...]", (args, ctx) => {
      const { flags, operands } = splitArgs(args);
      let lines = gatherFiles(ctx, "sort", operands).flatMap((file) => splitLines(file.text));
      lines.sort(flags.has("n") ? (a, b) => parseFloat(a) - parseFloat(b) : (a, b) => compareNames(a, b));
      if (flags.has("r")) lines.reverse();
      if (flags.has("u")) lines = lines.filter((line, i) => i === 0 || line !== lines[i - 1]);
      if (lines.length) ctx.out(`${lines.join("\n")}\n`);
    });

    cmd("uniq", [], "Report or omit repeated lines.", "uniq [-c] [file]", (args, ctx) => {
      const { flags, operands } = splitArgs(args);
      const lines = gatherFiles(ctx, "uniq", operands).flatMap((file) => splitLines(file.text));
      const groups = [];
      for (const line of lines) {
        if (groups.length && groups[groups.length - 1].line === line) groups[groups.length - 1].count++;
        else groups.push({ line, count: 1 });
      }
      for (const { line, count } of groups) ctx.out(`${flags.has("c") ? `${sp(count, 7)} ` : ""}${line}\n`);
    });

    cmd("which", [], "Locate a command.", "which command...", (args, ctx) => {
      for (const name of args) {
        if (registry.has(name)) ctx.out(`/usr/bin/${name}\n`);
        else ctx.status = 1;
      }
    });

    cmd("sleep", [], "Delay for a specified time (instant here).", "sleep seconds", (args, ctx) => {
      if (!args.length) { ctx.err("sleep: missing operand\n"); ctx.status = 1; }
    });
    cmd("true", [], "Do nothing, successfully.", "true", () => {});
    cmd("false", [], "Do nothing, unsuccessfully.", "false", (args, ctx) => { ctx.status = 1; });
    for (const editor of ["nano", "vi", "vim"]) {
      cmd(editor, [], "Text editor (not available in this simulation).", `${editor} file`, (args, ctx) => {
        ctx.err(`${editor}: no text editor in this simulated terminal. Try: echo "text" > file\n`);
        ctx.status = 1;
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* System commands                                                     */
  /* ------------------------------------------------------------------ */

  const psRow = (p) => `${p.user.padEnd(10).slice(0, 10)}${sp(p.pid, 7)} ${sp(p.cpu.toFixed(1), 4)} ${sp(p.mem.toFixed(1), 4)} ${sp(p.vsz, 7)} ${sp(p.rss, 6)} ${p.tty.padEnd(8)} ${p.stat.padEnd(4)} ${p.start.padEnd(5)} ${sp(p.time, 5)} ${p.cmd}`;

  function currentProcesses() {
    const psPid = nextPid++;
    return [
      ...processes,
      { pid: psPid, ppid: 3001, user: effectiveUser(), cpu: 0, mem: 0, vsz: 12048, rss: 3456, tty: "pts/0", stat: "R+", start: clock().slice(0, 5), time: "0:00", cmd: "ps" }
    ];
  }

  function registerSystemCommands() {
    cmd("hostname", [], "Show the system host name.", "hostname [-I|-f]", (args, ctx) => {
      ctx.out(args.includes("-I") ? `${MY_IP} \n` : `${HOST}\n`);
    });

    cmd("uname", [], "Print system information.", "uname [-asnrvmo]", (args, ctx) => {
      const { flags } = splitArgs(args);
      const all = flags.has("a") || flags.has("all");
      const parts = [];
      if (all || flags.has("s") || !flags.size) parts.push("Linux");
      if (all || flags.has("n")) parts.push(HOST);
      if (all || flags.has("r")) parts.push(KERNEL);
      if (all || flags.has("v")) parts.push(KERNEL_BUILD);
      if (all || flags.has("m")) parts.push("x86_64");
      if (all) parts.push("x86_64", "x86_64");
      if (all || flags.has("o")) parts.push("GNU/Linux");
      ctx.out(`${parts.join(" ")}\n`);
    });

    cmd("whoami", [], "Print the effective user name.", "whoami", (args, ctx) => ctx.out(`${effectiveUser()}\n`));
    cmd("id", [], "Print user and group IDs.", "id", (args, ctx) => {
      ctx.out(isRoot()
        ? "uid=0(root) gid=0(root) groups=0(root)\n"
        : "uid=1000(user) gid=1000(user) groups=1000(user),4(adm),24(cdrom),27(sudo),30(dip),46(plugdev)\n");
    });
    cmd("groups", [], "Print the groups of the current user.", "groups", (args, ctx) => {
      ctx.out(isRoot() ? "root\n" : "user adm cdrom sudo dip plugdev\n");
    });

    cmd("date", [], "Print the system date and time.", "date", (args, ctx) => ctx.out(`${fullDate(new Date())}\n`));

    cmd("uptime", [], "Show how long the system has been running.", "uptime [-p]", (args, ctx) => {
      ctx.out(args.includes("-p")
        ? "up 3 days, 7 hours, 8 minutes\n"
        : ` ${clock()} up 3 days,  7:08,  2 users,  load average: 0.52, 0.41, 0.38\n`);
    });

    cmd("free", [], "Display memory usage.", "free [-h|-m]", (args, ctx) => {
      const { flags } = splitArgs(args);
      const table = (rows) => {
        ctx.out(`${"".padEnd(8)}${["total", "used", "free", "shared", "buff/cache", "available"].map((h) => h.padStart(12)).join("")}\n`);
        for (const [label, ...cells] of rows) ctx.out(`${label.padEnd(8)}${cells.map((c) => String(c).padStart(12)).join("")}\n`);
      };
      if (flags.has("h")) table([["Mem:", "15Gi", "4.6Gi", "7.7Gi", "305Mi", "3.2Gi", "10Gi"], ["Swap:", "2.0Gi", "0B", "2.0Gi"]]);
      else if (flags.has("m")) table([["Mem:", 15936, 4708, 7924, 305, 3303, 10506], ["Swap:", 2047, 0, 2047]]);
      else table([["Mem:", 16318400, 4821336, 8115028, 312448, 3382036, 10758652], ["Swap:", 2097148, 0, 2097148]]);
    });

    cmd("df", [], "Report file system disk space usage.", "df [-h]", (args, ctx) => {
      if (args.includes("-h")) {
        ctx.out("Filesystem      Size  Used Avail Use% Mounted on\ntmpfs           1.6G  2.1M  1.6G   1% /run\n" +
          "/dev/sda2       234G   68G  155G  31% /\ntmpfs           7.8G     0  7.8G   0% /dev/shm\n/dev/sda1       511M  6.1M  505M   2% /boot/efi\n");
      } else {
        ctx.out("Filesystem     1K-blocks      Used Available Use% Mounted on\ntmpfs            1631840      2152   1629688   1% /run\n" +
          "/dev/sda2      244506144  70811832 161596576  31% /\ntmpfs            8159200         0   8159200   0% /dev/shm\n/dev/sda1         523248      6220    517028   2% /boot/efi\n");
      }
    });

    cmd("lscpu", [], "Display CPU architecture information.", "lscpu", (args, ctx) => {
      ctx.out("Architecture:                    x86_64\nCPU op-mode(s):                  32-bit, 64-bit\nByte Order:                      Little Endian\n" +
        "CPU(s):                          8\nModel name:                      Intel(R) Core(TM) i7-9700 CPU @ 3.00GHz\n" +
        "Thread(s) per core:              1\nCore(s) per socket:              8\nCPU max MHz:                     4700.0000\nVirtualization:                  VT-x\n");
    });

    cmd("lsb_release", [], "Print distribution information.", "lsb_release -a", (args, ctx) => {
      ctx.out("No LSB modules are available.\nDistributor ID:\tUbuntu\nDescription:\tUbuntu 22.04.4 LTS\nRelease:\t22.04\nCodename:\tjammy\n");
    });

    cmd("neofetch", [], "Show a system summary.", "neofetch", (args, ctx) => {
      const art = ["    .-\"\"\"\"\"-.   ", "   /  _   _  \\  ", "  |  (o) (o)  | ", "   \\    ^    /  ", "    '-|||||-'   ", "      |||||     "];
      const info = [
        `${effectiveUser()}@${HOST}`, "-------------", "OS: Ubuntu 22.04.4 LTS x86_64", `Kernel: ${KERNEL}`, "Uptime: 3 days, 7 hours", "Shell: bash 5.1.16",
        "CPU: Intel i7-9700 (8) @ 4.700GHz", "Memory: 4708MiB / 15936MiB", `Remote: ${REMOTE_IP}`
      ];
      for (let i = 0; i < Math.max(art.length, info.length); i++) ctx.out(`${(art[i] ?? "").padEnd(18)}${info[i] ?? ""}\n`);
    });

    cmd("ps", [], "Report a snapshot of the current processes.", "ps [aux|-ef]", (args, ctx) => {
      const list = currentProcesses();
      const text = args.join(" ");
      if (/aux|-e?f|-A|-e/.test(text)) {
        if (/-ef|-f/.test(text) && !/aux/.test(text)) {
          ctx.out("UID          PID    PPID  C STIME TTY          TIME CMD\n");
          for (const p of list) ctx.out(`${p.user.padEnd(8)}${sp(p.pid, 8)}${sp(p.ppid, 8)}  0 ${p.start.padEnd(5)} ${p.tty.padEnd(8)} 00:${pad(Number.parseInt(p.time, 10))}:00 ${p.cmd}\n`);
        } else {
          ctx.out("USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\n");
          for (const p of list) ctx.out(`${psRow(p)}\n`);
        }
        return;
      }
      ctx.out("    PID TTY          TIME CMD\n");
      for (const p of list.filter((x) => x.tty === "pts/0")) ctx.out(`${sp(p.pid, 7)} ${p.tty.padEnd(8)} 00:00:00 ${p.cmd.replace(/^-/, "")}\n`);
    });

    cmd("top", [], "Display a snapshot of running tasks.", "top", (args, ctx) => {
      const list = [...processes].sort((a, b) => b.cpu - a.cpu).slice(0, 10);
      ctx.out(`top - ${clock()} up 3 days,  7:08,  2 users,  load average: 0.52, 0.41, 0.38\n` +
        `Tasks: ${processes.length + 200} total,   1 running, ${processes.length + 199} sleeping,   0 stopped,   0 zombie\n` +
        "%Cpu(s):  3.1 us,  1.2 sy,  0.0 ni, 95.4 id,  0.2 wa,  0.0 hi,  0.1 si,  0.0 st\n" +
        "MiB Mem :  15936.0 total,   7924.6 free,   4708.2 used,   3303.2 buff/cache\n" +
        "MiB Swap:   2048.0 total,   2048.0 free,      0.0 used.  10506.5 avail Mem\n\n" +
        "    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND\n");
      for (const p of list) {
        ctx.out(`${sp(p.pid, 7)} ${p.user.padEnd(9)} 20   0 ${sp(p.vsz, 7)} ${sp(p.rss, 6)} ${sp(Math.round(p.rss / 3), 6)} ${p.stat[0]} ${sp(p.cpu.toFixed(1), 5)} ${sp(p.mem.toFixed(1), 5)} ${sp(`${p.time}.00`, 9)} ${baseOf(p.cmd.split(" ")[0])}\n`);
      }
    });

    cmd("kill", [], "Send a signal to a process.", "kill [-9] pid...", (args, ctx) => {
      const pids = args.filter((arg) => !arg.startsWith("-"));
      if (!pids.length) { ctx.err("kill: usage: kill [-s sigspec | -n signum | -sigspec] pid | jobspec ... or kill -l [sigspec]\n"); ctx.status = 2; return; }
      for (const raw of pids) {
        const pid = Number.parseInt(raw, 10);
        const index = processes.findIndex((p) => p.pid === pid);
        if (Number.isNaN(pid)) ctx.err(`bash: kill: ${raw}: arguments must be process or job IDs\n`), ctx.status = 1;
        else if (index < 0) ctx.err(`bash: kill: (${pid}) - No such process\n`), ctx.status = 1;
        else if (pid === 1 || pid === 666 || (processes[index].user !== "user" && !isRoot()) || pid === 2) ctx.err(`bash: kill: (${pid}) - Operation not permitted\n`), ctx.status = 1;
        else processes.splice(index, 1);
      }
    });

    cmd("killall", ["pkill"], "Kill processes by name.", "killall name...", (args, ctx) => {
      for (const name of args.filter((arg) => !arg.startsWith("-"))) {
        const matches = processes.filter((p) => baseOf(p.cmd.split(" ")[0]) === name || p.cmd.includes(name));
        if (!matches.length) { ctx.err(`${name}: no process found\n`); ctx.status = 1; continue; }
        for (const process of matches) {
          if (process.pid === 1 || process.pid === 666 || (process.user !== "user" && !isRoot())) {
            ctx.err(`${name}(${process.pid}): Operation not permitted\n`);
            ctx.status = 1;
          } else processes.splice(processes.indexOf(process), 1);
        }
      }
    });

    cmd("lsblk", [], "List block devices.", "lsblk", (args, ctx) => {
      ctx.out("NAME   MAJ:MIN RM   SIZE RO TYPE MOUNTPOINTS\nsda      8:0    0 238.5G  0 disk \n├─sda1   8:1    0   512M  0 part /boot/efi\n└─sda2   8:2    0   238G  0 part /\n");
    });

    cmd("dmesg", [], "Print kernel ring buffer messages.", "dmesg", (args, ctx) => {
      if (!isRoot()) { ctx.err("dmesg: read kernel buffer failed: Operation not permitted\n"); ctx.status = 1; return; }
      ctx.out(`[    0.000000] Linux version ${KERNEL}\n[    0.412311] smpboot: CPU0: Intel(R) Core(TM) i7-9700 CPU @ 3.00GHz\n` +
        "[    2.118842] EXT4-fs (sda2): mounted filesystem with ordered data mode\n[ 9114.552013] ghostd[666]: unexpected remote login on pts/1\n");
    });

    const printEnv = (ctx) => {
      for (const [key, value] of state.env) ctx.out(`${key}=${value}\n`);
      ctx.out(`PWD=${state.cwd}\n`);
    };
    cmd("env", [], "Print the environment.", "env", (args, ctx) => printEnv(ctx));
    cmd("printenv", [], "Print environment variables.", "printenv [name]", (args, ctx) => {
      if (!args.length) return printEnv(ctx);
      const value = args[0] === "PWD" ? state.cwd : state.env.get(args[0]);
      if (value === undefined) ctx.status = 1;
      else ctx.out(`${value}\n`);
    });
    cmd("export", [], "Set environment variables.", "export NAME=value", (args, ctx) => {
      if (!args.length) { for (const [key, value] of state.env) ctx.out(`declare -x ${key}="${value}"\n`); return; }
      for (const arg of args) {
        const index = arg.indexOf("=");
        if (index > 0) state.env.set(arg.slice(0, index), arg.slice(index + 1));
      }
    });

    cmd("history", [], "Show the command history.", "history [-c]", (args, ctx) => {
      if (args[0] === "-c") { state.history = []; return; }
      state.history.forEach((line, index) => ctx.out(`${sp(index + 1, 5)}  ${line}\n`));
    });

    cmd("who", [], "Show who is logged on.", "who", (args, ctx) => {
      ctx.out("user     tty7         2026-10-09 04:42 (:0)\nuser     pts/1        2026-10-12 03:14 (" + REMOTE_IP + ")\n");
    });

    cmd("w", [], "Show who is logged on and what they are doing.", "w", (args, ctx) => {
      ctx.out(` ${clock()} up 3 days,  7:08,  2 users,  load average: 0.52, 0.41, 0.38\n` +
        "USER     TTY      FROM             LOGIN@   IDLE   JCPU   PCPU WHAT\n" +
        "user     tty7     :0               Fri04    3days  1:12m  0.02s /usr/bin/gnome-session\n" +
        `user     pts/1    ${REMOTE_IP.padEnd(16)} 03:14    0.00s  0.41s  0.03s -bash\n`);
    });

    cmd("last", [], "Show a listing of last logged in users.", "last", (args, ctx) => {
      ctx.out(`user     pts/1        ${REMOTE_IP.padEnd(16)} Mon Oct 12 03:14   still logged in\nuser     tty7         :0               Fri Oct  9 04:42   still logged in\n` +
        `reboot   system boot  ${KERNEL} Fri Oct  9 04:41   still running\n\nwtmp begins Fri Oct  9 04:41:55 2026\n`);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Network commands                                                    */
  /* ------------------------------------------------------------------ */

  function registerNetworkCommands() {
    cmd("ping", [], "Send ICMP echo requests (simulated).", "ping [-c count] host", (args, ctx) => {
      const { values, operands } = splitArgs(args, "c");
      const host = operands[0];
      if (!host) { ctx.err("ping: usage error: Destination address required\n"); ctx.status = 2; return; }
      const count = values.c === undefined ? 4 : Number.parseInt(values.c, 10);
      if (!Number.isInteger(count) || count < 1) { ctx.err(`ping: invalid argument: '${values.c}'\n`); ctx.status = 2; return; }
      const ip = resolveHost(host);
      if (!ip) { ctx.err(`ping: ${host}: Name or service not known\n`); ctx.status = 2; return; }
      const local = ip.startsWith("127.");
      ctx.out(`PING ${host} (${ip}) 56(84) bytes of data.\n`);
      const times = [];
      for (let i = 1; i <= count; i++) {
        const time = local ? randomBetween(0.02, 0.06) : randomBetween(11, 26);
        times.push(time);
        ctx.out(`64 bytes from ${ip}: icmp_seq=${i} ttl=${local ? 64 : 117} time=${time.toFixed(local ? 3 : 1)} ms\n`);
      }
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const mdev = Math.sqrt(times.reduce((a, b) => a + (b - avg) ** 2, 0) / times.length);
      ctx.out(`\n--- ${host} ping statistics ---\n${count} packets transmitted, ${count} received, 0% packet loss, time ${(count - 1) * 1001 + 3}ms\n` +
        `rtt min/avg/max/mdev = ${Math.min(...times).toFixed(3)}/${avg.toFixed(3)}/${Math.max(...times).toFixed(3)}/${mdev.toFixed(3)} ms\n`);
    });

    cmd("traceroute", ["tracepath"], "Print the route packets take to a host (simulated).", "traceroute host", (args, ctx) => {
      const host = args.find((arg) => !arg.startsWith("-"));
      if (!host) { ctx.err("Usage: traceroute [options] host\n"); ctx.status = 2; return; }
      const ip = resolveHost(host);
      if (!ip) { ctx.err(`${host}: Name or service not known\nCannot handle "host" cmdline arg \`${host}' on position 1 (argc 1)\n`); ctx.status = 2; return; }
      ctx.out(`traceroute to ${host} (${ip}), 30 hops max, 60 byte packets\n`);
      const hops = [[`_gateway (${GATEWAY})`, 1], ["10.64.0.1", 8], ["81.246.14.9", 11], ["195.219.50.12", 14], ["72.14.213.8", 16], [`${ip}`, 18]];
      hops.forEach(([label, base], index) => {
        const sample = () => `${(base + Math.random() * 3).toFixed(3)} ms`;
        ctx.out(`${sp(index + 1)}  ${label}  ${sample()}  ${sample()}  ${sample()}\n`);
      });
    });

    cmd("nslookup", [], "Query DNS servers (simulated).", "nslookup host", (args, ctx) => {
      const host = args[0];
      if (!host) { ctx.out("> \n"); return; }
      const ip = resolveHost(host);
      ctx.out("Server:\t\t127.0.0.53\nAddress:\t127.0.0.53#53\n\n");
      if (!ip) { ctx.out(`** server can't find ${host}: NXDOMAIN\n\n`); ctx.status = 1; return; }
      ctx.out(`Non-authoritative answer:\nName:\t${host}\nAddress: ${ip}\n\n`);
    });

    cmd("dig", [], "DNS lookup utility (simulated).", "dig [+short] host", (args, ctx) => {
      const host = args.find((arg) => !arg.startsWith("+") && !arg.startsWith("@"));
      if (!host) { ctx.out("; <<>> DiG 9.18.18 <<>>\n;; global options: +cmd\n"); return; }
      const ip = resolveHost(host);
      if (args.includes("+short")) { if (ip) ctx.out(`${ip}\n`); return; }
      ctx.out(`\n; <<>> DiG 9.18.18-0ubuntu0.22.04.2-Ubuntu <<>> ${host}\n;; global options: +cmd\n;; Got answer:\n` +
        `;; ->>HEADER<<- opcode: QUERY, status: ${ip ? "NOERROR" : "NXDOMAIN"}, id: 41732\n` +
        `;; flags: qr rd ra; QUERY: 1, ANSWER: ${ip ? 1 : 0}, AUTHORITY: 0, ADDITIONAL: 1\n\n;; QUESTION SECTION:\n;${host}.\t\t\tIN\tA\n\n`);
      if (ip) ctx.out(`;; ANSWER SECTION:\n${host}.\t\t187\tIN\tA\t${ip}\n\n`);
      ctx.out(`;; Query time: 12 msec\n;; SERVER: 127.0.0.53#53(127.0.0.53) (UDP)\n;; WHEN: ${fullDate(new Date())}\n;; MSG SIZE  rcvd: 55\n\n`);
    });

    const sockets = [
      ["tcp", 0, 0, "127.0.0.53:53", "0.0.0.0:*", "LISTEN", "412/systemd-resolve"],
      ["tcp", 0, 0, "0.0.0.0:22", "0.0.0.0:*", "LISTEN", "703/sshd: /usr/sbin"],
      ["tcp", 0, 0, "127.0.0.1:631", "0.0.0.0:*", "LISTEN", "-"],
      ["tcp", 0, 0, `${MY_IP}:22`, `${REMOTE_IP}:51344`, "ESTABLISHED", "2210/sshd: user [pr"],
      ["tcp", 0, 0, `${MY_IP}:41822`, "142.250.74.46:443", "ESTABLISHED", "1587/firefox"],
      ["udp", 0, 0, "127.0.0.53:53", "0.0.0.0:*", "", "412/systemd-resolve"],
      ["udp", 0, 0, `${MY_IP}:68`, "0.0.0.0:*", "", "689/NetworkManager"]
    ];
    cmd("netstat", [], "Print network connections (simulated).", "netstat [-tulpn]", (args, ctx) => {
      const { flags } = splitArgs(args);
      const listenOnly = flags.has("l");
      ctx.out(`Active Internet connections (${listenOnly ? "only servers" : "servers and established"})\nProto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name\n`);
      for (const [proto, rq, sq, local, remote, st, program] of sockets) {
        if (listenOnly && st === "ESTABLISHED") continue;
        ctx.out(`${proto.padEnd(5)} ${sp(rq, 6)} ${sp(sq, 6)} ${local.padEnd(23)} ${remote.padEnd(23)} ${st.padEnd(11)} ${flags.has("p") ? program : ""}`.trimEnd() + "\n");
      }
    });

    cmd("ss", [], "Investigate sockets (simulated).", "ss [-tulpn]", (args, ctx) => {
      const { flags } = splitArgs(args);
      ctx.out(`Netid State      Recv-Q Send-Q ${"Local Address:Port".padEnd(24)} ${"Peer Address:Port".padEnd(24)}${flags.has("p") ? " Process" : ""}\n`);
      for (const [proto, rq, sq, local, remote, st, program] of sockets) {
        if (flags.has("l") && st === "ESTABLISHED") continue;
        ctx.out(`${proto.padEnd(5)} ${(st === "LISTEN" ? "LISTEN" : st === "" ? "UNCONN" : "ESTAB").padEnd(10)} ${sp(rq, 6)} ${sp(sq, 6)} ${local.padEnd(24)} ${remote.replace("0.0.0.0:*", "0.0.0.0:*").padEnd(24)}${flags.has("p") ? ` users:(("${program.split("/")[1] ?? "-"}",pid=${program.split("/")[0]}))` : ""}`.trimEnd() + "\n");
      }
    });

    cmd("arp", [], "Show the ARP table (simulated).", "arp [-a|-n]", (args, ctx) => {
      if (args.includes("-a")) {
        ctx.out(`_gateway (${GATEWAY}) at 3c:84:6a:12:34:56 [ether] on ${IFACE}\n? (192.168.1.18) at a4:5e:60:11:22:33 [ether] on ${IFACE}\n`);
      } else {
        ctx.out(`Address                  HWtype  HWaddress           Flags Mask            Iface\n${GATEWAY.padEnd(24)} ether   3c:84:6a:12:34:56   C                     ${IFACE}\n192.168.1.18             ether   a4:5e:60:11:22:33   C                     ${IFACE}\n`);
      }
    });

    cmd("route", [], "Show the IP routing table (simulated).", "route [-n]", (args, ctx) => {
      ctx.out(`Kernel IP routing table\nDestination     Gateway         Genmask         Flags Metric Ref    Use Iface\n0.0.0.0         ${GATEWAY.padEnd(15)} 0.0.0.0         UG    100    0        0 ${IFACE}\n169.254.0.0     0.0.0.0         255.255.0.0     U     1000   0        0 ${IFACE}\n192.168.1.0     0.0.0.0         255.255.255.0   U     100    0        0 ${IFACE}\n`);
    });

    const ipAddr = (ctx) => ctx.out(
      "1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000\n    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00\n    inet 127.0.0.1/8 scope host lo\n       valid_lft forever preferred_lft forever\n" +
      `2: ${IFACE}: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000\n    link/ether ${MAC} brd ff:ff:ff:ff:ff:ff\n    inet ${MY_IP}/24 brd 192.168.1.255 scope global dynamic noprefixroute ${IFACE}\n       valid_lft 85312sec preferred_lft 85312sec\n`);
    cmd("ip", [], "Show network configuration (simulated).", "ip addr | ip route | ip link | ip neigh", (args, ctx) => {
      const sub = (args[0] || "addr").toLowerCase();
      if (["a", "addr", "address"].includes(sub)) ipAddr(ctx);
      else if (["r", "route"].includes(sub)) ctx.out(`default via ${GATEWAY} dev ${IFACE} proto dhcp metric 100\n192.168.1.0/24 dev ${IFACE} proto kernel scope link src ${MY_IP} metric 100\n`);
      else if (["l", "link"].includes(sub)) ctx.out(`1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 state UNKNOWN\n    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00\n2: ${IFACE}: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP\n    link/ether ${MAC} brd ff:ff:ff:ff:ff:ff\n`);
      else if (["n", "neigh", "neighbour"].includes(sub)) ctx.out(`${GATEWAY} dev ${IFACE} lladdr 3c:84:6a:12:34:56 REACHABLE\n192.168.1.18 dev ${IFACE} lladdr a4:5e:60:11:22:33 STALE\n`);
      else { ctx.err(`Object "${args[0]}" is unknown, try "ip help".\n`); ctx.status = 1; }
    });

    cmd("ifconfig", [], "Configure a network interface (simulated).", "ifconfig", (args, ctx) => {
      ctx.out(`${IFACE}: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500\n        inet ${MY_IP}  netmask 255.255.255.0  broadcast 192.168.1.255\n` +
        `        inet6 fe80::4ecc:6aff:fe2b:197c  prefixlen 64  scopeid 0x20<link>\n        ether ${MAC}  txqueuelen 1000  (Ethernet)\n` +
        "        RX packets 1842931  bytes 2310441983 (2.3 GB)\n        RX errors 0  dropped 0  overruns 0  frame 0\n        TX packets 962118  bytes 118220317 (118.2 MB)\n        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0\n\n" +
        "lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536\n        inet 127.0.0.1  netmask 255.0.0.0\n        inet6 ::1  prefixlen 128  scopeid 0x10<host>\n        loop  txqueuelen 1000  (Local Loopback)\n");
    });
  }

  /* ------------------------------------------------------------------ */
  /* Administration and shell commands                                   */
  /* ------------------------------------------------------------------ */

  function needRoot(ctx, message) {
    if (isRoot()) return true;
    ctx.err(message);
    ctx.status = 1;
    return false;
  }

  function systemctl(args, ctx, label = "systemctl") {
    const action = args.find((arg) => !arg.startsWith("-"));
    const unit = args.filter((arg) => !arg.startsWith("-"))[1];
    if (!action) { ctx.err(`Usage: ${label} [action] [unit]\n`); ctx.status = 1; return; }
    if (action === "list-units" || action === "list-unit-files") {
      ctx.out("UNIT                 LOAD   ACTIVE SUB     DESCRIPTION\n");
      for (const s of services) ctx.out(`${`${s.name}.service`.padEnd(20)} loaded ${s.active ? "active " : "inactive"} ${s.active ? "running" : "dead   "} ${s.description}\n`);
      ctx.out(`\n${services.length} loaded units listed.\n`);
      return;
    }
    const service = services.find((s) => s.name === (unit || "").replace(/\.service$/, ""));
    if (!unit) { ctx.err("Too few arguments.\n"); ctx.status = 1; return; }
    if (!service) { ctx.err(`Unit ${unit}.service could not be found.\n`); ctx.status = 4; return; }
    if (action === "status") {
      ctx.out(`${service.active ? "●" : "○"} ${service.name}.service - ${service.description}\n     Loaded: loaded (/lib/systemd/system/${service.name}.service; enabled; vendor preset: enabled)\n` +
        `     Active: ${service.active ? "active (running)" : "inactive (dead)"} since Fri 2026-10-09 04:42:20 UTC; 3 days ago\n   Main PID: ${service.name === "ghostd" ? 666 : 700 + service.name.length} (${service.name})\n`);
      if (!service.active) ctx.status = 3;
    } else if (action === "is-active") {
      ctx.out(`${service.active ? "active" : "inactive"}\n`);
      if (!service.active) ctx.status = 3;
    } else if (["start", "stop", "restart", "enable", "disable", "reload"].includes(action)) {
      if (!needRoot(ctx, `Failed to ${action} ${service.name}.service: Interactive authentication required.\nSee system logs and 'systemctl status ${service.name}.service' for details.\n`)) return;
      if (service.name === "ghostd" && (action === "stop" || action === "disable")) {
        ctx.err(`Failed to ${action} ghostd.service: Operation not permitted\n`);
        ctx.status = 1;
        return;
      }
      if (action === "start") service.active = true;
      if (action === "stop") service.active = false;
    } else { ctx.err(`Unknown command verb ${action}.\n`); ctx.status = 1; }
  }

  function registerAdminCommands() {
    cmd("sudo", [], "Run a command as another user (root).", "sudo [-i|-s] command", (args, ctx) => {
      if (state.user === "root") { /* already root */ }
      if (!args.length) { ctx.err("usage: sudo [-i] [-s] command\n"); ctx.status = 1; return; }
      if (args[0] === "-i" || args[0] === "-s") {
        state.shellStack.push({ user: state.user, cwd: state.cwd });
        state.user = "root";
        state.cwd = "/root";
        return;
      }
      const rest = args.filter((arg, index) => !(index === 0 && /^-[A-Za-z]$/.test(arg)));
      if (!rest.length) { ctx.err("usage: sudo [-i] [-s] command\n"); ctx.status = 1; return; }
      const previous = state.sudo;
      state.sudo = true;
      try {
        const alias = state.aliases.get(rest[0]);
        invoke(alias ? [...alias.split(" "), ...rest.slice(1)] : rest, ctx);
      } finally {
        state.sudo = previous;
      }
    });

    cmd("su", [], "Switch user.", "su [-] [user]", (args, ctx) => {
      const target = args.find((arg) => !arg.startsWith("-")) || "root";
      if (target === state.user) return;
      if (target !== "root" && target !== "user") { ctx.err(`su: user ${target} does not exist or the user entry does not contain all the required fields\n`); ctx.status = 1; return; }
      state.shellStack.push({ user: state.user, cwd: state.cwd });
      state.user = target;
      state.cwd = target === "root" ? "/root" : "/home/user";
    });

    cmd("systemctl", [], "Control the systemd system manager.", "systemctl status|start|stop|restart <unit>", (args, ctx) => systemctl(args, ctx));

    cmd("service", [], "Run a System V init script.", "service <name> status|start|stop|restart", (args, ctx) => {
      if (args.length < 2) { ctx.err("Usage: service < option > | --status-all | [ service_name [ command | --full-restart ] ]\n"); ctx.status = 1; return; }
      systemctl([args[1], args[0]], ctx, "service");
    });

    const apt = (args, ctx) => {
      const action = args.find((arg) => !arg.startsWith("-"));
      const packages = args.filter((arg) => !arg.startsWith("-")).slice(1);
      if (!action) { ctx.out("apt 2.4.11 (amd64)\nUsage: apt [options] command\n"); return; }
      if (action === "list") { ctx.out("Listing... Done\nbash/jammy-updates,now 5.1-6ubuntu1.1 amd64 [installed]\ncoreutils/jammy,now 8.32-4.1ubuntu1.2 amd64 [installed]\n"); return; }
      if (["update", "upgrade", "install", "remove", "autoremove", "full-upgrade"].includes(action)) {
        if (!isRoot()) {
          ctx.err(action === "update"
            ? "Reading package lists... Done\nE: Could not open lock file /var/lib/apt/lists/lock - open (13: Permission denied)\nE: Unable to lock directory /var/lib/apt/lists/\n"
            : "E: Could not open lock file /var/lib/dpkg/lock-frontend - open (13: Permission denied)\nE: Unable to acquire the dpkg frontend lock (/var/lib/dpkg/lock-frontend), are you root?\n");
          ctx.status = 100;
          return;
        }
        if (action === "update") ctx.out("Hit:1 http://archive.ubuntu.com/ubuntu jammy InRelease\nGet:2 http://security.ubuntu.com/ubuntu jammy-security InRelease [110 kB]\nFetched 110 kB in 1s (118 kB/s)\nReading package lists... Done\nAll packages are up to date.\n");
        else if (action === "install" || action === "remove") {
          if (!packages.length) { ctx.err("E: No packages specified\n"); ctx.status = 100; return; }
          ctx.out("Reading package lists... Done\nBuilding dependency tree... Done\n");
          for (const pkg of packages) ctx.out(`${action === "install" ? "Setting up" : "Removing"} ${pkg} (simulated) ...\n`);
        } else ctx.out("Reading package lists... Done\nBuilding dependency tree... Done\n0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.\n");
        return;
      }
      ctx.err(`E: Invalid operation ${action}\n`);
      ctx.status = 100;
    };
    cmd("apt", [], "Package manager (simulated).", "apt update|upgrade|install|remove|list", apt);
    cmd("apt-get", [], "Package manager (simulated).", "apt-get update|upgrade|install|remove", apt);

    const power = (verb) => (args, ctx) => {
      if (!needRoot(ctx, `Failed to ${verb} system via logind: Interactive authentication required.\n`)) return;
      ctx.out(`The system ${verb} was requested, but this is a simulation: the computer remains running.\n`);
    };
    cmd("shutdown", ["poweroff", "halt"], "Power off the system (simulated).", "shutdown [-h now]", power("shutdown"));
    cmd("reboot", [], "Reboot the system (simulated).", "reboot", power("reboot"));

    cmd("crontab", [], "Maintain crontab files (simulated).", "crontab -l", (args, ctx) => {
      if (args.includes("-l")) {
        if (isRoot()) ctx.out("# m h  dom mon dow   command\n*/5 * * * * /tmp/.x11-cache/ghostd --sync\n");
        else { ctx.err(`no crontab for ${effectiveUser()}\n`); ctx.status = 1; }
      } else ctx.err("crontab: the editor is not available in this simulation\n");
    });

    cmd("journalctl", [], "Query the systemd journal (simulated).", "journalctl [-n N]", (args, ctx) => {
      const { values } = splitArgs(args, "n");
      const lines = [
        `Oct 12 03:14:02 ${HOST} systemd[1]: Started Session 14 of user user.`,
        `Oct 12 03:14:05 ${HOST} ghostd[666]: connection established with ${REMOTE_IP}`,
        `Oct 12 03:14:09 ${HOST} ghostd[666]: indexing /home/user ... done`,
        `Oct 12 03:14:15 ${HOST} ghostd[666]: copying /home/user/Documents ... done`,
        `Oct 12 11:48:31 ${HOST} systemd[1]: Started Session 15 of user user.`
      ];
      const count = values.n ? Number.parseInt(values.n, 10) : lines.length;
      ctx.out(`-- Journal begins at Fri 2026-10-09 04:41:55 UTC. --\n${lines.slice(-count).join("\n")}\n`);
    });

    cmd("ufw", [], "Uncomplicated firewall (simulated).", "ufw status", (args, ctx) => {
      if (!needRoot(ctx, "ERROR: You need to be root to run this script\n")) return;
      ctx.out("Status: active\n\nTo                         Action      From\n--                         ------      ----\n22/tcp                     ALLOW       Anywhere\n");
    });

    cmd("passwd", [], "Change user password (simulated).", "passwd", (args, ctx) => {
      ctx.out(`Changing password for ${effectiveUser()}.\n(simulated: no password was changed)\n`);
    });

    cmd("man", [], "Display the manual for a command.", "man command", (args, ctx) => {
      if (!args.length) { ctx.err("What manual page do you want?\nFor example, try 'man man'.\n"); ctx.status = 1; return; }
      const entry = registry.get(args[0]);
      if (!entry) { ctx.err(`No manual entry for ${args[0]}\n`); ctx.status = 16; return; }
      ctx.out(`${entry.name.toUpperCase()}(1)\n\nNAME\n       ${entry.name} - ${entry.description}\n\nSYNOPSIS\n       ${entry.usage}\n\n`);
    });

    cmd("help", [], "List available commands or describe one.", "help [command]", (args, ctx) => {
      if (args[0]) {
        const entry = registry.get(args[0]);
        if (!entry) { ctx.err(`bash: help: no help topics match \`${args[0]}'.\n`); ctx.status = 1; return; }
        ctx.out(`\nName: ${entry.name}\nDescription: ${entry.description}\nUsage: ${entry.usage}\nAliases: ${entry.aliases.length ? entry.aliases.join(", ") : "None"}\n\n`);
        return;
      }
      const entries = [...new Set(registry.values())];
      const width = Math.max(...entries.map((e) => e.name.length));
      ctx.out(`\nCommands available in this terminal:\n\n${entries.map((e) => `  ${e.name.padEnd(width)}  ${e.description}`).join("\n")}\n\n`);
    });

    cmd("clear", [], "Clear the terminal screen.", "clear", () => clearTerminal());

    cmd("alias", [], "Define or display aliases.", "alias [name='value']", (args, ctx) => {
      if (!args.length) { for (const [name, value] of state.aliases) ctx.out(`alias ${name}='${value}'\n`); return; }
      for (const arg of args) {
        const index = arg.indexOf("=");
        if (index > 0) state.aliases.set(arg.slice(0, index), arg.slice(index + 1));
        else if (state.aliases.has(arg)) ctx.out(`alias ${arg}='${state.aliases.get(arg)}'\n`);
        else { ctx.err(`bash: alias: ${arg}: not found\n`); ctx.status = 1; }
      }
    });

    cmd("exit", ["logout"], "Exit the shell.", "exit", (args, ctx) => {
      const previous = state.shellStack.pop();
      if (previous) {
        state.user = previous.user;
        state.cwd = previous.cwd;
        ctx.out("exit\n");
        return;
      }
      ctx.out("logout\nSession closed. Refresh the page or use Restart to begin again.\n");
      closeSession();
    });

    cmd("switchos", ["os"], "Return to the OS menu or switch directly.", "switchos [windows|linux]", (args, ctx) => {
      requestOSSwitch(args[0] || "", ctx);
    });

    cmd("title", [], "Set the terminal window title.", "title [text]", (args) => setWindowTitle(args.length ? args.join(" ") : null));
  }

  /* ------------------------------------------------------------------ */
  /* Fake "ls -R /" scan                                                 */
  /* ------------------------------------------------------------------ */

  const scanDirs = ["/etc", "/etc/ssh", "/var/log", "/var/lib/dpkg", "/usr/lib/x86_64-linux-gnu", "/usr/share/doc", "/home/user/Documents",
    "/home/user/.ssh", "/home/user/Pictures", "/home/user/Downloads", "/var/backups", "/opt", "/boot/grub", "/usr/bin", "/proc/sys/kernel"];
  const scanNames = ["passwd", "shadow", "id_rsa", "known_hosts", "syslog", "auth.log", "libc.so.6", "bash_history", "budget_2026.csv", "notes.txt",
    "vacation_001.jpg", "backup_2026.zip", "sshd_config", "fstab", "grub.cfg", "vmlinuz", "initrd.img", "status", "kern.log", "todo.txt",
    "cache.db", "config.json", "ghostd", "cookies.sqlite", "wallet.dat", "photos.tar.gz", "resolv.conf", "hosts"];
  const scanAlerts = [
    "[!] reading /etc/shadow ... OK",
    "[!] copying /home/user/Documents ... 100%",
    `[!] uploading archive to ${REMOTE_IP}:4444 ...`,
    "[!] webcam /dev/video0 opened",
    "[!] keylogger attached to tty7",
    "[!] browser passwords exported (firefox)",
    "[!] clearing /var/log/auth.log ... done"
  ];

  function scanChunk() {
    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    let text = "";
    for (let i = 0; i < 20; i++) {
      if (i % 7 === 0 && Math.random() > 0.35) text += `\n${pick(scanDirs)}:\n`;
      if (Math.random() < 0.09) text += `${pick(scanAlerts)}\n`;
      const count = 3 + Math.floor(Math.random() * 4);
      text += `${Array.from({ length: count }, () => pick(scanNames)).join("  ")}\n`;
    }
    return text;
  }

  registerFileCommands();
  registerSystemCommands();
  registerNetworkCommands();
  registerAdminCommands();
  reset();

  return {
    reset,
    prompt,
    banner,
    run,
    scanChunk,
    state,
    commandNames: () => [...new Set(registry.values())].map((entry) => entry.name)
  };
})();
