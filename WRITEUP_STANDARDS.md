# CTF Writeup Standards

This document defines the standard format for CTF writeups on this site.

---

## File Naming Convention

```
{platform}-{box-name}.md
```

**Examples:**
- `hacksmarter-odyssey.md`
- `hacksmarter-northbridge.md`
- `htb-forest.md`

---

## Front Matter (YAML)

```yaml
---
title: "Box Name"
platform: "HackSmarter"           # HackSmarter, HTB, TryHackMe, etc.
category: "Windows"               # Windows, Linux, Web, etc.
difficulty: "Hard"                # Easy, Medium, Hard, Insane
date: 2025-12-15                  # Date completed (YYYY-MM-DD)
os: "Windows Server 2022"         # Specific OS version
tags: ["windows", "active-directory", "kerberos", "etc"]
---
```

**Tag Guidelines:**
- Always lowercase
- Include OS type: `windows`, `linux`, `web`
- Include attack techniques: `ssti`, `sqli`, `rbcd`, `kerberoast`
- Include key tools/protocols: `smb`, `ldap`, `winrm`, `ssh`

---

## Document Structure

### 1. Banner Image (Optional)
```markdown
![Box Name Banner](/assets/images/ctf/{box-name}/banner.png)
```

### 2. Overview Section
```markdown
## Overview

**Platform:** HackSmarter
**Difficulty:** Hard
**Domain:** domain.local (if applicable)

Brief 2-3 sentence description of the engagement type and objective.
```

### 3. Scope Table (Multi-machine)
```markdown
## Scope

| Host | IP Address | Operating System | Role |
|------|------------|------------------|------|
| DC01 | 10.10.10.1 | Windows Server 2022 | Domain Controller |
| WEB01 | 10.10.10.2 | Ubuntu 22.04 | Web Server |
```

**Single Machine Alternative:**
```markdown
**IP:** `10.10.10.1`
**Hostname:** `TARGET01`
```

### 4. Executive Summary (Complex boxes)
```markdown
## Executive Summary

Bullet points of critical vulnerabilities found:

- **Vulnerability 1** - brief impact description
- **Vulnerability 2** - brief impact description

**Risk Rating:** Critical/High/Medium
```

### 5. Attack Path Diagram
```markdown
## Attack Path Overview

Use ASCII art for attack flow:

┌─────────────────────────────────────────────────────────────────┐
│                    Step 1 Description                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Step 2 Description                           │
└─────────────────────────────────────────────────────────────────┘
```

### 6. Phase Sections

Use `# Phase X: Name` for major sections on multi-machine boxes:

```markdown
# Phase 1: Initial Enumeration

## 1.1 Reconnaissance
## 1.2 Service Enumeration
## 1.3 Vulnerability Discovery

# Phase 2: Initial Access

## 2.1 Exploitation
## 2.2 Foothold
```

For single machines, use standard `##` headers:

```markdown
## Enumeration
### Nmap Scan
### SMB Enumeration

## Initial Access
## Privilege Escalation
```

### 7. Command Blocks

**Always include the command AND output:**

```markdown
Running nmap scan:

\`\`\`bash
nmap -sCV 10.10.10.1 -Pn
\`\`\`

\`\`\`
PORT    STATE SERVICE  VERSION
22/tcp  open  ssh      OpenSSH 8.9p1
80/tcp  open  http     nginx 1.18.0
\`\`\`
```

**For NetExec/tool output, show relevant lines:**
```markdown
\`\`\`bash
nxc smb 10.10.10.1 -u user -p 'pass' --shares
\`\`\`

\`\`\`
SMB  10.10.10.1  445  TARGET  [+] DOMAIN\user:pass
SMB  10.10.10.1  445  TARGET  Share       Permissions
SMB  10.10.10.1  445  TARGET  -----       -----------
SMB  10.10.10.1  445  TARGET  ADMIN$
SMB  10.10.10.1  445  TARGET  C$
SMB  10.10.10.1  445  TARGET  Data        READ
\`\`\`
```

### 8. Credential Tables

```markdown
## Credentials Summary

\`\`\`
Phase 1 - Enumeration
────────────────────────────────────────────────────────────────
username1       : password1           → Source/Method
username2       : password2           → Source/Method

Phase 2 - Lateral Movement
────────────────────────────────────────────────────────────────
admin           : [NTLM Hash PTH]     → secretsdump
\`\`\`
```

### 9. Screenshots

Store in `/assets/images/ctf/{box-name}/`:

```markdown
![Description](/assets/images/ctf/box-name/screenshot.png)
```

**When to include screenshots:**
- BloodHound attack paths
- Web application vulnerabilities
- GUI-based discoveries
- Flag captures (redact actual flags)

### 10. Tools Used Section

```markdown
## Tools Used

- **Nmap** - Port scanning and service enumeration
- **NetExec (nxc)** - SMB/LDAP enumeration, credential validation
- **Impacket** - secretsdump.py, getST.py, psexec.py
- **BloodHound** - Active Directory attack path analysis
```

### 11. References Section

```markdown
## References

- [HackTricks - Topic](https://book.hacktricks.xyz/path)
- [Tool Documentation](https://tool-url)
- [Relevant Blog Post](https://blog-url)
```

---

## Escaping Jinja2/Liquid Syntax

**IMPORTANT:** When including template injection payloads (SSTI, etc.), wrap in raw tags:

```markdown
\`\`\`python
{% raw %}{{ payload_here }}{% endraw %}
\`\`\`
```

This prevents Jekyll from processing the `{{ }}` syntax.

---

## Code Block Language Tags

Use appropriate language tags for syntax highlighting:

| Content Type | Tag |
|-------------|-----|
| Bash commands | `bash` |
| PowerShell | `powershell` |
| Python | `python` |
| Command output (no highlighting) | (none) or `text` |
| JSON | `json` |
| YAML | `yaml` |

---

## Redaction Guidelines

**Always redact:**
- Actual flag values: `FLAG{REDACTED}` or `<redacted>`
- Real passwords in production (CTF passwords are fine)
- Personal IP addresses from VPN
- API keys or tokens

**Keep visible:**
- Target IPs (they're lab IPs)
- CTF credentials (needed to reproduce)
- Hash values (for educational purposes)

---

## Example Minimal Writeup

```markdown
---
title: "BoxName"
platform: "HTB"
category: "Linux"
difficulty: "Easy"
date: 2025-12-15
os: "Ubuntu 22.04"
tags: ["linux", "web", "sqli", "sudo"]
---

## Overview

**Platform:** HTB
**Difficulty:** Easy
**IP:** \`10.10.10.1\`

Brief description of the box.

---

## Enumeration

### Nmap Scan

\`\`\`bash
nmap -sCV 10.10.10.1
\`\`\`

[output]

### Web Enumeration

[content]

---

## Initial Access

[exploitation steps]

---

## Privilege Escalation

[privesc steps]

---

## Credentials Summary

\`\`\`
user    : password    → Source
root    : password    → Source
\`\`\`

---

## Tools Used

- **Tool1** - Description
- **Tool2** - Description

---

## References

- [Reference 1](url)
```

---

## Multi-Machine Writeup Structure

For complex engagements with multiple hosts:

1. **Executive Summary** - High-level findings
2. **Scope Table** - All targets
3. **Attack Path Diagram** - Visual flow
4. **Phase 1: Host 1** - Full enumeration and exploitation
5. **Phase 2: Host 2** - Lateral movement and exploitation
6. **Phase N: Final Target** - Domain compromise
7. **Credentials Summary** - All creds organized by phase
8. **Tools Used**
9. **References**

---

## Quality Checklist

Before publishing:

- [ ] Front matter complete and accurate
- [ ] All commands have corresponding output
- [ ] Screenshots are properly linked
- [ ] Credentials table is complete
- [ ] Jinja2/Liquid syntax is escaped with raw tags
- [ ] No real personal information exposed
- [ ] Tools and references sections included
- [ ] Spell check completed

---

## UwU Toolkit Color Theme & Syntax Highlighting

The site uses a **Cyberpunk Neon color palette** matching UwU Toolkit. Syntax highlighting is applied both by Rouge (for programming languages) and custom JavaScript (for security tool output).

### UwU Neon Color Palette

| Element | Color | Hex Code |
|---------|-------|----------|
| Hot Pink | Neon Pink | `#ff10f0` |
| Magenta | Neon Magenta | `#ff006e` |
| Red | Neon Red | `#ff2975` |
| Orange | Neon Orange | `#ff7c00` |
| Yellow | Electric Yellow | `#ffea00` |
| Green | Toxic Neon Green | `#00ff9f` |
| Cyan | Electric Cyan | `#00e8ff` |
| Blue | Neon Blue | `#00a2ff` |
| Purple | Neon Purple | `#b620e0` |
| Foreground | Soft Lavender | `#e6e6fa` |
| Background | Deep Purple-Black | `#1a1b26` |

### Auto-Highlighted Elements (JavaScript)

The following patterns are automatically highlighted in code blocks:

**Status Indicators:**
- `[+]` → Green (success)
- `[*]` → Cyan (info)
- `[-]` → Red (error)
- `[!]` → Orange (warning)

**Network:**
- IP addresses (e.g., `10.10.10.1`) → Blue
- Domain names (`.local`, `.htb`, `.smarter`) → Cyan
- Port numbers (e.g., `445/tcp`) → Yellow port, muted protocol
- Port states: `open` → Green, `closed` → Red, `filtered` → Orange

**Services:**
- Service names (`smb`, `ldap`, `kerberos`, `http`, `ssh`, etc.) → Purple

**Windows/AD:**
- Admin keywords (`Administrator`, `SYSTEM`, `NT AUTHORITY`) → Orange bold
- Dangerous ACLs (`GenericAll`, `WriteDACL`, `DCSync`, `SeImpersonatePrivilege`) → Red with glow
- Hashes (32 hex chars) → Purple

**Success:**
- `Pwn3d!`, `PWNED`, `SUCCESS` → Pulsing green
- `Module completed successfully` → Green

### Code Block Best Practices for UwU Highlighting

1. **Keep code blocks simple** - Don't over-format, let the JS add colors
2. **Include full output** - More text = more highlighting opportunities
3. **Use UwU Toolkit status indicators** - `[+]`, `[*]`, `[-]`, `[!]`

**Example - Nmap output will auto-highlight:**
```
[*] Command: nmap -sC -sV 10.10.10.1

PORT    STATE SERVICE
445/tcp open  microsoft-ds
389/tcp open  ldap
88/tcp  open  kerberos

[+] Module completed successfully
```

This will show:
- `[*]` in cyan
- `10.10.10.1` in blue
- Port numbers in yellow
- `open` in green
- Service names in purple
- `[+]` and success message in green

### Rouge Syntax Highlighting (Programming Languages)

For actual code, use language tags:

| Language | Tags |
|----------|------|
| Bash/Shell | `bash`, `shell`, `sh` |
| Python | `python`, `py` |
| PowerShell | `powershell`, `ps1` |
| SQL | `sql` |
| JSON | `json` |
| YAML | `yaml` |

Rouge applies these colors for code:
- **Keywords** → Purple
- **Strings** → Green
- **Numbers** → Orange
- **Functions** → Blue
- **Comments** → Muted lavender
- **Operators** → Cyan

### Image Centering

To center images in writeups, use HTML:

```html
<div style="text-align: center;">
  <img src="/assets/images/ctf/boxname/image.png" alt="Description" style="max-width: 100%;" />
</div>
```

### Highlighting UwU Toolkit Usage

When showcasing UwU Toolkit in writeups:

1. **Show the command with module name:**
```
uwu> use auxiliary/ad/bloodhound_collect
uwu(bloodhound_collect)> set RHOSTS 10.10.10.1
uwu(bloodhound_collect)> run
```

2. **Include the status output:**
```
[*] Collector: bloodhound-python
[*] Target DC: 10.10.10.1
[+] Found 7 users
[+] Found 53 groups
[+] BloodHound collection completed!
```

3. **Mention UwU Toolkit in the text:**
> Using **UwU Toolkit's** `bloodhound_collect` module to enumerate the domain...

---

## Claude Code Integration

When asking Claude Code to generate writeups, reference this document:

```
Reference /home/p3ta/dev/p3ta00.github.io/WRITEUP_STANDARDS.md for the writeup format.
Use the UwU color theme - code blocks will auto-highlight security output.
Center images using the HTML div method.
Include all command output for maximum syntax highlighting.
Highlight UwU Toolkit usage throughout.
```

### Key Points for Claude:
1. **Preserve exact command syntax** - Don't modify commands from the source
2. **Include full output** - The JS needs text to highlight
3. **Use status indicators** - `[+]`, `[*]`, `[-]`, `[!]` get colored
4. **Center images** - Use `<div style="text-align: center;">`
5. **Mention UwU Toolkit** - Bold it when referencing modules
6. **Tables for overview** - Use markdown tables for box info
7. **Attack path diagrams** - ASCII art for visual flow
