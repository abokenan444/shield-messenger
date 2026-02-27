# Shield Messenger — iOS Build Guide

## Prerequisites

- macOS 13+ (Ventura or later)
- Xcode 15+
- Node.js 18+ and npm/yarn
- Rust toolchain (`rustup`)
- CocoaPods (`gem install cocoapods`)
- Apple Developer account (for device testing and App Store submission)

## Quick Start

### 1. Install Dependencies

```bash
cd ios-app/ShieldMessenger
npm install
cd ios && pod install && cd ..
```

### 2. Build Rust Core for iOS

```bash
# Install iOS targets
rustup target add aarch64-apple-ios aarch64-apple-ios-sim x86_64-apple-ios

# Build the library
./scripts/build-rust-ios.sh release
```

This produces:
- `ios/Libraries/libsecurelegion-device.a` — for physical devices
- `ios/Libraries/libsecurelegion-sim.a` — for simulators

### 3. Configure Xcode

1. Open `ios/ShieldMessenger.xcworkspace` in Xcode
2. Go to **Build Phases → Link Binary With Libraries**
3. Add `libsecurelegion-device.a` (or `-sim.a` for simulator)
4. Go to **Build Settings**:
   - Set **Library Search Paths** to `$(PROJECT_DIR)/Libraries`
   - Set **Objective-C Bridging Header** to `ShieldMessenger/ShieldMessenger-Bridging-Header.h`
5. Set your **Team** and **Bundle Identifier** in Signing & Capabilities

### 4. Run on Simulator

```bash
npx react-native run-ios
```

### 5. Run on Device

```bash
npx react-native run-ios --device "Your iPhone"
```

## Architecture

```
React Native (TypeScript)
    │
    ├── UI Screens (LockScreen, ChatList, Chat, Settings, etc.)
    ├── Navigation (React Navigation)
    ├── Services (TorService, CryptoService)
    │
    └── RustBridge.ts (NativeModules interface)
            │
            ├── RustBridge.m (Obj-C macro registration)
            └── RustBridge.swift (Swift ↔ C FFI calls)
                    │
                    └── ShieldMessenger-Bridging-Header.h (C declarations)
                            │
                            └── libsecurelegion.a (Rust core)
                                    │
                                    ├── ios.rs (C FFI exports, sl_* prefix)
                                    ├── crypto/ (encryption, ratchet, PQ KEM)
                                    ├── network/ (Tor, padding, DoS protection)
                                    └── audio/ (voice call codec)
```

## App Store Submission

### Fastlane Metadata

Store listing metadata is in `fastlane/metadata/`:
- `en-US/` — English listing
- `ar-SA/` — Arabic listing

### Privacy

- **Info.plist** includes all required `NS*UsageDescription` keys
- **PrivacyInfo.xcprivacy** declares accessed API types
- **ITSAppUsesNonExemptEncryption** is set to `false` (encryption is for user communication, exempt under BIS)

### Build for App Store

```bash
# Archive
xcodebuild archive \
  -workspace ios/ShieldMessenger.xcworkspace \
  -scheme ShieldMessenger \
  -archivePath build/ShieldMessenger.xcarchive

# Export IPA
xcodebuild -exportArchive \
  -archivePath build/ShieldMessenger.xcarchive \
  -exportPath build/ \
  -exportOptionsPlist ExportOptions.plist
```

Or use Fastlane:
```bash
cd fastlane && fastlane release
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Undefined symbols for architecture arm64` | Ensure `libsecurelegion.a` is linked and Library Search Paths are set |
| `Bridging header not found` | Set path in Build Settings → Swift Compiler → Objective-C Bridging Header |
| `Module 'React' not found` in Swift | Run `cd ios && pod install` |
| Tor connection fails | Ensure `NSAllowsLocalNetworking` is `true` in Info.plist |
