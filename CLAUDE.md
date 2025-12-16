# CLAUDE.md

This file provides guidance to Claude Code when working with this Jekyll-based GitHub Pages site.

## Project Overview

Personal portfolio and CTF writeup site for p3ta00 (Jayson Ek). Hosted at https://p3ta00.github.io. Uses a terminal/hacker aesthetic with a hybrid Tokyo Night background + UwU Toolkit Cyberpunk Neon accent colors theme.

## Directory Structure

```
git_page/
├── _config.yml           # Jekyll configuration
├── index.html            # Homepage
├── about.md              # About page with bio, certs, uptime counter
├── WRITEUP_STANDARDS.md  # CTF writeup formatting guidelines
│
├── _layouts/
│   ├── default.html      # Base layout with terminal window styling
│   ├── post.html         # Blog post layout
│   └── writeup.html      # CTF writeup layout
│
├── _includes/
│   └── header.html       # Site header partial
│
├── _ctf/                 # CTF writeups (uses writeup layout)
│   ├── hacksmarter/      # HackSmarter platform writeups
│   ├── htb/              # Hack The Box writeups
│   ├── hacksmarter-evasive.md
│   ├── hacksmarter-midgarden2.md
│   ├── hacksmarter-northbridge.md
│   ├── hacksmarter-odyssey.md
│   └── hacksmarter-slayer.md
│
├── _posts/               # Blog posts (uses post layout)
│   ├── 2024-01-01-welcome.md
│   └── 2025-12-15-uwu-toolkit-introduction.md
│
├── assets/
│   ├── css/
│   │   └── main.css      # Main stylesheet (Cyberpunk Neon theme)
│   ├── images/
│   │   └── ctf/          # CTF writeup images by challenge name
│   │       ├── odyssey/
│   │       ├── slayer/
│   │       └── midgarden2/
│   └── js/               # JavaScript files
│
├── blog/                 # Blog index page
├── ctf/                  # CTF index page
└── uwu-toolkit/          # UwU Toolkit documentation pages
```

## Key Files

| File | Purpose |
|------|---------|
| `_config.yml` | Site title, URL, collections, permalinks |
| `assets/css/main.css` | All styling - color theme, syntax highlighting, layouts |
| `about.md` | Bio, certifications, live uptime counter (from Aug 6, 2002) |
| `WRITEUP_STANDARDS.md` | Guidelines for CTF writeup formatting |

## Color Theme

Hybrid theme: Tokyo Night backgrounds + UwU Toolkit Cyberpunk Neon accents

**Backgrounds (Tokyo Night):**
- `--bg-dark`: #1a1b26
- `--bg-darker`: #16161e
- `--bg-lighter`: #24283b
- `--bg-highlight`: #292e42

**Accent Colors (Cyberpunk Neon):**
- `--pink`: #ff10f0 (hot neon pink)
- `--cyan`: #00e8ff (electric cyan)
- `--green`: #00ff9f (toxic neon green)
- `--purple`: #b620e0 (neon purple)
- `--blue`: #00a2ff (neon blue)
- `--orange`: #ff7c00 (neon orange)
- `--yellow`: #ffea00 (electric yellow)
- `--red`: #ff2975 (neon red-pink)

**Glow Effect:** `rgba(255, 16, 240, 0.3)` (neon pink glow)

## CTF Writeup Format

Writeups use YAML front matter:

```yaml
---
title: "Challenge Name"
platform: "HackSmarter"  # or "Hack The Box"
category: "Windows"      # or "Linux", "Web", etc.
difficulty: "Medium"     # Easy, Medium, Hard, Insane
date: 2025-12-15
os: "Windows Server 2022"
tags: ["active-directory", "kerberos", "etc"]
---
```

Images go in: `/assets/images/ctf/<challenge-name>/`
Reference as: `![Description](/assets/images/ctf/<challenge-name>/image.png)`

See `WRITEUP_STANDARDS.md` for detailed formatting guidelines.

## Blog Post Format

```yaml
---
layout: default
title: "Post Title"
date: 2025-12-15
tags: ["tag1", "tag2"]
---
```

## Common Tasks

### Adding a CTF Writeup
1. Create markdown file in `_ctf/` with proper front matter
2. Add images to `/assets/images/ctf/<challenge-name>/`
3. Follow WRITEUP_STANDARDS.md formatting

### Adding a Blog Post
1. Create file in `_posts/` named `YYYY-MM-DD-title.md`
2. Add front matter with layout, title, date, tags

### Modifying Theme Colors
Edit CSS variables in `assets/css/main.css` `:root` section

### Updating About Page
Edit `about.md` - contains bio, certifications, social links, live uptime counter

## Build & Preview

```bash
# Local development (requires Ruby/Jekyll)
bundle exec jekyll serve

# Site auto-builds on push to main branch via GitHub Pages
```

## Owner Info

- **Name:** Jayson Ek (p3ta)
- **GitHub:** https://github.com/p3ta00
- **LinkedIn:** https://www.linkedin.com/in/jayson-p3ta-ek/
- **Discord:** p3ta00
- **DEF CON:** DC710 - Mojave Desert (Founding Member)
