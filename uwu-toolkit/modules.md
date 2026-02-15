---
layout: default
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
| **AD** | `modules/ad/` | `ad/` | Active Directory attacks and enumeration |
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

### Active Directory (`ad/`)

Core AD attack and enumeration modules. These live directly under `modules/ad/`, so the module path is `ad/<name>`.

| Module | Path | Description |
|--------|------|-------------|
| **kerberoast** | `ad/kerberoast` | Request TGS tickets for offline cracking |
| **asreproast** | `ad/asreproast` | AS-REP roasting for users without preauth |
| **targeted_kerberoast** | `ad/targeted_kerberoast` | Targeted Kerberoast with SPN manipulation |
| **bloodhound_collect** | `ad/bloodhound_collect` | BloodHound data collection |
| **bloodhound_edges** | `ad/bloodhound_edges` | BloodHound edge analysis |
| **bloodyhound** | `ad/bloodyhound` | BloodyAD + BloodHound combined workflow |
| **bloodyad_validate** | `ad/bloodyad_validate` | BloodyAD ACL validation |
| **certipy_find** | `ad/certipy_find` | AD CS enumeration with Certipy |
| **certipy_exploit** | `ad/certipy_exploit` | AD CS exploitation (ESC1-ESC16) |
| **adcs_auto** | `ad/adcs_auto` | Automated ADCS scan + exploit pipeline |
| **ad_enum** | `ad/ad_enum` | Comprehensive AD enumeration |
| **ad_enumerate_all** | `ad/ad_enumerate_all` | Full-scope AD enumeration |
| **ad_attack_enum** | `ad/ad_attack_enum` | Attack surface enumeration |
| **delegation_exploit** | `ad/delegation_exploit` | Delegation abuse (unconstrained/constrained/RBCD) |
| **rbcd_auto** | `ad/rbcd_auto` | Automated RBCD attack chain |
| **evil_winrm** | `ad/evil_winrm` | Evil-WinRM session management |
| **impacket_validate** | `ad/impacket_validate` | Validate Impacket credential combos |
| **kerb_userenum** | `ad/kerb_userenum` | Kerberos user enumeration |
| **netexec** | `ad/netexec` | NetExec wrapper for AD enumeration |
| **password_spray** | `ad/password_spray` | Password spraying attacks |
| **powerview_autoenum** | `ad/powerview_autoenum` | Automated PowerView enumeration |
| **powerview_lab** | `ad/powerview_lab` | PowerView lab environment setup |
| **powerview_remote** | `ad/powerview_remote` | Remote PowerView execution |
| **powerview_remote_exec** | `ad/powerview_remote_exec` | Remote PowerView with command exec |
| **sid_lookup** | `ad/sid_lookup` | SID-to-name resolution |
| **uac_decoder** | `ad/uac_decoder` | Decode userAccountControl flags |
| **iron_throne_bench** | `ad/iron_throne_bench` | Iron Throne lab benchmark suite |
| **WriteAccountRestrictions** | `ad/WriteAccountRestrictions` | WriteAccountRestrictions ACL abuse |
| **badsuccessor** | `ad/badsuccessor` | BadSuccessor dMSA privilege escalation |

### SMB (`auxiliary/smb/`)

| Module | Path | Description |
|--------|------|-------------|
| **smb_shares** | `auxiliary/smb/smb_shares` | SMB share enumeration and access check |
| **smb_read** | `auxiliary/smb/smb_read` | Read files from SMB shares |
| **enum4linux** | `auxiliary/smb/enum4linux` | enum4linux-ng wrapper |
| **ntlm_coerce** | `auxiliary/smb/ntlm_coerce` | NTLM authentication coercion (PetitPotam, etc.) |

### SSH (`auxiliary/ssh/`)

| Module | Path | Description |
|--------|------|-------------|
| **ssh_enum** | `auxiliary/ssh/ssh_enum` | SSH enumeration and banner grabbing |

### Web (`auxiliary/web/`)

| Module | Path | Description |
|--------|------|-------------|
| **username_harvest** | `auxiliary/web/username_harvest` | Harvest usernames from web apps |
| **web_scanner** | `auxiliary/web/web_scanner` | Web vulnerability scanner |

### RDP (`auxiliary/rdp/`)

| Module | Path | Description |
|--------|------|-------------|
| **rdp_session** | `auxiliary/rdp/rdp_session` | RDP session management |

### Cracking (`auxiliary/cracking/`)

| Module | Path | Description |
|--------|------|-------------|
| **hashcrack** | `auxiliary/cracking/hashcrack` | Hash cracking with hashcat/john |
| **cisco_type5_crack** | `auxiliary/cracking/cisco_type5_crack` | Cisco Type 5 password cracking |

### Git (`auxiliary/git/`)

| Module | Path | Description |
|--------|------|-------------|
| **gitea_api** | `auxiliary/git/gitea_api` | Gitea API enumeration |
| **gitea_commit_secrets** | `auxiliary/git/gitea_commit_secrets` | Extract secrets from Gitea commits |
| **git_secrets** | `auxiliary/git/git_secrets` | Scan git repos for secrets |

### AWS (`auxiliary/aws/`)

| Module | Path | Description |
|--------|------|-------------|
| **s3_enum** | `auxiliary/aws/s3_enum` | S3 bucket enumeration |
| **iam_enum** | `auxiliary/aws/iam_enum` | IAM user/role/policy enumeration |
| **ec2_metadata** | `auxiliary/aws/ec2_metadata` | EC2 metadata service access (SSRF) |
| **lambda_enum** | `auxiliary/aws/lambda_enum` | Lambda function enumeration |
| **cred_catcher** | `auxiliary/aws/cred_catcher` | AWS credential harvesting |
| **sts_whoami** | `auxiliary/aws/sts_whoami` | STS GetCallerIdentity check |

### Enumeration (`enumeration/`)

| Module | Path | Description |
|--------|------|-------------|
| **autoenum** | `enumeration/autoenum` | Automated enumeration pipeline (like AutoRecon) |
| **auto_enumerator** | `enumeration/auto_enumerator` | Configurable auto-enumeration |
| **portscan_fast** | `enumeration/portscan_fast` | Fast TCP port scanning |
| **dns_enum** | `enumeration/dns_enum` | DNS enumeration and zone transfer |
| **web_fuzz** | `enumeration/web_fuzz` | Directory/file fuzzing |
| **ftp_enum** | `enumeration/ftp_enum` | FTP enumeration and anonymous access |
| **nfs_enum** | `enumeration/nfs_enum` | NFS share enumeration |
| **cicd_detect** | `enumeration/cicd_detect` | CI/CD pipeline detection |
| **dirsearch_scan** | `enumeration/dirsearch_scan` | Dirsearch directory brute-forcing |
| **gitea_enum** | `enumeration/gitea_enum` | Gitea instance enumeration |
| **vhost_scan** | `enumeration/vhost_scan` | Virtual host discovery |

### Exploits (`exploits/`)

| Module | Path | Description |
|--------|------|-------------|
| **template** | `exploits/template` | Exploit module template |
| **samba_usermap_script** | `exploits/samba_usermap_script` | Samba usermap_script RCE (CVE-2007-2447) |
| **git_webshell** | `exploits/cicd/git_webshell` | CI/CD git-based webshell deployment |
| **pdf24_privesc** | `exploits/windows/local/pdf24_privesc` | PDF24 local privilege escalation |

### Post-Exploitation (`post/`)

#### Linux

| Module | Path | Description |
|--------|------|-------------|
| **linux_enum** | `post/linux_enum` | Linux system enumeration |
| **linux_privesc** | `post/linux_privesc` | Linux privilege escalation checks |
| **linpeas_enum** | `post/linux/linpeas_enum` | LinPEAS privilege escalation scan |
| **pspy_monitor** | `post/linux/pspy_monitor` | Process monitoring with pspy64 |
| **linux_recon** | `post/linux/linux_recon` | Linux system reconnaissance |
| **privesc_suggest** | `post/linux/privesc_suggest` | Privilege escalation suggester |

#### Windows

| Module | Path | Description |
|--------|------|-------------|
| **lnk_parser** | `post/windows/gather/lnk_parser` | Parse Windows LNK shortcut files |
| **installed_apps** | `post/windows/gather/installed_apps` | Enumerate installed applications |
| **mremoteng_creds** | `post/windows/gather/mremoteng_creds` | Extract mRemoteNG credentials |
| **msi_finder** | `post/windows/gather/msi_finder` | Find exploitable MSI installers |
| **user_enum** | `post/windows/gather/user_enum` | Windows user enumeration |
| **gpo_abuse** | `post/windows/escalate/gpo_abuse` | GPO abuse for privilege escalation |
| **sebackup_dump** | `post/windows/sebackup_dump` | SeBackupPrivilege NTDS extraction |
| **seimpersonate** | `post/windows/seimpersonate` | SeImpersonatePrivilege exploitation |

#### Pivoting

| Module | Path | Description |
|--------|------|-------------|
| **ligolo_pivot** | `post/pivot/ligolo_pivot` | Ligolo-ng tunnel management |

### Payloads (`payloads/`)

| Module | Path | Description |
|--------|------|-------------|
| **reverse_shells** | `payloads/reverse_shells` | Multi-format reverse shell generator |
| **reverse_shell** | `payloads/reverse_shell` | Single reverse shell payload |
| **aspx_shell** | `payloads/aspx_shell` | ASPX web shell generator |
| **donut** | `payloads/donut` | Donut shellcode generator |

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
├── ad/                  # Active Directory modules
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

[Back to Wiki Index](/uwu-toolkit/)
