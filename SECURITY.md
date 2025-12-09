# Create SECURITY.md
echo '# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 18.x    | ✅                |
| 17.x    | ❌                |
| 11.x    | ❌                |

## Reporting Vulnerabilities

**DO NOT** report security issues in public GitHub issues.

Email: nimnathgraphics@gmail.com

We respond within 48 hours.' > SECURITY.md

# Create security workflow directory
mkdir -p .github/workflows

# Create security workflow
echo 'name: Security Scan
on: [push, pull_request]
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Secret Scanning
        uses: gitleaks/gitleaks-action@v2' > .github/workflows/security.yml
