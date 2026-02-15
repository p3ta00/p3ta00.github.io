---
layout: wiki
title: UwU Toolkit Wiki
permalink: /uwu-toolkit/
---

# UwU Toolkit Wiki

<div style="background: linear-gradient(135deg, #1a1b26 0%, #24283b 100%); border: 2px solid #bb9af7; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
  <div style="font-size: 2.5em; margin-bottom: 10px;">UwU</div>
  <div style="color: #7dcfff; font-size: 1.2em;">Penetration Testing Framework</div>
  <div style="margin-top: 15px;">
    <a href="search" style="display: inline-block; padding: 10px 25px; background: #bb9af7; color: #1a1b26; text-decoration: none; border-radius: 4px; font-weight: bold;">Search Wiki</a>
  </div>
</div>

**UwU Toolkit** is a modular penetration testing framework inspired by Metasploit, designed for modern offensive security workflows. Built to run seamlessly inside Exegol containers with a cyberpunk neon aesthetic.

---

## Quick Navigation

| Section | Description |
|---------|-------------|
| [Installation](installation) | Setup for Exegol and Kali |
| [Commands Reference](commands) | Complete command documentation |
| [Modules Guide](modules) | Using and creating modules |
| [Custom Tooling](custom-tooling) | All custom attack, enum, and post-exploit modules |
| [Integrations](integrations) | Impacket, BloodyAD, Claude AI, Sliver, Penelope, Ligolo |
| [Hashcrack SSH Setup](hashcrack-ssh-setup) | Remote GPU hash cracking via SSH |
| [Quick Reference](quick-reference) | Cheat sheet for common tasks |
| [Search](search) | Search the wiki |

---

## Features

### Core Capabilities

- **Metasploit-like Interface** - Familiar `use`, `set`, `run` workflow
- **Persistent Variables** - Global and permanent variables persist across sessions
- **Variable History** - Recall previously used values with tab completion
- **Tab Completion** - Full readline support for commands, modules, and variables
- **Resource Files** - Automate command sequences with `.rc` files
- **Engagement Database** - SQLite-backed tracking for targets, credentials, sessions, findings, timeline, and attack graphs
- **Target Management** - Register, select, and track hosts with domain/vhost support
- **Credential Management** - Store, import, and use credentials with auto-loading into variables
- **uwu-clear** - Reset any data store (db, globals, permanent, history, events) without losing config

### Module Categories

| Type | Directory | Description |
|------|-----------|-------------|
| **Impacket** | `modules/impacket/` | 40+ Impacket tool wrappers (psexec, secretsdump, etc.) |
| **BloodyAD** | `modules/bloodyad/` | 25+ BloodyAD operation wrappers (ACL abuse, groups, etc.) |
| **AD** | `modules/ad/` | Custom AD attack modules (Kerberoast, ADCS, delegation, spraying) |
| **Auxiliary** | `modules/auxiliary/` | SMB, SSH, RDP, web scanning, hash cracking, AWS, git |
| **Enumeration** | `modules/enumeration/` | Host and service discovery |
| **Post** | `modules/post/` | Post-exploitation for Linux and Windows |
| **Exploits** | `modules/exploits/` | Exploitation modules |
| **Payloads** | `modules/payloads/` | Payload generators (reverse shells, donut, ASPX) |

### Integrations

- **Exegol Support** - Seamlessly runs tools inside Exegol containers
- **Claude AI** - Interactive AI assistant for code analysis and security questions
- **Sliver C2** - Integrated Command & Control client management
- **Penelope** - Advanced shell handler with auto-upgrade and session management
- **Ligolo-ng** - Network tunneling with TUN interface and route management
- **Shell Management** - Unified shell session handling across all tools
- **MCP Server** - Model Context Protocol server for AI agent integration

### Standalone Tools (uwu-*)

Helper scripts usable outside the console:

| Script | Description |
|--------|-------------|
| `uwu-clear` | Reset data stores from shell |
| `uwu-export` | Export credentials as environment variables |
| `uwu-loot` | Add credentials to the CTF database |
| `uwu-list` | List all stored credentials |
| `uwu-pwned` | Mark credentials as compromised |
| `uwu-target` | Mark target credentials |
| `uwu-hacks` | Quick-reference attack commands |
| `uwu-navi` | Launch navi with credentials loaded |
| `uwu-parse` | Parse tool output |

---

## Quick Start

```bash
# Interactive mode
uwu

# Execute commands directly
uwu -x "use ad/kerberoast; set RHOSTS 10.10.10.1; run"

# Run resource file
uwu -r script.rc

# Quiet mode (no banner)
uwu -q
```

### Basic Workflow

```
uwu > search kerberos
uwu > use ad/kerberoast
uwu kerberoast > options
uwu kerberoast > set RHOSTS 10.10.10.100
uwu kerberoast > set DOMAIN corp.local
uwu kerberoast > set USER admin
uwu kerberoast > set PASS Password123
uwu kerberoast > run
```

---

## Architecture

```
uwu-toolkit/
├── uwu                 # Main entry (Python script)
├── uwu.py              # Alternate entry point
├── uwu_dashboard       # tmux dashboard
├── uwu-clear           # Reset data stores
├── uwu-export          # Export creds to env
├── uwu-loot            # Add credentials
├── uwu-list            # List credentials
├── uwu-pwned           # Mark pwned creds
├── uwu-target          # Mark target creds
├── uwu-hacks           # Attack cheatsheets
├── uwu-navi            # Navi integration
├── uwu-parse           # Parse tool output
├── install-exegol.sh   # Exegol installer
├── install-kali.sh     # Kali/Debian installer
├── setup.sh            # Generic setup (legacy)
├── core/               # Framework core
│   ├── console.py      # Interactive console + command dispatch
│   ├── config.py       # Configuration + variable persistence
│   ├── module_base.py  # Base module class + find_tool()
│   ├── module_loader.py# Module discovery + loading
│   ├── colors.py       # Cyberpunk neon theme
│   ├── engagement_db.py# SQLite engagement database
│   ├── creds.py        # Credential manager
│   ├── targets.py      # Target manager
│   ├── wordlists.py    # Wordlist path resolution
│   ├── opsec.py        # OpSec rating system
│   ├── macros.py       # Macro support
│   ├── claude.py       # Claude AI integration
│   ├── sliver.py       # Sliver C2 integration
│   ├── penelope.py     # Penelope integration
│   ├── ligolo.py       # Ligolo-ng integration
│   ├── shells.py       # Shell session management
│   ├── tmux_status.py  # tmux status line
│   └── handlers/       # Command handler modules
│       ├── module_handler.py
│       ├── variable_handler.py
│       ├── server_handler.py
│       ├── shell_handler.py
│       ├── c2_handler.py
│       └── tools_handler.py
├── modules/            # Module collection
│   ├── impacket/       # Impacket tool wrappers (40+ auto-registered)
│   ├── bloodyad/       # BloodyAD operation wrappers (25+ auto-registered)
│   ├── ad/             # Custom AD attack modules
│   ├── auxiliary/      # Auxiliary modules (smb, ssh, web, aws, cracking, git, rdp)
│   ├── enumeration/    # Enumeration modules
│   ├── exploits/       # Exploit modules
│   ├── post/           # Post-exploitation (linux, windows, pivot)
│   └── payloads/       # Payload generators
├── uwu_mcp/           # MCP server for AI agents
└── ~/.uwu-toolkit/     # User data
    ├── config.json     # Framework settings
    ├── globals.json    # Global variables
    ├── permanent.json  # Permanent variables (highest priority)
    ├── var_history.json# Variable history
    ├── command_history # Readline history
    ├── engagement.db   # SQLite engagement database
    ├── dashboard_events.json # Dashboard events
    ├── loot/           # Collected loot
    └── sessions/       # Session data
```

---

## Configuration

Configuration files are stored in `~/.uwu-toolkit/`:

| File | Purpose |
|------|---------|
| `config.json` | Framework settings (never cleared by uwu-clear) |
| `globals.json` | Global variables (persist across sessions) |
| `permanent.json` | Permanent variables (highest priority, persist forever) |
| `var_history.json` | Variable history for recall |
| `command_history` | Readline command history |
| `engagement.db` | SQLite database (targets, credentials, sessions, findings, timeline, attack graph) |
| `dashboard_events.json` | Events for the tmux dashboard |
| `loot/` | Collected loot and output |
| `sessions/` | Session data |

### Important Global Variables

```bash
# Set these once, use everywhere
setg RHOSTS 10.10.10.100       # Target host
setg DOMAIN corp.local          # AD domain
setg USER admin                 # Username
setg PASS Password123           # Password
setg LHOST 10.10.14.50         # Your IP
setg EXEGOL_CONTAINER exegol-htb # Exegol container
setg ANTHROPIC_API_KEY sk-...   # For Claude AI

# Permanent variables (survive uwu-clear globals)
setp WORKING_DIR /workspace
setp LHOST 10.10.14.50
```

---

## Color Theme

UwU Toolkit uses a **Cyberpunk Neon** color palette:

- **Hot Pink** (`#ff10f0`) - Module names, prompts
- **Neon Cyan** (`#00e8ff`) - Commands, highlights
- **Neon Green** (`#00ff9f`) - Success messages
- **Neon Orange** (`#ff7c00`) - Warnings
- **Neon Red** (`#ff2975`) - Errors
- **Purple** (`#b620e0`) - Special highlights

---

## Getting Help

- Use `help` in the console for command reference
- Use `info` after selecting a module for detailed information
- Use `options` to see required and optional parameters
- Use `claude ask "question"` for AI-assisted help

---

## Links

- [GitHub Repository](https://github.com/p3ta00/uwu-toolkit)
- [Installation Guide](installation)
- [Commands Reference](commands)
- [Module Development](modules#creating-modules)
