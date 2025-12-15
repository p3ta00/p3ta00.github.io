---
layout: default
title: Installation - UwU Toolkit
permalink: /uwu-toolkit/installation/
---

# Installation Guide

## Requirements

- **Python 3.8+**
- **Linux/macOS** (Windows via WSL)
- **Exegol** (recommended) or Kali Linux

### Optional Dependencies

| Component | For | Install |
|-----------|-----|---------|
| Anthropic API | Claude AI | `pip install anthropic` |
| Sliver | C2 integration | [Sliver GitHub](https://github.com/BishopFox/sliver) |
| Impacket | AD modules | Pre-installed in Exegol |
| Nmap | Enumeration | Pre-installed in most distros |

---

## Quick Install

### From Source

```bash
# Clone the repository
git clone https://github.com/p3ta00/uwu-toolkit.git
cd uwu-toolkit

# Run setup script (creates ~/.local/bin/uwu symlink)
./setup.sh

# Or run directly
python3 uwu
```

### Setup Script

The `setup.sh` script:
1. Creates `~/.uwu-toolkit/` directory
2. Initializes configuration files
3. Creates symlink to `~/.local/bin/uwu`

After setup, run from anywhere:
```bash
uwu
```

---

## Exegol Integration

UwU Toolkit is designed to work seamlessly with [Exegol](https://github.com/ThePorgs/Exegol) containers.

### Recommended Setup

1. **Install Exegol:**
```bash
pip install exegol
```

2. **Start an Exegol container:**
```bash
exegol start htb full
```

3. **Set the container globally:**
```bash
uwu > setg EXEGOL_CONTAINER exegol-htb
```

### How It Works

When a module needs tools not installed locally (e.g., `GetUserSPNs.py`), it automatically:
1. Detects the Exegol container
2. Runs commands inside the container via `docker exec`
3. Returns output to UwU Toolkit

### Auto-Detection

If `EXEGOL_CONTAINER` is not set, UwU Toolkit will:
1. Search for running containers starting with `exegol-`
2. Use the first match found
3. Prompt if multiple containers are running

---

## Configuration

### First Run

On first run, UwU Toolkit creates:

```
~/.uwu-toolkit/
├── config.json       # Framework settings
├── globals.json      # Persistent variables
├── var_history.json  # Variable history
└── command_history   # Readline history
```

### Essential Global Variables

Set these once and they persist across sessions:

```bash
# Target information
uwu > setg RHOSTS 10.10.10.100
uwu > setg DOMAIN corp.local
uwu > setg USER administrator
uwu > setg PASS Password123!

# Your attack machine
uwu > setg LHOST 10.10.14.50
uwu > setg LPORT 4444

# Exegol container
uwu > setg EXEGOL_CONTAINER exegol-htb

# Claude AI (optional)
uwu > setg ANTHROPIC_API_KEY sk-ant-api03-...
```

### Config File Options

Edit `~/.uwu-toolkit/config.json`:

```json
{
  "modules_path": "/path/to/uwu-toolkit/modules",
  "gosh_default_port": 8000,
  "php_default_port": 8080,
  "nc_use_rlwrap": true
}
```

---

## Claude AI Setup

To enable the Claude AI assistant:

1. **Get an API key:**
   - Visit [console.anthropic.com](https://console.anthropic.com)
   - Create an API key

2. **Set the key:**
```bash
uwu > setg ANTHROPIC_API_KEY sk-ant-api03-your-key-here
```

3. **Verify:**
```bash
uwu > claude status
```

4. **Use:**
```bash
uwu > claude mode              # Interactive mode
uwu > claude ask "question"    # Quick question
uwu > claude analyze ./code    # Analyze code
```

---

## Sliver C2 Setup

### Install Sliver

```bash
# Download latest release
curl https://sliver.sh/install | sudo bash

# Or manually
wget https://github.com/BishopFox/sliver/releases/latest/download/sliver-server_linux
wget https://github.com/BishopFox/sliver/releases/latest/download/sliver-client_linux
chmod +x sliver-*
```

### Import Client Config

```bash
# Generate operator config on server
sliver-server > new-operator --name p3ta --lhost 10.10.14.50

# Import on client
sliver-client import ./p3ta.cfg
```

### Use in UwU Toolkit

```bash
uwu > sliver start     # Start server
uwu > sliver connect   # Connect client
uwu > sliver status    # Check status
```

---

## Troubleshooting

### Module Not Found

```bash
# Reload modules
uwu > reload

# Check module path
uwu > show modules
```

### Exegol Not Detected

```bash
# List running containers
docker ps | grep exegol

# Set manually
uwu > setg EXEGOL_CONTAINER exegol-htb
```

### Tools Not Found

Most tools should be in Exegol. If running locally:

```bash
# Add tool directories to PATH
export PATH=$PATH:~/.local/bin:/opt/tools/bin

# Or let UwU Toolkit use Exegol
uwu > setg EXEGOL_CONTAINER exegol-htb
```

### Permission Denied

```bash
# For nmap SYN scans, etc.
sudo uwu

# Or use Exegol (runs as root inside container)
```

---

## Updating

```bash
cd /path/to/uwu-toolkit
git pull origin main
```

Configurations and history are preserved in `~/.uwu-toolkit/`.

---

## Uninstalling

```bash
# Remove symlink
rm ~/.local/bin/uwu

# Remove config (optional)
rm -rf ~/.uwu-toolkit

# Remove source
rm -rf /path/to/uwu-toolkit
```

---

[Back to Wiki Index](/uwu-toolkit/)
