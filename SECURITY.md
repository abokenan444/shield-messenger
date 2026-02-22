# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest (main branch) | ✅ |
| Older versions | ❌ |

## Reporting a Vulnerability

**Do NOT open a public GitHub issue for security vulnerabilities.**

### How to Report

Email **security@shieldmessenger.com** with:

1. **Description** — Clear explanation of the vulnerability
2. **Reproduction Steps** — Detailed steps to reproduce the issue
3. **Impact Assessment** — What an attacker could achieve
4. **Affected Components** — Which platform/module is affected (Android, Web, iOS, Server, Rust Core)
5. **Proof of Concept** — If available (code, screenshots, logs)

### What to Expect

- **Acknowledgment** within 48 hours
- **Initial Assessment** within 7 days
- **Fix Timeline** based on severity:
  - **Critical** (remote code execution, key compromise): Patch within 72 hours
  - **High** (authentication bypass, data leak): Patch within 7 days
  - **Medium** (information disclosure, DoS): Patch within 30 days
  - **Low** (minor issues): Next scheduled release

### Responsible Disclosure

- We ask that you do not publicly disclose the vulnerability until we have released a fix
- We will credit you in the security advisory (unless you prefer to remain anonymous)
- We do not pursue legal action against researchers who follow responsible disclosure

## Security Architecture

Shield Messenger's security is built on multiple layers:

- **Rust Core** — Memory-safe cryptographic operations
- **Post-Quantum Encryption** — Hybrid X25519 + ML-KEM-1024
- **Tor Hidden Services** — No IP address exposure
- **Hardware-Backed Keys** — StrongBox / TEE key storage
- **Forward Secrecy** — Per-message key ratcheting
- **Zero-Knowledge** — No servers to compromise

For full technical details, see the [Whitepaper](docs/WHITEPAPER.md).

## Scope

### In Scope

- Cryptographic implementation vulnerabilities
- Authentication and authorization bypasses
- Key management weaknesses
- Network protocol vulnerabilities
- Privacy leaks (metadata, timing, traffic analysis)
- Server API vulnerabilities
- Cross-platform security inconsistencies

### Out of Scope

- Denial of service attacks
- Social engineering
- Physical device attacks
- Issues in third-party dependencies (report to upstream)
- Vulnerabilities in software not developed by Shield Messenger

## Security Audit

A comprehensive third-party security audit is planned. Results will be published in this repository upon completion.

---

Thank you for helping keep Shield Messenger secure.
