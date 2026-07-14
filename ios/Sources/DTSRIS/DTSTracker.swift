import Foundation

public final class DTSTracker: @unchecked Sendable {
    private let config: DTSConfig
    private let anonymousUserId: String
    private let sessionId: String
    private let queue = DispatchQueue(label: "com.dtsris.tracker", qos: .utility)
    private var eventQueue: [DTSEvent] = []
    private var flushTimer: DispatchSourceTimer?
    private var screenCapture: DTSScreenViewCapture?
    private let cartCapture: DTSCartUpdateCapture
    private let customizationCapture: DTSCustomizationCapture
    private let errorCapture: DTSErrorCapture
    private var disposed = false

    /// Authenticated user ID — merged into every event's properties as "user_id".
    public var userId: String?
    /// Current cart ID — merged into every event's properties as "cart_id" when set.
    public var cartId: String?

    // MARK: - Singleton

    /// Shared instance. Set via `DTSTracker.initialize(config:)` before use.
    public private(set) static var shared: DTSTracker?

    /// Initialize the shared singleton. Must be called once at app startup.
    @discardableResult
    public static func initialize(config: DTSConfig) -> DTSTracker {
        let tracker = DTSTracker(config: config)
        shared = tracker
        return tracker
    }

    public init(config: DTSConfig) {
        self.config = config
        self.anonymousUserId = DTSStorage.getAnonymousUserId()
        self.sessionId = DTSStorage.getSessionId()

        self.cartCapture = DTSCartUpdateCapture { [weak self] type, props in
            self?.track(type: type, page: "", properties: props)
        }
        self.customizationCapture = DTSCustomizationCapture { [weak self] type, props in
            self?.track(type: type, page: "", properties: props)
        }
        self.errorCapture = DTSErrorCapture { [weak self] type, props in
            self?.track(type: type, page: "", properties: props)
        }
    }

    // MARK: - Public API

    public func start() {
        guard !disposed else { return }
        screenCapture = DTSScreenViewCapture { [weak self] type, props in
            let page = props["screen"].flatMap { value in
                if case .string(let s) = value { return s }
                return nil
            } ?? ""
            self?.track(type: type, page: page, properties: props)
        }

        let timer = DispatchSource.makeTimerSource(queue: queue)
        timer.schedule(deadline: .now() + config.flushInterval, repeating: config.flushInterval)
        timer.setEventHandler { [weak self] in
            self?.flush()
        }
        timer.resume()
        self.flushTimer = timer
    }

    public func track(type: DTSEventType, page: String = "", properties: [String: DTSEventValue] = [:]) {
        track(eventType: type.rawValue, page: page, properties: properties)
    }

    /// Track an event with a free-form event type string (for custom KPIs not in the enum).
    public func track(eventType: String, page: String = "", properties: [String: DTSEventValue] = [:]) {
        guard !disposed else { return }

        var enriched = properties
        if let uid = userId { enriched["user_id"] = .string(uid) }
        if let cid = cartId { enriched["cart_id"] = .string(cid) }

        let event = DTSEvent(
            eventType: eventType,
            sessionId: sessionId,
            anonymousUserId: anonymousUserId,
            page: page,
            properties: enriched
        )

        queue.async { [weak self] in
            guard let self = self, !self.disposed else { return }
            self.eventQueue.append(event)
            if self.eventQueue.count >= self.config.maxBatchSize {
                self.flush()
            }
        }
    }

    // MARK: - Convenience methods for manual tracking

    public func trackCartAction(
        action: String,
        productId: String? = nil,
        quantity: Int? = nil
    ) {
        cartCapture.capture(action: action, productId: productId, quantity: quantity)
    }

    public func trackCustomization(
        attribute: String,
        oldValue: String? = nil,
        newValue: String? = nil
    ) {
        customizationCapture.capture(attribute: attribute, oldValue: oldValue, newValue: newValue)
    }

    public func trackError(_ error: Error) {
        errorCapture.capture(error: error)
    }

    public func trackErrorMessage(_ message: String) {
        errorCapture.capture(message: message)
    }

    // MARK: - Flush & Dispose

    public func flush() {
        queue.async { [weak self] in
            guard let self = self, !self.disposed, !self.eventQueue.isEmpty else { return }
            let batch = self.eventQueue
            self.eventQueue = []

            let urlString = "\(self.config.endpointUrl)/events"
            let maxRetries = self.config.maxRetries
            let apiKey = self.config.apiKey

            Task { [weak self] in
                guard let self = self else { return }
                do {
                    try await DTSRetry.withBackoff(maxRetries: maxRetries) {
                        try await self.sendBatch(batch, url: urlString, apiKey: apiKey)
                    }
                } catch {
                    self.queue.async {
                        self.eventQueue = batch + self.eventQueue
                    }
                    Self.logError("Flush failed, events re-queued", error: error)
                }
            }
        }
    }

    public func dispose() {
        disposed = true
        flushTimer?.cancel()
        flushTimer = nil
        screenCapture = nil
        errorCapture.markCleanTermination()
        flush()
    }

    // MARK: - Private

    private func sendBatch(
        _ batch: [DTSEvent],
        url urlString: String,
        apiKey: String
    ) async throws {
        guard let url = URL(string: urlString) else {
            throw DTSTrackerError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(apiKey, forHTTPHeaderField: "X-API-Key")

        let wrapper = ["events": batch]
        let encoder = JSONEncoder()
        request.httpBody = try encoder.encode(wrapper)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResp = response as? HTTPURLResponse,
              (200..<300).contains(httpResp.statusCode) else {
            let status = (response as? HTTPURLResponse)?.statusCode ?? -1
            let body = String(data: data, encoding: .utf8)?.prefix(200) ?? ""
            throw DTSTrackerError.httpError(status: status, body: String(body))
        }
    }

    private static func logError(_ message: String, error: Error) {
        let msg = error.localizedDescription
        #if DEBUG
        print("[DTS RIS] \(message): \(msg)")
        #endif
    }
}

enum DTSTrackerError: Error {
    case invalidURL
    case httpError(status: Int, body: String)
}
