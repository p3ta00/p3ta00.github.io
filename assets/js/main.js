// Terminal effects and functionality

document.addEventListener('DOMContentLoaded', function() {
  // Run the hacker terminal animation
  runHackerTerminal();

  // Add glitch effect on hover for headers
  const glitchElements = document.querySelectorAll('.glitch');
  glitchElements.forEach(el => {
    el.addEventListener('mouseenter', () => {
      el.style.animation = 'glitch 0.3s linear';
    });
    el.addEventListener('animationend', () => {
      el.style.animation = '';
    });
  });

  // Keyboard navigation hints
  document.addEventListener('keydown', function(e) {
    if (e.key === 'h' && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT') {
      window.location.href = '/';
    }
    if (e.key === 'c' && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT') {
      window.location.href = '/ctf/';
    }
    if (e.key === 'b' && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT') {
      window.location.href = '/blog/';
    }
  });

  // Console easter egg
  console.log('%c' + `
  ██████╗ ██████╗ ████████╗ █████╗
  ██╔══██╗╚════██╗╚══██╔══╝██╔══██╗
  ██████╔╝ █████╔╝   ██║   ███████║
  ██╔═══╝  ╚═══██╗   ██║   ██╔══██║
  ██║     ██████╔╝   ██║   ██║  ██║
  ╚═╝     ╚═════╝    ╚═╝   ╚═╝  ╚═╝
  `, 'color: #ff10f0; font-family: monospace;');

  console.log('%cWelcome, curious one.', 'color: #00ff9f; font-size: 14px;');
  console.log('%cKeyboard shortcuts: h=home, c=ctf, b=blog', 'color: #8b7aa8; font-size: 12px;');
});

// Hacker terminal animation
async function runHackerTerminal() {
  const terminal = document.getElementById('hacker-terminal');
  const asciiHeader = document.getElementById('ascii-header');
  const headerInfo = document.getElementById('header-info');
  const headerTagline = document.getElementById('header-tagline');

  if (!terminal) return;

  // Check if we're on the home page
  const isHomePage = window.location.pathname === '/' || window.location.pathname === '/index.html' || window.location.pathname === '';

  // If NOT on home page, show static ASCII with glow effect
  if (!isHomePage) {
    terminal.style.display = 'none';
    if (asciiHeader) {
      asciiHeader.style.display = 'block';
      asciiHeader.style.color = 'var(--pink)';
      asciiHeader.style.textShadow = '0 0 10px var(--glow), 0 0 20px var(--glow)';
    }
    if (headerInfo) headerInfo.style.display = 'none';
    if (headerTagline) headerTagline.style.display = 'block';
    return;
  }

  // Home page - always play the animation

  const prompt = '<span class="prompt-user">p3ta</span><span class="prompt-at">@</span><span class="prompt-host">dc710</span> <span class="prompt-symbol">$</span> ';

  // Helper function to type text character by character
  async function typeText(element, text, speed = 50) {
    for (let i = 0; i < text.length; i++) {
      element.innerHTML += text[i];
      await sleep(speed + Math.random() * 30);
    }
  }

  // Helper function to add a line
  function addLine(html, className = '') {
    const line = document.createElement('div');
    line.className = className;
    line.innerHTML = html;
    terminal.appendChild(line);
    return line;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Start animation
  terminal.innerHTML = '';

  // Line 1: secretsdump command
  let line1 = addLine(prompt, 'terminal-line');
  let cmd1 = document.createElement('span');
  cmd1.style.color = 'var(--cyan)';
  line1.appendChild(cmd1);
  await typeText(cmd1, 'impacket-secretsdump -just-dc-user p3ta dc710.local/admin@10.10.10.710', 40);

  await sleep(500);

  // Secretsdump output
  addLine('<span style="color: var(--foreground-dark)">Impacket v0.12.0 - Copyright Fortra, LLC and its affiliated companies</span>', 'terminal-line');
  await sleep(200);
  addLine('', 'terminal-line');
  addLine('<span style="color: var(--yellow)">[*]</span> Dumping Domain Credentials (domain\\uid:rid:lmhash:nthash)', 'terminal-line');
  await sleep(300);
  addLine('<span style="color: var(--yellow)">[*]</span> Using the DRSUAPI method to get NTDS.DIT secrets', 'terminal-line');
  await sleep(400);
  const hashLine = addLine('<span style="color: var(--green)">[+]</span> <span style="color: var(--foreground)">p3ta:1337:aad3b435b51404eeaad3b435b51404ee:<span class="crackable-hash" style="color: var(--pink); cursor: pointer; text-decoration: underline dotted;">14CECFEA60D26E5CF08FF65CAEF94FC5</span>:::</span>', 'terminal-line');

  // Add click handler to hash for cracking attempt
  const hashSpan = hashLine.querySelector('.crackable-hash');
  if (hashSpan) {
    hashSpan.title = 'Click to try cracking this hash';
    hashSpan.addEventListener('click', () => showCrackPrompt(terminal, addLine, typeText, sleep));
  }

  await sleep(200);
  addLine('<span style="color: var(--yellow)">[*]</span> Cleaning up...', 'terminal-line');
  await sleep(600);
  addLine('', 'terminal-line');

  // Line 2: evil-winrm command
  let line2 = addLine(prompt, 'terminal-line');
  let cmd2 = document.createElement('span');
  cmd2.style.color = 'var(--cyan)';
  line2.appendChild(cmd2);
  await typeText(cmd2, 'evil-winrm -i dc710 -u p3ta -H 14CECFEA60D26E5CF08FF65CAEF94FC5', 45);

  await sleep(500);

  // Evil-WinRM output
  addLine('', 'terminal-line');
  addLine('<span style="color: var(--purple)">Evil-WinRM</span> shell v3.5', 'terminal-line');
  await sleep(200);
  addLine('<span style="color: var(--foreground-dark)">Info: Establishing connection to remote endpoint</span>', 'terminal-line');
  await sleep(800);
  addLine('', 'terminal-line');
  addLine('<span style="color: var(--green)">[+]</span> <span style="color: var(--green)">Session established!</span>', 'terminal-line');
  await sleep(300);

  // Evil-WinRM prompt and whoami
  let line3 = addLine('<span style="color: var(--red)">*Evil-WinRM*</span> PS C:\\Users\\p3ta&gt; ', 'terminal-line');
  let cmd3 = document.createElement('span');
  cmd3.style.color = 'var(--cyan)';
  line3.appendChild(cmd3);
  await typeText(cmd3, 'type flag.txt', 50);

  await sleep(400);
  addLine('', 'terminal-line');

  // Reveal ASCII with pwned effect
  await sleep(300);

  const asciiArt = `<span style="color: var(--pink)">██████╗ ██████╗ ████████╗ █████╗</span>
<span style="color: var(--pink)">██╔══██╗╚════██╗╚══██╔══╝██╔══██╗</span>
<span style="color: var(--pink)">██████╔╝ █████╔╝   ██║   ███████║</span>
<span style="color: var(--pink)">██╔═══╝  ╚═══██╗   ██║   ██╔══██║</span>
<span style="color: var(--pink)">██║     ██████╔╝   ██║   ██║  ██║</span>
<span style="color: var(--pink)">╚═╝     ╚═════╝    ╚═╝   ╚═╝  ╚═╝</span>`;

  const asciiPre = document.createElement('pre');
  asciiPre.className = 'ascii-header';
  asciiPre.style.textShadow = '0 0 10px var(--glow)';
  asciiPre.innerHTML = asciiArt;
  terminal.appendChild(asciiPre);

  await sleep(200);
  addLine('<span style="color: var(--green)">[+] PWNED!</span> <span style="color: var(--foreground-dark)">// CTF Player | Security Researcher | Breaking things to learn how they work</span>', 'terminal-line');

  await sleep(500);

  // Add clickable crack challenge prompt
  const crackPrompt = addLine('', 'terminal-line');
  crackPrompt.innerHTML = '<span style="color: var(--yellow)">[?]</span> <span class="crack-challenge" style="color: var(--cyan); cursor: pointer; text-decoration: underline;">Think you can crack that hash? Click here to try!</span>';

  const crackLink = crackPrompt.querySelector('.crack-challenge');
  if (crackLink) {
    crackLink.addEventListener('click', () => showCrackPrompt(terminal, addLine, typeText, sleep));
  }
}

// Hash cracking challenge prompt
async function showCrackPrompt(terminal, addLine, typeText, sleep) {
  const correctPassword = 'Scarface1!';

  // Create input line
  const inputLine = document.createElement('div');
  inputLine.className = 'terminal-line';
  inputLine.innerHTML = '<span style="color: var(--yellow)">[?]</span> <span style="color: var(--cyan)">Enter cracked password:</span> ';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'hash-crack-input';
  input.style.cssText = `
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--pink);
    color: var(--green);
    font-family: inherit;
    font-size: inherit;
    outline: none;
    width: 200px;
    padding: 2px 5px;
  `;
  inputLine.appendChild(input);
  terminal.appendChild(inputLine);
  input.focus();

  // Scroll to input
  terminal.scrollIntoView({ behavior: 'smooth', block: 'end' });

  input.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      const attempt = input.value.trim();
      input.disabled = true;

      await sleep(300);

      if (attempt === correctPassword) {
        // Correct password - show epic message with same pulsing effect
        addLine('', 'terminal-line');
        const successLine = document.createElement('div');
        successLine.className = 'terminal-line taunt-message';
        terminal.appendChild(successLine);

        const successText = 'You are a man that walks among the Gods';

        // Type out the success message with rainbow pulsing effect
        for (let i = 0; i < successText.length; i++) {
          const charSpan = document.createElement('span');
          charSpan.className = 'pulse-rainbow';
          charSpan.style.animationDelay = `${i * 0.1}s`;
          charSpan.textContent = successText[i];
          successLine.appendChild(charSpan);
          await sleep(60 + Math.random() * 30);
        }

        addLine('', 'terminal-line');
        addLine('<span style="color: var(--green)">[+] ACCESS GRANTED!</span> <span style="color: var(--foreground-dark)">The hash has been cracked.</span>', 'terminal-line');
        await sleep(500);
        addLine('<span style="color: var(--cyan)">[*]</span> <span style="color: var(--foreground-dark)">Redirecting to walkthroughs...</span>', 'terminal-line');
        await sleep(1500);

        // Redirect to CTF walkthroughs page
        window.location.href = '/ctf/';
      } else {
        // Wrong password - show the taunt with pulsing colors and typing effect
        addLine('', 'terminal-line');
        const tauntLine = document.createElement('div');
        tauntLine.className = 'terminal-line taunt-message';
        terminal.appendChild(tauntLine);

        const tauntText = 'Alexis stop being a noob!';

        // Type out the taunt with rainbow pulsing effect
        for (let i = 0; i < tauntText.length; i++) {
          const charSpan = document.createElement('span');
          charSpan.className = 'pulse-rainbow';
          charSpan.style.animationDelay = `${i * 0.1}s`;
          charSpan.textContent = tauntText[i];
          tauntLine.appendChild(charSpan);
          await sleep(80 + Math.random() * 40);
        }

        addLine('', 'terminal-line');
        addLine('<span style="color: var(--red)">[-]</span> <span style="color: var(--foreground-dark)">Try harder... or use a better wordlist!</span>', 'terminal-line');
      }

      terminal.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  });
}

// Copy code block to clipboard
document.querySelectorAll('pre').forEach(block => {
  block.addEventListener('dblclick', function() {
    const code = this.querySelector('code') || this;
    navigator.clipboard.writeText(code.textContent).then(() => {
      const originalBorder = this.style.borderColor;
      this.style.borderColor = '#00ff9f';
      setTimeout(() => {
        this.style.borderColor = originalBorder;
      }, 500);
    });
  });
});

// Optional: CRT scan line effect
function createScanLines() {
  const scanLines = document.createElement('div');
  scanLines.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9999;
    background: repeating-linear-gradient(
      0deg,
      rgba(0, 0, 0, 0.1),
      rgba(0, 0, 0, 0.1) 1px,
      transparent 1px,
      transparent 2px
    );
  `;
  document.body.appendChild(scanLines);
}
