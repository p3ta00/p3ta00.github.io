---
layout: default
title: About
---

<section class="about-section">

  <div class="terminal-output">
    <p>
      <span class="prompt-symbol">$</span> <span style="color: var(--cyan);">cat ~/about.md</span>
    </p>
  </div>

  <div class="ascii-box cyan-glow">
    <pre class="ascii-art">╔═════════════════════════════════════════════════════════╗
║                        WHOAMI                          ║
╚═════════════════════════════════════════════════════════╝</pre>
  </div>

  <div class="terminal-box">
    <div class="terminal-prompt"><span class="prompt-symbol">$</span> <span class="cat-cmd">id</span></div>
    <div class="terminal-content">
      <pre>uid=1337(p3ta) gid=710(defcon) groups=710(defcon),27(sudo),1000(navy-veteran)</pre>
    </div>
  </div>

  <div class="terminal-box" style="margin-top: 15px;">
    <div class="terminal-prompt"><span class="prompt-symbol">$</span> <span class="cat-cmd">cat</span> <span class="cat-file">./bio.txt</span></div>
    <div class="terminal-content">
      <pre>I'm Jayson Ek. I retired as a Navy Chief after 20 years in the
United States Navy aboard destroyers and carriers, with deployments
to Iraq and Afghanistan. That experience taught me what it means to
operate in high-stakes environments where precision and discipline
aren't optional.

Today, I oversee a penetration testing team and have the privilege
of working alongside some of the best emerging talent in the industry.</pre>
    </div>
  </div>

  <div class="ascii-box green-glow" style="margin-top: 40px;">
    <pre class="ascii-art">╔═════════════════════════════════════════════════════════╗
║                      COMMUNITY                         ║
╚═════════════════════════════════════════════════════════╝</pre>
  </div>

  <div class="terminal-box">
    <div class="terminal-prompt"><span class="prompt-symbol">$</span> <span class="cat-cmd">grep</span> -r "p3ta" /var/log/community/*</div>
    <div class="terminal-content">
      <pre><span class="cat-key">/var/log/community/htb</span>        Active player, always hunting
<span class="cat-key">/var/log/community/hacksmarter</span> Catch me in the Discord
<span class="cat-key">/var/log/community/defcon</span>      DC710 Founding Member - Mojave Desert</pre>
    </div>
  </div>

  <div class="philosophy-box" style="margin-top: 15px;">
    <p>I'm a founding member of <strong style="color: var(--cyan);">DEF CON Group 710</strong> out of the Mojave Desert. When I'm not on an engagement or chasing flags, you'll find me in the HackSmarter Discord or grinding boxes on HTB.</p>
  </div>

  <div class="ascii-box pink-glow" style="margin-top: 40px;">
    <pre class="ascii-art">╔═════════════════════════════════════════════════════════╗
║                     THE JOURNEY                        ║
╚═════════════════════════════════════════════════════════╝</pre>
  </div>

  <div class="terminal-box">
    <div class="terminal-prompt"><span class="prompt-symbol">$</span> <span class="cat-cmd">cat</span> <span class="cat-file">./journey.log</span></div>
    <div class="terminal-content">
      <pre>From standing watch on a destroyer in hostile waters to standing
up cybertest infrastructure—it's been one hell of a ride.

The military taught me discipline, attention to detail, and how
to operate under pressure. Offensive security gave me a new mission.

Now I get to combine both: leading operators, planning engagements,
and occasionally still getting my hands dirty in the trenches.</pre>
    </div>
  </div>

  <div class="terminal-box" style="margin-top: 15px;">
    <div class="terminal-prompt"><span class="prompt-symbol">$</span> <span class="cat-cmd">uptime</span></div>
    <div class="terminal-content">
      <pre><span id="uptime-counter" style="color: var(--green);"></span></pre>
    </div>
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
      years + ' years, ' + days + ' days, ' + hours + 'h ' + minutes + 'm ' + seconds + 's of experience';
  }
  updateUptime();
  setInterval(updateUptime, 1000);
  </script>

  <div class="ascii-box cyan-glow" style="margin-top: 40px;">
    <pre class="ascii-art">╔═════════════════════════════════════════════════════════╗
║                       CONNECT                          ║
╚═════════════════════════════════════════════════════════╝</pre>
  </div>

  <div class="terminal-box">
    <div class="terminal-prompt"><span class="prompt-symbol">$</span> <span class="cat-cmd">cat</span> <span class="cat-file">~/.profile</span> | grep -i social</div>
    <div class="terminal-content">
      <pre><span class="cat-key">GITHUB</span>      <a href="https://github.com/p3ta00" style="color: var(--cyan);">github.com/p3ta00</a>
<span class="cat-key">LINKEDIN</span>    <a href="https://www.linkedin.com/in/jayson-p3ta-ek/" style="color: var(--cyan);">linkedin.com/in/jayson-p3ta-ek</a>
<span class="cat-key">DISCORD</span>     p3ta00
<span class="cat-key">DEFCON</span>      DC710 - Mojave
<span class="cat-key">HTB</span>         Active
<span class="cat-key">HACKSMARTER</span> Discord Regular</pre>
    </div>
  </div>

  <div class="ascii-box cyan-glow" style="margin-top: 40px;">
    <pre class="ascii-art">╔═══════════════════════════════════════════════════════════════════════╗
║  EOF │ "Pop shells at 2 AM because that's when the magic happens"   ║
╚═══════════════════════════════════════════════════════════════════════╝</pre>
  </div>

  <div style="margin-top: 30px;">
    <a href="{{ '/' | relative_url }}" style="color: var(--cyan); text-decoration: none;">
      <span style="color: var(--green);">&lt;</span> cd ~/
    </a>
  </div>

</section>
