---
layout: default
title: Search - UwU Toolkit Wiki
permalink: /uwu-toolkit/search/
---

# Search Wiki

<div class="wiki-search-container">
  <input type="text" id="wiki-search-input" placeholder="Search commands, modules, integrations..." autofocus>
  <div id="wiki-search-results"></div>
</div>

<style>
.wiki-search-container {
  margin: 20px 0;
}

#wiki-search-input {
  width: 100%;
  padding: 12px 15px;
  font-size: 16px;
  font-family: 'JetBrains Mono', monospace;
  background: var(--bg-lighter, #1a1b26);
  border: 2px solid var(--cyan, #7dcfff);
  border-radius: 4px;
  color: var(--foreground, #c0caf5);
  outline: none;
}

#wiki-search-input:focus {
  border-color: var(--magenta, #bb9af7);
  box-shadow: 0 0 10px rgba(187, 154, 247, 0.3);
}

#wiki-search-input::placeholder {
  color: var(--foreground-dark, #565f89);
}

#wiki-search-results {
  margin-top: 20px;
}

.search-result {
  padding: 15px;
  margin-bottom: 15px;
  background: var(--bg-lighter, #1a1b26);
  border-left: 3px solid var(--cyan, #7dcfff);
  border-radius: 4px;
}

.search-result:hover {
  border-left-color: var(--magenta, #bb9af7);
}

.search-result-title {
  font-size: 1.1em;
  margin-bottom: 5px;
}

.search-result-title a {
  color: var(--cyan, #7dcfff);
  text-decoration: none;
}

.search-result-title a:hover {
  color: var(--magenta, #bb9af7);
}

.search-result-excerpt {
  color: var(--foreground-dark, #565f89);
  font-size: 0.9em;
  line-height: 1.4;
}

.search-result-excerpt mark {
  background: var(--yellow, #e0af68);
  color: var(--bg, #1a1b26);
  padding: 0 2px;
  border-radius: 2px;
}

.search-no-results {
  color: var(--foreground-dark, #565f89);
  font-style: italic;
}

.search-category {
  display: inline-block;
  font-size: 0.75em;
  padding: 2px 8px;
  background: var(--magenta, #bb9af7);
  color: var(--bg, #1a1b26);
  border-radius: 3px;
  margin-left: 10px;
}
</style>

<script>
const wikiPages = [
  {
    title: "Wiki Index",
    url: "/uwu-toolkit/",
    category: "Overview",
    content: "UwU Toolkit modular penetration testing framework Metasploit Exegol modules auxiliary enumeration exploits post payloads Claude AI Sliver C2 Penelope Ligolo shell management variables global persistent"
  },
  {
    title: "Installation Guide",
    url: "/uwu-toolkit/installation/",
    category: "Setup",
    content: "installation setup requirements Python Linux macOS Windows WSL Exegol pip install clone git setup.sh symlink config configuration ANTHROPIC_API_KEY Sliver server client Claude AI troubleshooting module not found permission denied"
  },
  {
    title: "Commands Reference",
    url: "/uwu-toolkit/commands/",
    category: "Commands",
    content: "commands help exit quit clear banner use back info options run exploit check search reload set setg unset unsetg show vars globals history start stop listeners gosh php nc shell sessions interact kill claude sliver penelope ligolo route agents resume fg status configs export"
  },
  {
    title: "Modules Guide",
    url: "/uwu-toolkit/modules/",
    category: "Modules",
    content: "modules auxiliary enumeration exploits post payloads kerberoast asreproast bloodhound certipy secretsdump netexec smb_enum autoenum nmap_scan portscan dns_enum web_fuzz linpeas pspy reverse_shells ModuleBase register_option get_option print_status print_good print_error run_command run_in_exegol"
  },
  {
    title: "Integrations",
    url: "/uwu-toolkit/integrations/",
    category: "Integrations",
    content: "integrations Exegol container docker Claude AI Anthropic API interactive mode analyze debug ask Sliver C2 server client connect resume Penelope shell handler listener upgrade PTY sessions Ligolo-ng tunneling proxy agent TUN interface route pivoting background Ctrl+D"
  },
  {
    title: "Quick Reference",
    url: "/uwu-toolkit/quick-reference/",
    category: "Cheatsheet",
    content: "quick reference cheatsheet commands workflow AD Active Directory kerberoast enumeration post-exploitation services HTTP listener tips troubleshooting tab completion keyboard shortcuts Ctrl+D background resume penelope ligolo route"
  },
  {
    title: "Search",
    url: "/uwu-toolkit/search/",
    category: "Search",
    content: "search find wiki documentation"
  }
];

// Command-specific entries for better search
const commandEntries = [
  { title: "use - Select Module", url: "/uwu-toolkit/commands/#use", category: "Command", content: "use select module path tab completion partial matching" },
  { title: "set/setg - Set Variables", url: "/uwu-toolkit/commands/#set", category: "Command", content: "set setg variable session global persist history interactive" },
  { title: "run/exploit - Execute Module", url: "/uwu-toolkit/commands/#run-exploit", category: "Command", content: "run exploit execute module check prerequisites" },
  { title: "search - Find Modules", url: "/uwu-toolkit/commands/#search", category: "Command", content: "search find modules name description tags kerberos smb linux" },
  { title: "shells/sessions - List Shells", url: "/uwu-toolkit/commands/#shells-sessions", category: "Command", content: "shells sessions list active shell reverse connection interact" },
  { title: "penelope - Shell Handler", url: "/uwu-toolkit/commands/#penelope", category: "Command", content: "penelope shell handler listener PTY upgrade auto sessions background resume" },
  { title: "ligolo - Network Tunneling", url: "/uwu-toolkit/commands/#ligolo", category: "Command", content: "ligolo tunneling proxy agent TUN interface route pivot internal network" },
  { title: "sliver - C2 Framework", url: "/uwu-toolkit/commands/#sliver-c2", category: "Command", content: "sliver C2 command control server client implant beacon session" },
  { title: "claude - AI Assistant", url: "/uwu-toolkit/commands/#claude-ai", category: "Command", content: "claude AI assistant analyze debug ask code security vulnerability" }
];

const allEntries = [...wikiPages, ...commandEntries];

function searchWiki(query) {
  if (!query || query.length < 2) {
    return [];
  }

  const terms = query.toLowerCase().split(/\s+/);
  const results = [];

  allEntries.forEach(page => {
    const searchText = (page.title + ' ' + page.content).toLowerCase();
    let score = 0;
    let matchedTerms = [];

    terms.forEach(term => {
      if (searchText.includes(term)) {
        score += searchText.split(term).length - 1;
        matchedTerms.push(term);
      }
      // Bonus for title match
      if (page.title.toLowerCase().includes(term)) {
        score += 5;
      }
    });

    if (matchedTerms.length === terms.length) {
      results.push({
        ...page,
        score,
        matchedTerms
      });
    }
  });

  return results.sort((a, b) => b.score - a.score).slice(0, 10);
}

function highlightText(text, terms) {
  let result = text;
  terms.forEach(term => {
    const regex = new RegExp(`(${term})`, 'gi');
    result = result.replace(regex, '<mark>$1</mark>');
  });
  return result;
}

function getExcerpt(content, terms) {
  const words = content.split(/\s+/);
  let bestStart = 0;
  let bestScore = 0;

  // Find the best window of words containing search terms
  for (let i = 0; i < words.length - 10; i++) {
    const window = words.slice(i, i + 15).join(' ').toLowerCase();
    let score = 0;
    terms.forEach(term => {
      if (window.includes(term)) score++;
    });
    if (score > bestScore) {
      bestScore = score;
      bestStart = i;
    }
  }

  const excerpt = words.slice(bestStart, bestStart + 15).join(' ');
  return highlightText(excerpt, terms) + '...';
}

function renderResults(results, query) {
  const container = document.getElementById('wiki-search-results');

  if (results.length === 0) {
    if (query && query.length >= 2) {
      container.innerHTML = '<p class="search-no-results">No results found for "' + query + '"</p>';
    } else {
      container.innerHTML = '<p class="search-no-results">Type at least 2 characters to search...</p>';
    }
    return;
  }

  const html = results.map(result => `
    <div class="search-result">
      <div class="search-result-title">
        <a href="${result.url}">${highlightText(result.title, result.matchedTerms)}</a>
        <span class="search-category">${result.category}</span>
      </div>
      <div class="search-result-excerpt">
        ${getExcerpt(result.content, result.matchedTerms)}
      </div>
    </div>
  `).join('');

  container.innerHTML = html;
}

document.getElementById('wiki-search-input').addEventListener('input', function(e) {
  const query = e.target.value.trim();
  const results = searchWiki(query);
  renderResults(results, query);
});

// Initial state
renderResults([], '');
</script>

---

## Quick Links

- [Wiki Index](/uwu-toolkit/) - Main documentation
- [Commands Reference](/uwu-toolkit/commands/) - All commands
- [Modules Guide](/uwu-toolkit/modules/) - Using and creating modules
- [Integrations](/uwu-toolkit/integrations/) - Claude, Sliver, Penelope, Ligolo
- [Quick Reference](/uwu-toolkit/quick-reference/) - Cheat sheet

---

[Back to Wiki Index](/uwu-toolkit/)
