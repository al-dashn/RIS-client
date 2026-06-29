#if canImport(UIKit)
import UIKit

final class DTSScreenViewCapture {
    private let emit: (DTSEventType, [String: DTSEventValue]) -> Void

    init(emit: @escaping (DTSEventType, [String: DTSEventValue]) -> Void) {
        self.emit = emit
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(viewDidAppear),
            name: UIApplication.didBecomeActiveNotification,
            object: nil
        )
    }

    @objc private func viewDidAppear() {
        var props: [String: DTSEventValue] = [:]
        if let rootVC = UIApplication.shared
            .connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .first?
            .windows
            .first(where: { $0.isKeyWindow })?
            .rootViewController
        {
            props["screen"] = .string(String(describing: type(of: rootVC)))
        }
        emit(.screenView, props)
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }
}
#else
// No-op for non-UIKit platforms
final class DTSScreenViewCapture {
    init(emit: @escaping (DTSEventType, [String: DTSEventValue]) -> Void) {}
}
#endif
