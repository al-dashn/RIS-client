// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "DTSRIS",
    platforms: [
        .iOS(.v15),
        .macOS(.v12),
        .tvOS(.v15),
        .watchOS(.v8),
    ],
    products: [
        .library(
            name: "DTSRIS",
            targets: ["DTSRIS"]
        ),
    ],
    targets: [
        .target(
            name: "DTSRIS",
            path: "ios/Sources/DTSRIS"
        ),
    ]
)
