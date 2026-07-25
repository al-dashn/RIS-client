import Foundation
import Network

/// Network type detection for adaptive batching.
/// WiFi → flush aggressively. Cellular → batch larger, flush less often.
public final class DTSNetworkDetector {
    public enum NetworkType: String {
        case wifi
        case cellular
        case ethernet
        case none
    }

    public private(set) var currentType: NetworkType = .none

    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "com.dtsris.network", qos: .utility)

    /// Suggested batch size multiplier for the current network.
    public var batchSizeMultiplier: Int {
        switch currentType {
        case .wifi: return 1
        case .cellular: return 3
        case .ethernet: return 1
        case .none: return 1
        }
    }

    /// Suggested flush interval multiplier for the current network.
    public var flushIntervalMultiplier: Double {
        switch currentType {
        case .wifi: return 1.0
        case .cellular: return 3.0
        case .ethernet: return 1.0
        case .none: return 1.0
        }
    }

    /// Whether the device currently has internet connectivity.
    public var isOnline: Bool { currentType != .none }

    public func start() {
        monitor.pathUpdateHandler = { [weak self] path in
            guard let self = self else { return }
            if path.status == .satisfied {
                if path.usesInterfaceType(.wifi) {
                    self.currentType = .wifi
                } else if path.usesInterfaceType(.cellular) {
                    self.currentType = .cellular
                } else if path.usesInterfaceType(.wiredEthernet) {
                    self.currentType = .ethernet
                } else {
                    self.currentType = .wifi // fallback
                }
            } else {
                self.currentType = .none
            }
        }
        monitor.start(queue: queue)
    }

    public func stop() {
        monitor.cancel()
    }

    /// Whether the connection is metered (cellular).
    public var isMetered: Bool {
        if #available(iOS 13.0, *) {
            return currentType == .cellular
        }
        return false
    }
}
