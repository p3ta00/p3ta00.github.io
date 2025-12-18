/**
 * UwU Toolkit Syntax Highlighting Enhancement
 * Adds neon cyberpunk colors to security tool output
 */

(function() {
  'use strict';

  function highlightSecurityOutput() {
    const codeBlocks = document.querySelectorAll('.highlight pre code, pre code, .highlight code');

    codeBlocks.forEach(function(block) {
      // Skip if already processed
      if (block.dataset.uwuProcessed) return;
      block.dataset.uwuProcessed = 'true';

      // Get text content and work with it
      let html = block.innerHTML;

      // Skip if it has many spans already (syntax highlighted code)
      const spanCount = (html.match(/<span/g) || []).length;
      if (spanCount > 20) return;

      // Process text nodes only - escape HTML first then apply highlighting
      const lines = html.split('\n');
      const processedLines = lines.map(function(line) {
        // Skip lines that are mostly HTML tags
        if ((line.match(/<[^>]+>/g) || []).length > 3) return line;

        // UwU Status indicators
        line = line.replace(/(\[\+\])/g, '<span class="uwu-success">$1</span>');
        line = line.replace(/(\[\*\])/g, '<span class="uwu-info">$1</span>');
        line = line.replace(/(\[\-\])/g, '<span class="uwu-error">$1</span>');
        line = line.replace(/(\[!\])/g, '<span class="uwu-warning">$1</span>');

        // Port states (only if not inside a tag)
        line = line.replace(/\b(open)\b(?![^<]*>)/gi, '<span class="uwu-port-open">$1</span>');
        line = line.replace(/\b(closed)\b(?![^<]*>)/gi, '<span class="uwu-port-closed">$1</span>');
        line = line.replace(/\b(filtered)\b(?![^<]*>)/gi, '<span class="uwu-port-filtered">$1</span>');

        // Port numbers
        line = line.replace(/\b(\d+)\/(tcp|udp)\b(?![^<]*>)/g, '<span class="uwu-port">$1</span>/<span class="uwu-protocol">$2</span>');

        // IP addresses
        line = line.replace(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b(?![^<]*>)/g, '<span class="uwu-ip">$1</span>');

        // Domain names
        line = line.replace(/\b([a-zA-Z0-9][-a-zA-Z0-9]*\.(local|htb|thm|smarter))\b(?![^<]*>)/gi, '<span class="uwu-domain">$1</span>');

        // NTLM hashes (32 hex chars not inside tags)
        line = line.replace(/\b([a-fA-F0-9]{32})\b(?![^<]*>)/g, '<span class="uwu-hash">$1</span>');

        // Service keywords
        line = line.replace(/\b(smb|ldap|kerberos|http|https|ssh|ftp|rdp|mssql|mysql|winrm|dns|netbios-ssn|microsoft-ds)\b(?![^<]*>)/gi, '<span class="uwu-service">$1</span>');

        // Windows/AD keywords
        line = line.replace(/\b(Administrator|SYSTEM|NT AUTHORITY|Domain Admins)\b(?![^<]*>)/g, '<span class="uwu-admin">$1</span>');
        line = line.replace(/\b(GenericAll|GenericWrite|WriteDACL|WriteOwner|DCSync|SeImpersonatePrivilege)\b(?![^<]*>)/gi, '<span class="uwu-dangerous">$1</span>');

        // Nmap headers
        line = line.replace(/(Nmap scan report|Starting Nmap|Host is up)/gi, '<span class="uwu-nmap-header">$1</span>');
        line = line.replace(/(PORT\s+STATE\s+SERVICE)/g, '<span class="uwu-nmap-section">$1</span>');

        // Success indicators
        line = line.replace(/\b(Pwn3d!|PWNED|Pwned|SUCCESS|VALID)\b(?![^<]*>)/gi, '<span class="uwu-pwned">$1</span>');

        // Module completed
        line = line.replace(/(Module completed successfully)/g, '<span class="uwu-success">$1</span>');

        return line;
      });

      block.innerHTML = processedLines.join('\n');
    });
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', highlightSecurityOutput);
  } else {
    highlightSecurityOutput();
  }

  // Also run after a short delay (for dynamically loaded content)
  setTimeout(highlightSecurityOutput, 500);
})();
