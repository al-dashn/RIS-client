import Foundation

/// Captures unhandled application errors without exposing PII.
/// Crash detection works via a session-alive flag: set on init, cleared on normal dispose.
/// On next launch, a surviving flag means the previous session terminated abnormally.
final class DTSErrorCapture {
    private let emit: (DTSEventType, [String: DTSEventValue]) -> Void
    private static let aliveMarkerKey = "com.dtsris.sessionAlive"
    private static let crashMarkerKey = "com.dtsris.lastCrash"

    init(emit: @escaping (DTSEventType, [String: DTSEventValue]) -> Void) {
        self.emit = emit

        // Detect abnormal termination from previous session
        if UserDefaults.standard.bool(forKey: Self.aliveMarkerKey) {
            emit(.error, [
                "message": .string("Previous session terminated abnormally"),
                "source": .string("crash"),
            ])
        }

        // Catch Objective-C exceptions (NSException)
        NSSetUncaughtExceptionHandler { exception in
            let msg = Self.stripPII(exception.reason ?? exception.name.rawValue)
            UserDefaults.standard.set(msg, forKey: Self.crashMarkerKey)
            UserDefaults.standard.synchronize()
        }

        // Mark this session as alive
        UserDefaults.standard.set(true, forKey: Self.aliveMarkerKey)
        UserDefaults.standard.synchronize()

        // Send any crash detail queued from a previous NSException
        if let crashMsg = UserDefaults.standard.string(forKey: Self.crashMarkerKey),
           !crashMsg.isEmpty {
            UserDefaults.standard.removeObject(forKey: Self.crashMarkerKey)
            emit(.error, [
                "message": .string(crashMsg),
                "source": .string("NSException"),
            ])
        }
    }

    /// Called on normal tracker disposal to clear the alive marker.
    func markCleanTermination() {
        UserDefaults.standard.set(false, forKey: Self.aliveMarkerKey)
        UserDefaults.standard.synchronize()
    }

    func capture(error: Error) {
        let msg = Self.stripPII(error.localizedDescription)
        emit(.error, [
            "message": .string(msg),
            "source": .string("manual"),
        ])
    }

    func capture(message: String) {
        let msg = Self.stripPII(message)
        emit(.error, [
            "message": .string(msg),
            "source": .string("manual"),
        ])
    }

    private static func stripPII(_ input: String) -> String {
        var cleaned = input
        if let regex = try? NSRegularExpression(
            pattern: "[\\w.+-]+@[\\w-]+\\.[\\w.-]+",
            options: .caseInsensitive
        ) {
            cleaned = regex.stringByReplacingMatches(
                in: cleaned,
                range: NSRange(cleaned.startIndex..., in: cleaned),
                withTemplate: "[REDACTED]"
            )
        }
        if let regex = try? NSRegularExpression(
            pattern: "(?:\\+?\\d{1,3}[-.\\s]?)?\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}",
            options: []
        ) {
            cleaned = regex.stringByReplacingMatches(
                in: cleaned,
                range: NSRange(cleaned.startIndex..., in: cleaned),
                withTemplate: "[REDACTED]"
            )
        }
        return cleaned
    }
}
