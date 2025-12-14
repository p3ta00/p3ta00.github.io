// Terminal effects and functionality

document.addEventListener('DOMContentLoaded', function() {
  // Add typing effect to elements with .typing class
  const typingElements = document.querySelectorAll('.typing');
  typingElements.forEach(el => {
    el.style.width = '0';
    setTimeout(() => {
      el.style.width = '100%';
    }, 100);
  });

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
    // Press 'h' for home
    if (e.key === 'h' && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT') {
      window.location.href = '/';
    }
    // Press 'c' for CTF
    if (e.key === 'c' && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT') {
      window.location.href = '/ctf/';
    }
    // Press 'b' for blog
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
  `, 'color: #7aa2f7; font-family: monospace;');

  console.log('%cWelcome, curious one. 👀', 'color: #9ece6a; font-size: 14px;');
  console.log('%cKeyboard shortcuts: h=home, c=ctf, b=blog', 'color: #565f89; font-size: 12px;');

  // Add scan line effect (optional, uncomment to enable)
  // createScanLines();
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

// Copy code block to clipboard
document.querySelectorAll('pre').forEach(block => {
  block.addEventListener('dblclick', function() {
    const code = this.querySelector('code') || this;
    navigator.clipboard.writeText(code.textContent).then(() => {
      // Visual feedback
      const originalBorder = this.style.borderColor;
      this.style.borderColor = '#9ece6a';
      setTimeout(() => {
        this.style.borderColor = originalBorder;
      }, 500);
    });
  });
});
