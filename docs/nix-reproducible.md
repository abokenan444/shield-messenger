# Reproducible Builds with Nix (Planned)

This document describes the planned addition of a Nix flake for reproducible, bit-for-bit verifiable builds of `shield-messenger-core`. This is stronger than Docker for the privacy community (F-Droid, PrivacyGuides) because every input is content-addressed.

## Why Nix?

- **Content-addressed:** Every dependency is pinned by hash, not by version string. Two independent builders produce identical outputs.
- **No ambient state:** Nix builds run in a sandboxed environment with no network access after fetching inputs.
- **Auditable:** The full dependency graph is inspectable via `nix flake metadata` and `nix flake show`.
- **F-Droid compatibility:** F-Droid's reproducible build verification can be configured to use Nix.

## Planned `flake.nix` Structure

```nix
{
  description = "shield-messenger-core reproducible build";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.05";
    rust-overlay.url = "github:oxalica/rust-overlay";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, rust-overlay, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ rust-overlay.overlays.default ];
        };
        rust = pkgs.rust-bin.stable."1.83.0".default.override {
          targets = [ "aarch64-linux-android" "wasm32-unknown-unknown" ];
        };
      in {
        packages.default = pkgs.rustPlatform.buildRustPackage {
          pname = "shieldmessenger";
          version = "1.0.0";
          src = ./shield-messenger-core;
          cargoLock.lockFile = ./shield-messenger-core/Cargo.lock;
          buildInputs = [ rust ];
          buildNoDefaultFeatures = true;
        };

        devShells.default = pkgs.mkShell {
          buildInputs = [
            rust
            pkgs.cargo-audit
            pkgs.cargo-deny
          ];
        };
      }
    );
}
```

## How to Verify

```bash
# Build and produce SHA256
nix build .#default
sha256sum result/lib/libshieldmessenger.so

# Compare with CI-published checksum
# If they match, the build is reproducible.
```

## Current Status

- **Docker multi-stage** (`Dockerfile.core`) is available now.
- **GitHub Actions CI** (`ci.yml`) runs `cargo-audit`, `cargo-deny`, and publishes SHA256.
- **Nix flake** is planned for a future release once `Cargo.lock` is stabilized.

## Prerequisites

1. Generate `Cargo.lock`: run `cargo generate-lockfile` in `shield-messenger-core/`.
2. Commit the lockfile (currently gitignored — will be un-ignored for reproducible builds).
3. Install Nix with flakes: `sh <(curl -L https://nixos.org/nix/install) --daemon` then `nix profile install nixpkgs#nix`.

## References

- [Nix Flakes](https://nixos.wiki/wiki/Flakes)
- [F-Droid Reproducible Builds](https://f-droid.org/docs/Reproducible_Builds/)
- [cargo-deny](https://embarkstudios.github.io/cargo-deny/)
