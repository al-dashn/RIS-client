#if canImport(UIKit)
import UIKit

/// Tracks app lifecycle: foreground/background transitions.
/// Emits `app_foreground` and `app_background` events.
public final class DTSLifecycleTracker {
    private let emit: (String, [String: DTSEventValue]) -> Void

    public init(emit: @escaping (String, [String: DTSEventValue]) -> Void) {
        self.emit = emit
    }

    public func register() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(didEnterForeground),
            name: UIApplication.willEnterForegroundNotification,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(didEnterBackground),
            name: UIApplication.didEnterBackgroundNotification,
            object: nil
        )
    }

    public func unregister() {
        NotificationCenter.default.removeObserver(self)
    }

    @objc private func didEnterForeground() {
        emit("app_foreground", ["timestamp": .string(ISO8601DateFormatter().string(from: Date()))])
    }

    @objc private func didEnterBackground() {
        emit("app_background", ["timestamp": .string(ISO8601DateFormatter().string(from: Date()))])
    }
}
#else
// No-op for non-UIKit platforms (macOS CLI, watchOS without UIKit)
public final class DTSLifecycleTracker {
    public init(emit: @escaping (String, [String: DTSEventValue]) -> Void) {}
    public func register() {}
    public func unregister() {}
}
#endif
