// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "ShieldMessenger",
    platforms: [
        .iOS(.v16),
        .macOS(.v13)
    ],
    products: [
        .library(
            name: "ShieldMessengerCore",
            targets: ["ShieldMessengerCore"]
        ),
    ],
    dependencies: [
        .package(url: "https://github.com/nicklockwood/SwiftFormat", from: "0.53.0"),
    ],
    targets: [
        .target(
            name: "ShieldMessengerCore",
            dependencies: [],
            path: "Sources/Core"
        ),
        .target(
            name: "ShieldMessengerApp",
            dependencies: ["ShieldMessengerCore"],
            path: "Sources"
        ),
    ]
)
