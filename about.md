---
layout: default
title: About
---

<div class="terminal-output">
  <p>
    <span class="prompt-symbol">$</span> <span style="color: var(--cyan);">cat ~/about.md</span>
  </p>
</div>

## whoami

```bash
$ id
uid=1337(p3ta) gid=710(defcon) groups=710(defcon),27(sudo),1000(navy-veteran)
```

I'm Jayson Ek. I retired as a Navy Chief after 20 years in the United States Navy aboard destroyers and carriers, with deployments to Iraq and Afghanistan. That experience taught me what it means to operate in high-stakes environments where precision and discipline aren't optional.

Today, I oversee a penetration testing team and have the privilege of working alongside some of the best emerging talent in the industry. Mentoring the next generation of security professionals and watching them grow into skilled operators is one of the most rewarding parts of what I do.

## Certifications

```
$ cat /etc/certs.conf

[Offensive Security]
OSCP+    = true    # Offensive Security Certified Professional
OSEP     = true    # Offensive Security Experienced Penetration Tester
CAPE     = true    # Certified Adversary Pursuit Expert

[Hack The Box]
CPTS     = true    # Certified Penetration Testing Specialist
CWEE     = true    # Certified Web Exploitation Expert
CWES     = true    # Certified Web Exploitation Specialist

[CompTIA]
Network+  = true
Security+ = true
SecurityX = true

[Other]
CEH      = true    # Look, we all make mistakes. Don't @ me.
```

## Where to Find Me

```
$ grep -r "p3ta" /var/log/community/*

/var/log/community/htb:        Active player, always hunting
/var/log/community/hacksmarter: Catch me in the Discord
/var/log/community/defcon:     DC710 Founding Member - Mojave Desert
```

I'm a founding member of **DEF CON Group 710** out of the Mojave Desert. When I'm not on an engagement or chasing flags, you'll find me in the [HackSmarter Discord](https://hacksmarter.org) or grinding boxes on HTB.

## Philosophy

```python
#!/usr/bin/env python3
"""
Things I believe in:
"""

principles = [
    "The best hackers never stop being students",
    "Share knowledge freely—gatekeeping is for the weak",
    "Respect the craft, respect the community",
    "Mentorship isn't optional, it's a responsibility",
    "Break things to understand how they work",
]

for p in principles:
    print(f"[+] {p}")
```

## The Journey

From standing watch on a destroyer in hostile waters to standing up cybertest infrastructure—it's been one hell of a ride. The military taught me discipline, attention to detail, and how to operate under pressure. Offensive security gave me a new mission.

Now I get to combine both: leading operators, planning engagements, and occasionally still getting my hands dirty in the trenches.

<div class="terminal-output" style="background: var(--background); padding: 15px; border-radius: 5px; font-family: 'JetBrains Mono', monospace;">
<span style="color: var(--green);">$</span> <span style="color: var(--cyan);">uptime</span><br>
<span id="uptime-counter" style="color: var(--foreground);"></span>
</div>

<script>
function updateUptime() {
  const start = new Date('2002-08-06T00:00:00');
  const now = new Date();
  const diff = now - start;

  const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  const days = Math.floor((diff % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  document.getElementById('uptime-counter').innerHTML =
    years + ' years, ' + days + ' days, ' + hours + ' hours, ' + minutes + ' minutes, ' + seconds + ' seconds of experience';
}
updateUptime();
setInterval(updateUptime, 1000);
</script>

## Connect

```bash
$ cat ~/.profile | grep -i social

GITHUB="https://github.com/p3ta00"
LINKEDIN="https://www.linkedin.com/in/jayson-p3ta-ek/"
DISCORD="p3ta00"
DEFCON="DC710 - Mojave"
HTB="Active"
HACKSMARTER="Discord Regular"
```

---

<p style="color: var(--foreground-dark); font-style: italic; margin-top: 30px;">
"The only way to do great work is to love what you do—and occasionally pop shells at 2 AM."
</p>

```
$ exit
```
