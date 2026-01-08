# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.x.x   | :white_check_mark: |
| 1.x.x   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a vulnerability, please report it immediately:

1.  **Do NOT** open a public issue.
2.  Email our security team at `security@acme-inc.com`.
3.  Include a proof of concept or detailed steps to reproduce.

## Access Policy

- **Authentication**: All access requires SSO via Okta. Personal accounts are not permitted for organization membership.
- **Secrets**: Do not commit secrets to this repository. Use the configured Vault for all dynamic credentials.
- **Devices**: Access is only permitted from managed company devices.

## Branch Protection

- All changes to `main` and `release/*` branches require a Pull Request.
- Direct pushes to protected branches are blocked.
- Code Owner reviews are mandatory for sensitive paths (`/backend`, `/infra`, `.github`).
