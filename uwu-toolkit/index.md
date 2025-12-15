---
layout: default
title: UwU Toolkit Wiki
permalink: /uwu-toolkit/
---

# UwU Toolkit Wiki

<p align="center">
<img src="/assets/images/uwu-banner.png" alt="UwU Toolkit" width="600">
</p>

**UwU Toolkit** is a modular penetration testing framework inspired by Metasploit, designed for modern offensive security workflows. Built to run seamlessly inside Exegol containers with a cyberpunk neon aesthetic.

---

## Quick Navigation

| Section | Description |
|---------|-------------|
| [Installation](installation) | Setup and configuration guide |
| [Commands Reference](commands) | Complete command documentation |
| [Modules Guide](modules) | Using and creating modules |
| [Integrations](integrations) | Claude AI, Sliver, Penelope, Ligolo |
| [Quick Reference](quick-reference) | Cheat sheet for common tasks |
| [Search](search) | Search the wiki |

---

## Features

### Core Capabilities

- **Metasploit-like Interface** - Familiar `use`, `set`, `run` workflow
- **Persistent Variables** - Global variables persist across sessions
- **Variable History** - Recall previously used values with tab completion
- **Tab Completion** - Full readline support for commands, modules, and variables
- **Resource Files** - Automate command sequences with `.rc` files

### Module Categories

| Type | Description | Example Modules |
|------|-------------|-----------------|
| **Auxiliary** | Scanning, enumeration, credential attacks | `kerberoast`, `asreproast`, `smb_enum` |
| **Enumeration** | Host and service discovery | `autoenum`, `nmap_scan`, `dns_enum` |
| **Post** | Post-exploitation tools | `linpeas_enum`, `pspy_monitor` |
| **Exploits** | Exploitation modules | Custom exploit templates |
| **Payloads** | Payload generators | `reverse_shells` |

### Integrations

- **Exegol Support** - Seamlessly runs tools inside Exegol containers
- **Claude AI** - Interactive AI assistant for code analysis and security questions
- **Sliver C2** - Integrated Command & Control client management
- **Penelope** - Advanced shell handler with auto-upgrade and session management
- **Ligolo-ng** - Network tunneling with TUN interface and route management
- **Shell Management** - Unified shell session handling across all tools

---

## Quick Start

```bash
# Interactive mode
python3 uwu

# Execute commands directly
python3 uwu -x "use auxiliary/ad/kerberoast; set RHOSTS 10.10.10.1; run"

# Run resource file
python3 uwu -r script.rc

# Quiet mode (no banner)
python3 uwu -q
```

### Basic Workflow

```
uwu > search kerberos
uwu > use auxiliary/ad/kerberoast
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
├── uwu.py              # Main entry point
├── core/               # Framework core
│   ├── console.py      # Interactive console
│   ├── config.py       # Configuration management
│   ├── module_base.py  # Base module class
│   ├── module_loader.py# Module discovery
│   ├── colors.py       # Cyberpunk theme
│   ├── claude.py       # Claude AI integration
│   ├── sliver.py       # Sliver C2 integration
│   └── shells.py       # Shell management
├── modules/            # Module collection
│   ├── auxiliary/      # Auxiliary modules
│   ├── enumeration/    # Enumeration modules
│   ├── exploits/       # Exploit modules
│   ├── post/           # Post-exploitation
│   └── payloads/       # Payload generators
└── ~/.uwu-toolkit/     # User data
    ├── config.json     # Framework config
    ├── globals.json    # Persistent globals
    ├── var_history.json# Variable history
    └── loot/           # Collected loot
```

---

## Configuration

Configuration files are stored in `~/.uwu-toolkit/`:

| File | Purpose |
|------|---------|
| `config.json` | Framework settings |
| `globals.json` | Persistent global variables |
| `var_history.json` | Variable history for recall |
| `command_history` | Readline command history |
| `loot/` | Collected loot and output |

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
