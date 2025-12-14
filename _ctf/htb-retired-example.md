---
title: "Retired Box Example"
platform: "HackTheBox"
difficulty: "Medium"
os: "Linux"
date: 2024-01-10
active: false
---

## Box Info

| Property | Value |
|----------|-------|
| OS | Linux |
| Difficulty | Medium |
| Release | 2024-01-01 |
| Retire | 2024-01-10 |

## Summary

This is an example retired HTB machine writeup. Since this machine is retired, the full writeup is available without any restrictions.

## Enumeration

### Nmap

```bash
$ nmap -sC -sV -oA nmap/retired 10.10.10.x

PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.2p1
80/tcp open  http    nginx 1.18.0
```

### Web Enumeration

```bash
$ gobuster dir -u http://10.10.10.x -w /usr/share/wordlists/dirb/common.txt
```

## Foothold

Describe initial access here...

## Privilege Escalation

Describe privesc here...

## Root Flag

```
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Key Takeaways

- Enumerate all services thoroughly
- Check for misconfigurations
- Always look for privilege escalation vectors
