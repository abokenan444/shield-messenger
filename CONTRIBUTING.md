# Contributing to Shield Messenger

Thank you for your interest in contributing to Shield Messenger! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## How to Contribute

### Reporting Bugs

1. Check existing issues to avoid duplicates
2. Open a new issue with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs actual behavior
   - Platform and version information
   - Screenshots or logs if applicable

### Security Vulnerabilities

**Do NOT open public issues for security vulnerabilities.**

Email **security@shieldmessenger.com** with details. See [SECURITY.md](SECURITY.md) for full policy.

### Feature Requests

1. Open an issue with the `feature-request` label
2. Describe the feature and its use case
3. Explain how it aligns with Shield Messenger's privacy-first mission

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Write or update tests
5. Ensure all tests pass
6. Submit a pull request

## Development Setup

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Rust** | 1.70+ | Core crypto library |
| **Node.js** | 20+ | Web app & server |
| **Android Studio** | Hedgehog+ | Android development |
| **Android NDK** | 26.1+ | Cross-compilation |

### Web App

```bash
cd web
npm install
npm run dev     # Start dev server
npm test        # Run tests
```

### Server

```bash
cd server
npm install
cp .env.example .env
npm run dev     # Start dev server
npm test        # Run tests
```

### Android

```bash
cd shield-messenger-core
./build_android.sh
# Open project in Android Studio
```

## Coding Standards

### General

- Write clean, readable code
- Follow existing patterns and conventions
- Keep commits atomic and focused

### TypeScript (Web & Server)

- Use TypeScript strict mode
- Use Zod for runtime validation at system boundaries
- Follow existing project conventions for imports and structure

### Kotlin (Android)

- Follow Kotlin coding conventions
- Use coroutines for async operations
- Material Design 3 components for UI

### Rust (Core)

- Use `clippy` and format with `rustfmt`
- No `unsafe` code without justification and review
- All public APIs must be documented

## Testing

- All new features must include tests
- All bug fixes must include regression tests
- Tests must pass before PRs are merged

```bash
# Web tests (175 tests)
cd web && npm test

# Server tests (131 tests)
cd server && npm test
```

## Commit Messages

Use clear, descriptive commit messages:

```
feat: add group messaging support
fix: resolve key ratchet race condition
docs: update deployment guide
test: add crypto utils edge cases
refactor: simplify Tor connection manager
```

## Areas to Contribute

| Area | Description |
|------|-------------|
| **Security** | Code review, threat modeling, penetration testing |
| **Cryptography** | Review crypto implementations, suggest improvements |
| **Development** | Bug fixes, features, performance optimization |
| **Documentation** | Technical docs, user guides, API documentation |
| **Translations** | Add or improve language translations (17 languages supported) |
| **Testing** | Automated tests, device testing, bug reports |
| **Design** | UI/UX improvements, icons, branding |

## License

By contributing, you agree that your contributions will be licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE).

---

Questions? Open an issue or email **contact@shieldmessenger.com**.
