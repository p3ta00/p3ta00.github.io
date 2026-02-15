---
layout: default
title: Quick Reference - UwU Toolkit
permalink: /uwu-toolkit/quick-reference/
---

# Quick Reference

Cheat sheet for common UwU Toolkit tasks.

---

## Essential Setup

```bash
# Set target
setg RHOSTS 10.10.10.100

# Set credentials
setg DOMAIN corp.local
setg USER administrator
setg PASS Password123

# Set attack machine
setg LHOST 10.10.14.50
setg LPORT 4444

# Set Exegol container
setg EXEGOL_CONTAINER exegol-htb
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
| `setp <VAR> <val>` | Set persistent variable |
| `unset <VAR>` | Unset session variable |
| `unsetg <VAR>` | Unset global variable |
| `unsetp <VAR>` | Unset persistent variable |
| `getp <VAR>` | Get persistent variable |
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
| `potatoes` | Download potato privesc binaries |
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

---

## Common Module Paths

### Active Directory (`ad/`)

```
ad/kerberoast              # Kerberoast attack
ad/asreproast              # AS-REP roasting
ad/bloodhound_collect      # BloodHound data collection
ad/certipy_find            # ADCS enumeration
ad/certipy_exploit         # ADCS exploitation
ad/adcs_auto               # Automated ADCS scan + exploit
ad/netexec                 # NetExec module
ad/ad_enum                 # AD enumeration
ad/kerb_userenum           # Kerberos user enumeration
ad/password_spray          # Password spraying
ad/delegation_exploit      # Delegation attacks
ad/evil_winrm              # Evil-WinRM sessions
ad/targeted_kerberoast     # Targeted kerberoast
ad/rbcd_auto               # Automated RBCD attack
ad/bloodyad_validate       # BloodyAD validation
```

### Auxiliary

```
auxiliary/smb/smb_shares   # SMB share enumeration
auxiliary/smb/smb_read     # Read files from shares
auxiliary/smb/enum4linux   # enum4linux-ng wrapper
auxiliary/smb/ntlm_coerce  # NTLM coercion attacks
auxiliary/cracking/hashcrack  # Hash cracking (local/SSH)
```

### Enumeration

```
enumeration/autoenum       # Full auto enumeration
enumeration/portscan_fast  # Fast TCP port scan
enumeration/dns_enum       # DNS enumeration
enumeration/web_fuzz       # Web directory fuzzing
```

### Post-Exploitation

```
post/linux/linpeas_enum              # LinPEAS
post/linux/pspy_monitor              # Process monitoring
post/windows/sebackup_dump           # SeBackupPrivilege NTDS dump
post/windows/seimpersonate           # SeImpersonatePrivilege abuse
post/pivot/ligolo_pivot              # Ligolo-ng pivoting
```

### Payloads

```
payloads/reverse_shells    # Shell generator
payloads/donut             # Donut shellcode generator
payloads/aspx_shell        # ASPX webshell generator
```

---

## Common Workflows

### AD Attack Chain

```bash
# 1. Kerberoast
use ad/kerberoast
run

# 2. AS-REP Roast
use ad/asreproast
run

# 3. Crack hashes
use auxiliary/cracking/hashcrack
set HASHFILE kerberoast_hashes.txt
set HASHTYPE 13100
run
```

### ADCS Attack

```bash
# 1. Find vulnerable templates
use ad/certipy_find
run

# 2. Exploit
use ad/certipy_exploit
set CA CORP-CA
set TEMPLATE VulnTemplate
set TARGET_USER administrator
run
```

### Penelope + Ligolo

```bash
# Start listener, receive shell
penelope 4444

# Ctrl+D to background, listener stays active
shells

# Start Ligolo, add routes
ligolo
# Ctrl+D to background
ligolo route add 10.10.10.0/24

# Resume either tool
penelope resume
ligolo resume
```

---

## Tips

1. **Use `setg` for recurring values** — set once, use in all modules
2. **Tab complete everything** — modules, commands, variables
3. **Check history** — `set VAR` without value shows previous values
4. **Background sessions** — `Ctrl+D` keeps Penelope/Ligolo/Sliver/Claude alive
5. **Use `clocksync`** — sync clock before any Kerberos attacks
6. **Use `creds`** — store and reuse credentials across modules

---

## Troubleshooting

```bash
reload          # Reload modules
show modules    # List all modules
clocksync       # Fix Kerberos clock skew
setg EXEGOL_CONTAINER exegol-htb  # Fix Exegol detection
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
