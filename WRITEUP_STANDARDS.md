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
