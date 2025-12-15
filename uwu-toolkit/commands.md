---
layout: default
title: Commands Reference - UwU Toolkit
permalink: /uwu-toolkit/commands/
---

# Commands Reference

Complete reference for all UwU Toolkit console commands.

---

## Table of Contents

- [Core Commands](#core-commands)
- [Module Commands](#module-commands)
- [Variable Commands](#variable-commands)
- [Server Utilities](#server-utilities)
- [Shell Management](#shell-management)
- [Claude AI](#claude-ai)
- [Sliver C2](#sliver-c2)
- [Penelope Shell Handler](#penelope-shell-handler)
- [Ligolo-ng Tunneling](#ligolo-ng-tunneling)
- [Other Commands](#other-commands)

---

## Core Commands

### help, ?

Display help message with all available commands.

```bash
uwu > help
uwu > ?
```

### exit, quit

Exit the console. Stops all background processes.

```bash
uwu > exit
uwu > quit
```

### clear

Clear the terminal screen.

```bash
uwu > clear
```

### banner

Display the UwU Toolkit banner.

```bash
uwu > banner
```

---

## Module Commands

### use

Select a module to work with.

```bash
uwu > use auxiliary/ad/kerberoast
uwu > use enumeration/autoenum
uwu > use post/linux/linpeas_enum
```

**Tab Completion:** Press Tab to autocomplete module paths.

**Partial Matching:** If the query matches only one module, it's selected automatically.

```bash
uwu > use kerberoast    # Works if only one match
```

### back

Deselect the current module and return to base prompt.

```bash
uwu kerberoast > back
uwu >
```

### info

Display detailed information about the current module.

```bash
uwu kerberoast > info

       Name: kerberoast
     Module: auxiliary/kerberoast
   Platform: windows
     Author: UwU Toolkit
    Version: 1.0.0

Description:
  Kerberoast attack - request TGS tickets for cracking

References:
  - https://attack.mitre.org/techniques/T1558/003/

Tags: ad, kerberos, kerberoast, spn, credential, attack
```

### options

Display configurable options for the current module.

```bash
uwu kerberoast > options

Module options:

Name            Current              Required   Description
--------------- -------------------- ---------- ----------------------------------------
RHOSTS                               yes        Domain Controller IP
DOMAIN                               yes        Domain name
USER                                 yes        Domain username
PASS                                 yes        Domain password
TARGET_USER                          no         Specific user to kerberoast (optional)
OUTPUT          kerberoast_hashes... no         Output file for hashes
FORMAT          hashcat              no         Hash format: hashcat, john
```

### run, exploit

Execute the current module.

```bash
uwu kerberoast > run
uwu kerberoast > exploit   # Alias for run
```

**Before Running:**
- All required options must be set
- Use `options` to verify configuration
- Use `check` to test prerequisites

### check

Run the module's check method to verify prerequisites.

```bash
uwu kerberoast > check
[*] Running check...
[+] Target appears to be vulnerable
```

### search

Search for modules by name, description, or tags.

```bash
uwu > search kerberos
uwu > search smb
uwu > search linux privesc
uwu > search ad attack
```

**Output:**
```
  Matching Modules (3 found)
  ==================================================

  AUXILIARY
    auxiliary/ad/kerberoast
      Kerberoast attack - request TGS tickets for cr...
    auxiliary/ad/asreproast
      AS-REP Roasting attack - get hashes for user...
```

### reload

Reload the current module from disk. Useful during development.

```bash
uwu kerberoast > reload
[+] Module reloaded: auxiliary/kerberoast
```

---

## Variable Commands

### set

Set a session variable. Used for current module options.

```bash
uwu kerberoast > set RHOSTS 10.10.10.100
RHOSTS => 10.10.10.100

uwu kerberoast > set DOMAIN corp.local
DOMAIN => corp.local
```

**Interactive Mode:** Run `set VAR` without a value to select from history:

```bash
uwu > set RHOSTS

  History for RHOSTS:
  ----------------------------------------
  [ 1] 10.10.10.100
  [ 2] 10.10.10.50
  [ 3] 192.168.1.1
  [ 0] Enter new value

Select [1]:
```

### setg

Set a global variable. Persists across sessions and modules.

```bash
uwu > setg RHOSTS 10.10.10.100
RHOSTS => 10.10.10.100 (global)

uwu > setg DOMAIN corp.local
uwu > setg USER administrator
uwu > setg PASS Password123!
```

**Tip:** Use `setg` for commonly used values like target IP, domain credentials, and your attack IP.

### unset

Unset a session variable.

```bash
uwu > unset RHOSTS
[+] Unset RHOSTS
```

### unsetg

Unset a global variable.

```bash
uwu > unsetg RHOSTS
[+] Unset global RHOSTS
```

### show

Show various information types.

```bash
uwu > show options    # Module options (when in module)
uwu > show info       # Module info
uwu > show vars       # All current variables
uwu > show globals    # Global variables
uwu > show history    # Variable history summary
uwu > show modules    # All loaded modules
```

### vars

Show all current variables (session + global).

```bash
uwu > vars

  Variable             Value                          Source
  -------------------- ------------------------------ ----------
  DOMAIN               corp.local                     global
  RHOSTS               10.10.10.100                   global
  USER                 administrator                  global
```

### globals

Show all global variables with descriptions.

```bash
uwu > globals

  Global Variables
  ==================================================

  Variable             Value
  -------------------- ----------------------------------------
  DOMAIN               corp.local
                       Active Directory domain name
  RHOSTS               10.10.10.100
                       Target host(s)
```

### history

Show variable history.

```bash
# Show all variables with history
uwu > history

  Variable History
  ==================================================

  RHOSTS               (5 entries) - Recent: 10.10.10.100
  DOMAIN               (3 entries) - Recent: corp.local
  USER                 (4 entries) - Recent: administrator

  Use 'history <var>' for detailed history

# Show specific variable history
uwu > history RHOSTS

  History for RHOSTS
  --------------------------------------------------
  [2024-01-15 14:30:22] 10.10.10.100
  [2024-01-15 10:15:00] 10.10.10.50
  [2024-01-14 16:45:33] 192.168.1.1
```

---

## Server Utilities

### start

Start a server or listener.

```bash
# HTTP server (default port 8000)
uwu > start gosh
uwu > start gosh 9000

# PHP server (default port 8080)
uwu > start php
uwu > start php 8888

# Netcat listener (foreground, with rlwrap)
uwu > start nc 4444
uwu > start listener 4444
```

### stop

Stop a running service.

```bash
uwu > stop http-8000
uwu > stop php-8080
```

### listeners

List all active listeners and servers.

```bash
uwu > listeners

  Active Services
  ========================================

  ID              Status     PID
  --------------- ---------- ----------
  http-8000       running    12345
  php-8080        running    12346
```

---

## Shell Management

Sliver-like shell session management for reverse shells.

### listen

Start a shell listener.

```bash
uwu > listen 4444           # netcat listener
uwu > listen 4444 nc        # explicit netcat
uwu > listen 4444 penelope  # penelope listener
```

### shells, sessions

List active shell sessions.

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

### interact

Interact with a shell session.

```bash
uwu > interact 1
[*] Interacting with shell 1
[*] Press Ctrl+D to background

$ whoami
www-data
$ ^D
[*] Shell backgrounded
```

### kill

Kill a shell session.

```bash
uwu > kill 1
[+] Shell 1 killed
```

---

## Claude AI

AI-powered assistant for security research.

### claude, claude mode

Enter interactive Claude AI mode.

```bash
uwu > claude
uwu > claude mode

[Claude AI Mode]
Type 'exit' or Ctrl+D to return
Type 'help' for commands

claude > How do I enumerate SMB shares?
```

**In Claude Mode:**
- `exit`, `back` - Return to UwU console
- `Ctrl+D` - Background session
- `new` - Start new conversation
- `clear` - Clear conversation
- `help` - Show commands

### claude resume, fg

Resume a backgrounded Claude session.

```bash
uwu > claude resume
uwu > claude fg   # Alias
```

### claude sessions

List all Claude AI sessions.

```bash
uwu > claude sessions

  Claude Sessions
  ==================================================

  * abc123  Main Session
      5 prompts, created 14:30:22
    def456  Code Review
      3 prompts, created 10:15:00
```

### claude analyze

Analyze code for security vulnerabilities.

```bash
uwu > claude analyze ./webapp/
uwu > claude analyze ./script.py --focus "injection"
```

### claude debug

Debug code for errors.

```bash
uwu > claude debug ./script.py
uwu > claude debug ./module.py --error "ImportError: No module named..."
```

### claude ask

Ask Claude a quick question.

```bash
uwu > claude ask "How do I crack Kerberos hashes?"
uwu > claude ask "Explain this code" --context ./script.py
```

### claude status

Check Claude AI availability.

```bash
uwu > claude status
[+] Claude AI is available
[*] Model: claude-sonnet-4-20250514
```

### claude model

View or change the Claude model.

```bash
uwu > claude model
[*] Current model: claude-sonnet-4-20250514

uwu > claude model claude-opus-4-20250514
```

### claude help

Show full Claude command help.

```bash
uwu > claude help
```

---

## Sliver C2

Integrated Sliver Command & Control.

### sliver start

Start the Sliver server in background.

```bash
uwu > sliver start
[*] Starting Sliver server...
[+] Sliver server started
```

### sliver stop

Stop the Sliver server.

```bash
uwu > sliver stop
[*] Stopping Sliver server...
[+] Sliver server stopped
```

### sliver connect

Connect to Sliver server with client.

```bash
uwu > sliver connect           # Use default config
uwu > sliver connect p3ta      # Use specific config
```

**In Sliver Mode:**
- Full Sliver client functionality
- `Ctrl+D` - Background session
- `exit` - Return to UwU

### sliver resume, fg

Resume backgrounded Sliver client.

```bash
uwu > sliver resume
uwu > sliver fg   # Alias
```

### sliver status

Check Sliver server/client status.

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

### sliver configs

List available Sliver client configs.

```bash
uwu > sliver configs

  Sliver Client Configs
  ========================================

    p3ta
      /home/p3ta/.sliver-client/configs/p3ta.cfg
    operator2
      /home/p3ta/.sliver-client/configs/operator2.cfg
```

### sliver help

Show full Sliver command help.

```bash
uwu > sliver help
```

---

## Penelope Shell Handler

Advanced shell handler with auto-upgrade and session management.

### penelope

Start Penelope listener.

```bash
uwu > penelope              # Default port 4444
uwu > penelope 9001         # Specific port
uwu > penelope -i 10.10.14.50 4444  # Specific interface
```

**In Penelope Mode:**
- Full Penelope functionality
- Auto PTY upgrade
- Multi-session handling
- `Ctrl+D` - Background session (listener stays active)
- `quit` - Exit and return to UwU

### penelope resume, fg

Resume backgrounded Penelope session.

```bash
uwu > penelope resume
uwu > penelope fg   # Alias
```

### penelope status

Check Penelope status.

```bash
uwu > penelope status

  Penelope Status
  ========================================

  Status:   Backgrounded (use 'penelope resume')
  Port:     4444
  Sessions: 2
  Binary:   /opt/penelope/penelope.py
```

### penelope help

Show full Penelope command help.

```bash
uwu > penelope help
```

**Note:** Penelope sessions automatically appear in the `shells` command.

---

## Ligolo-ng Tunneling

Network tunneling with TUN interface support.

### ligolo

Start Ligolo-ng proxy.

```bash
uwu > ligolo                # Default port 11601
uwu > ligolo 11601          # Specific port
uwu > ligolo -tun mytun 11601  # Custom TUN interface
```

**TUN Interface:** UwU Toolkit automatically creates the TUN interface if it doesn't exist.

**In Ligolo Mode:**
- Full Ligolo proxy functionality
- Agent management
- Tunnel control
- `Ctrl+D` - Background session (proxy stays active)
- `exit` - Exit and return to UwU

### ligolo resume, fg

Resume backgrounded Ligolo session.

```bash
uwu > ligolo resume
uwu > ligolo fg   # Alias
```

### ligolo agents

List connected Ligolo agents.

```bash
uwu > ligolo agents

  Ligolo-ng Agents
  ============================================================

  ID   Remote IP        Hostname             User         Tunnel
  ---- ---------------- -------------------- ------------ --------
  0    10.10.10.100     DC01                 CORP\admin   active
  1    10.10.10.50      WEB01                www-data     idle
```

### ligolo route

Manage routes through Ligolo tunnel.

```bash
# Add route
uwu > ligolo route add 10.10.10.0/24
[+] Route added: 10.10.10.0/24 via ligolo

# Remove route
uwu > ligolo route del 10.10.10.0/24
[+] Route removed: 10.10.10.0/24
```

### ligolo routes

List active routes through Ligolo interface.

```bash
uwu > ligolo routes

  Ligolo Routes
  ========================================

    10.10.10.0/24 via ligolo
    172.16.0.0/16 via ligolo
```

### ligolo status

Check Ligolo status.

```bash
uwu > ligolo status

  Ligolo-ng Status
  ========================================

  Status:    Backgrounded (use 'ligolo resume')
  Port:      11601
  TUN:       ligolo
  Agents:    2
  Binary:    /usr/local/bin/ligolo-proxy
  Routes:    10.10.10.0/24
```

### ligolo help

Show full Ligolo command help.

```bash
uwu > ligolo help
```

---

## Other Commands

### shell, !

Execute shell commands.

```bash
# Start interactive shell
uwu > shell

# Execute single command
uwu > !whoami
uwu > !nmap -p- 10.10.10.100
```

### export

Export variables for shell use.

```bash
uwu > export

  Export Variables for Shell
  ========================================

  To export variables, run:
  eval $(uwu export --script)

  Or copy these exports:

  export DOMAIN='corp.local'
  export RHOSTS='10.10.10.100'
  export USER='administrator'

# For use in shell
uwu > export --script
export DOMAIN='corp.local'
export RHOSTS='10.10.10.100'
...
```

---

## Command Line Arguments

```bash
# Interactive mode
python3 uwu

# Execute commands (semicolon separated)
python3 uwu -x "use auxiliary/ad/kerberoast; set RHOSTS 10.10.10.1; run"

# Execute resource file
python3 uwu -r script.rc

# Quiet mode (no banner)
python3 uwu -q

# Help
python3 uwu -h
```

### Resource Files

Create `.rc` files for automation:

```bash
# kerberoast.rc
setg DOMAIN CORP.LOCAL
setg RHOSTS 10.10.10.100
use auxiliary/ad/kerberoast
set USER admin
set PASS Password123
run
back
use auxiliary/ad/asreproast
run
```

Execute:
```bash
python3 uwu -r kerberoast.rc
```

---

[Back to Wiki Index](/uwu-toolkit/)
