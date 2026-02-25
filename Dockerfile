# ═══════════════════════════════════════════════════════════
#  Shield Messenger — Reproducible Build Dockerfile
#  Multi-stage · Pinned base · cargo-audit · SBOM · SHA256
# ═══════════════════════════════════════════════════════════

# ── Stage 1: Builder ──────────────────────────────────────
FROM rust:1.76-bookworm AS builder

# Install cargo-audit and cargo-sbom for security and provenance
RUN cargo install cargo-audit --locked && \
    cargo install cargo-sbom --locked

WORKDIR /app

# Copy dependency manifests first for layer caching
COPY secure-legion-core/Cargo.toml secure-legion-core/Cargo.lock ./

# Create a dummy src to pre-build dependencies
RUN mkdir -p src && \
    echo 'pub fn _dummy() {}' > src/lib.rs && \
    cargo build --release --locked 2>/dev/null || true && \
    rm -rf src

# Copy actual source
COPY secure-legion-core/ .

# Deterministic build flags
ENV RUSTFLAGS="-C codegen-units=1 --remap-path-prefix=/app=shield-messenger -C strip=none"

# Run security audit
RUN cargo audit

# Build release binary
RUN cargo build --release --locked

# Generate SBOM (Software Bill of Materials)
RUN cargo sbom > /app/sbom.json 2>/dev/null || \
    cargo tree --format "{p} {l}" > /app/sbom.txt

# Compute SHA256 of outputs
RUN sha256sum target/release/libsecurelegion.a > /app/checksums.sha256 2>/dev/null || true && \
    sha256sum target/release/libsecurelegion.so >> /app/checksums.sha256 2>/dev/null || true

# Run tests
RUN cargo test --release --locked

# ── Stage 2: Server builder ──────────────────────────────
FROM node:20-bookworm-slim AS server-builder

WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --production=false
COPY server/ .
RUN npm run build --if-present

# ── Stage 3: Runtime ──────────────────────────────────────
FROM debian:bookworm-slim AS runtime

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      ca-certificates \
      tini \
      curl && \
    rm -rf /var/lib/apt/lists/*

# Non-root user
RUN groupadd --gid 1000 shield && \
    useradd --uid 1000 --gid shield --shell /bin/false --create-home shield

WORKDIR /app

# Copy Rust artifacts
COPY --from=builder /app/target/release/libsecurelegion.a /app/lib/
COPY --from=builder /app/checksums.sha256 /app/
COPY --from=builder /app/sbom.* /app/

# Copy server
COPY --from=server-builder /app/server /app/server

# Switch to non-root
USER shield

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4000/api/health || exit 1

EXPOSE 4000

ENTRYPOINT ["tini", "--"]
CMD ["node", "/app/server/dist/index.js"]
