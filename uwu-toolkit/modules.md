---
layout: wiki
title: Modules Guide - UwU Toolkit
permalink: /uwu-toolkit/modules/
---

# Modules Guide

Complete guide to using and creating UwU Toolkit modules.

---

## Table of Contents

- [Module Types](#module-types)
- [Using Modules](#using-modules)
- [Available Modules](#available-modules)
- [Creating Modules](#creating-modules)
- [Module API Reference](#module-api-reference)
- [Best Practices](#best-practices)

---

## Module Types

| Type | Directory | Path Prefix | Description |
|------|-----------|-------------|-------------|
| **Impacket** | `modules/impacket/` | `impacket/` | Impacket tool wrappers (40+ tools) |
| **BloodyAD** | `modules/bloodyad/` | `bloodyad/` | BloodyAD operation wrappers (25+ operations) |
| **AD** | `modules/ad/` | `ad/` | Custom AD attack and enumeration modules |
| **Auxiliary** | `modules/auxiliary/` | `auxiliary/` | Scanning, enumeration, credential attacks |
| **Enumeration** | `modules/enumeration/` | `enumeration/` | Host and service discovery |
| **Exploits** | `modules/exploits/` | `exploits/` | Exploitation modules |
| **Post** | `modules/post/` | `post/` | Post-exploitation tools |
| **Payloads** | `modules/payloads/` | `payloads/` | Payload generators |

### Platforms

Modules can target specific platforms:

| Platform | Description |
|----------|-------------|
| `WINDOWS` | Windows systems |
| `LINUX` | Linux systems |
| `MACOS` | macOS systems |
| `MULTI` | Cross-platform |
| `WEB` | Web applications |
| `NETWORK` | Network devices/services |

---

## Using Modules

### Basic Workflow

```bash
# 1. Search for modules
uwu > search kerberos

# 2. Select a module
uwu > use ad/kerberoast

# 3. View options
uwu kerberoast > options

# 4. Set required options
uwu kerberoast > set RHOSTS 10.10.10.100
uwu kerberoast > set DOMAIN corp.local
uwu kerberoast > set USER admin
uwu kerberoast > set PASS Password123

# 5. Run the module
uwu kerberoast > run

# 6. Return to base
uwu kerberoast > back
```

### Module Information

```bash
# Detailed module info
uwu kerberoast > info

       Name: kerberoast
     Module: ad/kerberoast
   Platform: windows
     Author: UwU Toolkit
    Version: 1.0.0

Description:
  Kerberoast attack - request TGS tickets for cracking

References:
  - https://attack.mitre.org/techniques/T1558/003/
  - https://book.hacktricks.xyz/...

Tags: ad, kerberos, kerberoast, spn, credential, attack
```

### Checking Prerequisites

```bash
uwu kerberoast > check
[*] Running check...
[+] Target appears to be vulnerable
```

---

## Available Modules

UwU Toolkit has three categories of modules:

| Category | Count | Documentation |
|----------|-------|---------------|
| **Impacket Wrappers** | 40+ | [Integrations — Impacket](/uwu-toolkit/integrations/#impacket) |
| **BloodyAD Wrappers** | 25+ | [Integrations — BloodyAD](/uwu-toolkit/integrations/#bloodyad) |
| **Custom Modules** | 70+ | [Custom Tooling](/uwu-toolkit/custom-tooling/) |

### Quick Overview

**Impacket** (`impacket/<tool>`) — Every Impacket tool auto-wrapped as a module. Remote exec, credential dumping, Kerberos, AD abuse, SMB, relay. Set globals once, switch between 40+ modules.

**BloodyAD** (`bloodyad/<operation>`) — Every BloodyAD operation auto-wrapped. ACL abuse, group management, password resets, shadow credentials, RBCD, DNS.

**Custom Modules** — Purpose-built attack modules across multiple categories:

| Type | Path Prefix | Examples |
|------|-------------|---------|
| AD Attacks | `ad/` | kerberoast, adcs_auto, password_spray, delegation_exploit |
| Auxiliary | `auxiliary/` | smb_shares, ntlm_coerce, hashcrack, git_secrets |
| Enumeration | `enumeration/` | autoenum, portscan_fast, dns_enum, web_fuzz |
| Post-Exploitation | `post/` | sebackup_dump, seimpersonate, linpeas_enum, pspy_monitor |
| Payloads | `payloads/` | reverse_shells, aspx_shell, donut |
| Exploits | `exploits/` | samba_usermap_script, pdf24_privesc |

Use `search <term>` to find modules or `show modules` to list all.

---

## Creating Modules

### Module Template

```python
"""
Module Name - Brief Description
Detailed description of what this module does
"""

from core.module_base import ModuleBase, ModuleType, Platform, find_tool


class MyModule(ModuleBase):
    """
    Docstring describing the module
    """

    def __init__(self):
        super().__init__()

        # Module metadata
        self.name = "my_module"
        self.description = "Brief description of the module"
        self.author = "Your Name"
        self.version = "1.0.0"
        self.module_type = ModuleType.AUXILIARY
        self.platform = Platform.MULTI
        self.tags = ["tag1", "tag2", "tag3"]
        self.references = [
            "https://example.com/reference1",
            "https://example.com/reference2"
        ]

        # Register options
        self.register_option("RHOSTS", "Target host(s)", required=True)
        self.register_option("RPORT", "Target port", default=80)
        self.register_option("TIMEOUT", "Timeout in seconds", default=30)
        self.register_option("OUTPUT", "Output file", default="output.txt")

    def run(self) -> bool:
        """
        Main execution method
        Returns True on success, False on failure
        """
        # Get options
        target = self.get_option("RHOSTS")
        port = self.get_option("RPORT")
        timeout = self.get_option("TIMEOUT")

        self.print_status(f"Targeting {target}:{port}")

        # Your module logic here
        try:
            # Do something
            result = self._do_scan(target, port)

            if result:
                self.print_good(f"Success! Found: {result}")
                return True
            else:
                self.print_warning("No results found")
                return False

        except Exception as e:
            self.print_error(f"Error: {e}")
            return False

    def check(self) -> bool:
        """
        Optional: Check if prerequisites are met
        Returns True if ready, False otherwise
        """
        # Check if required tool exists
        if not find_tool("nmap"):
            self.print_error("nmap not found")
            return False
        return True

    def cleanup(self) -> None:
        """
        Optional: Cleanup after execution
        """
        pass

    def _do_scan(self, target: str, port: int) -> str:
        """
        Private helper method
        """
        ret, stdout, stderr = self.run_command(
            ["nmap", "-p", str(port), target],
            timeout=30
        )
        return stdout
```

### File Location

Save your module in the appropriate directory:

```
modules/
├── impacket/            # Impacket tool wrappers (auto-registered)
│   └── _impacket_base.py
├── bloodyad/            # BloodyAD operation wrappers (auto-registered)
│   └── _bloodyad_base.py
├── ad/                  # Custom AD attack modules
│   ├── kerberoast.py
│   ├── asreproast.py
│   └── ...
├── auxiliary/
│   ├── smb/             # SMB modules
│   ├── ssh/             # SSH modules
│   ├── web/             # Web modules
│   ├── rdp/             # RDP modules
│   ├── cracking/        # Hash cracking modules
│   ├── git/             # Git modules
│   └── aws/             # AWS modules
├── enumeration/         # Host/service discovery
├── exploits/
│   ├── cicd/
│   └── windows/local/
├── post/
│   ├── linux/
│   ├── windows/
│   │   ├── gather/
│   │   └── escalate/
│   └── pivot/
└── payloads/
```

Module path in UwU Toolkit maps from filesystem path by stripping `modules/` and `.py`:
- `modules/ad/kerberoast.py` --> `ad/kerberoast`
- `modules/auxiliary/smb/smb_shares.py` --> `auxiliary/smb/smb_shares`
- `modules/post/linux/linpeas_enum.py` --> `post/linux/linpeas_enum`
- `modules/exploits/windows/local/pdf24_privesc.py` --> `exploits/windows/local/pdf24_privesc`

Impacket and BloodyAD wrappers are auto-registered from their registries — no individual `.py` files needed:
- `impacket/psexec` — from `_impacket_base.py` registry
- `bloodyad/genericall` — from `_bloodyad_base.py` registry

---

## Module API Reference

### Option Registration

```python
# Basic required option
self.register_option("RHOSTS", "Target host(s)", required=True)

# Option with default value
self.register_option("RPORT", "Target port", default=80)

# Option with choices
self.register_option("FORMAT", "Output format",
                     default="json",
                     choices=["json", "xml", "csv"])
```

### Getting Options

```python
# Get option value (returns default if not set)
target = self.get_option("RHOSTS")

# Get with fallback default
port = self.get_option("RPORT", 8080)

# Options are case-insensitive
user = self.get_option("user")  # Same as USER
```

### Output Methods

```python
# Status message [*]
self.print_status("Scanning target...")

# Success message [+] (green)
self.print_good("Found vulnerability!")

# Error message [-] (red)
self.print_error("Connection failed")

# Warning message [!] (orange)
self.print_warning("Service may be unstable")

# Plain line
self.print_line("Custom output text")
self.print_line()  # Empty line
```

### Running Commands

```python
# Run local command
ret, stdout, stderr = self.run_command(
    ["nmap", "-sV", target],
    capture=True,
    timeout=120
)

if ret == 0:
    self.print_good("Scan complete")
    print(stdout)
else:
    self.print_error(f"Scan failed: {stderr}")
```

### Running in Exegol

```python
# Run command in Exegol container
ret, stdout, stderr = self.run_in_exegol(
    "GetUserSPNs.py 'domain/user:pass' -dc-ip 10.10.10.100",
    container="exegol-htb",  # Optional, auto-detects
    timeout=120
)

# Run specific tool with arguments
ret, stdout, stderr = self.exegol_tool(
    "NetExec",
    ["smb", target, "-u", user, "-p", password, "--shares"],
    timeout=60
)
```

### Finding Tools

```python
from core.module_base import find_tool

# Check if tool exists (searches extended PATH)
tool_path = find_tool("GetUserSPNs.py")
if tool_path:
    self.print_status(f"Found tool at: {tool_path}")
else:
    self.print_warning("Tool not found locally, using Exegol")
    ret, stdout, stderr = self.run_in_exegol("GetUserSPNs.py ...")
```

### Accessing Config

```python
# Get global variables
domain = self._config.get("DOMAIN")
user = self._config.get("USER")

# Get from config with default
timeout = self._config.get("TIMEOUT", 30)
```

---

## Best Practices

### 1. Use Meaningful Names

```python
# Good
self.name = "kerberoast"
self.description = "Kerberoast attack - request TGS tickets for cracking"

# Bad
self.name = "module1"
self.description = "Does stuff"
```

### 2. Validate Options

```python
def run(self) -> bool:
    target = self.get_option("RHOSTS")

    # Validate input
    if not target:
        self.print_error("RHOSTS is required")
        return False

    if not self._is_valid_ip(target):
        self.print_error(f"Invalid IP: {target}")
        return False

    # Continue...
```

### 3. Handle Errors Gracefully

```python
def run(self) -> bool:
    try:
        result = self._perform_action()
        self.print_good("Success!")
        return True
    except ConnectionError as e:
        self.print_error(f"Connection failed: {e}")
        return False
    except TimeoutError:
        self.print_warning("Operation timed out")
        return False
    except Exception as e:
        self.print_error(f"Unexpected error: {e}")
        return False
```

### 4. Support Both Local and Exegol

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

    # Process output...
```

### 5. Save Output Appropriately

```python
def run(self) -> bool:
    output_file = self.get_option("OUTPUT")

    # Perform action...
    results = self._scan(target)

    # Save results
    if output_file:
        try:
            with open(output_file, 'w') as f:
                f.write(results)
            self.print_good(f"Results saved to: {output_file}")
        except IOError as e:
            self.print_warning(f"Could not save: {e}")

    return True
```

### 6. Add Useful Tags

```python
# Good - specific, searchable tags
self.tags = ["ad", "kerberos", "credential", "attack", "spn"]

# Bad - too generic
self.tags = ["scan"]
```

### 7. Include References

```python
self.references = [
    "https://attack.mitre.org/techniques/T1558/003/",
    "https://book.hacktricks.xyz/windows-hardening/...",
    "https://github.com/SecureAuthCorp/impacket"
]
```

---
