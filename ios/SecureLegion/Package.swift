// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "SecureLegion",
    platforms: [
        .iOS(.v16),
        .macOS(.v13)
    ],
    products: [
        .library(
            name: "SecureLegionCore",
            targets: ["SecureLegionCore"]
        ),
    ],
    dependencies: [
        .package(url: "https://github.com/nicklockwood/SwiftFormat", from: "0.53.0"),
    ],
    targets: [
        .target(
            name: "SecureLegionCore",
            dependencies: [],
            path: "Sources/Core"
        ),
        .target(
            name: "SecureLegionApp",
            dependencies: ["SecureLegionCore"],
            path: "Sources"
        ),
    ]
)
