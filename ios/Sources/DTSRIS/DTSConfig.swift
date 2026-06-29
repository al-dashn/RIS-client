import Foundation

public struct DTSConfig {
    public let apiKey: String
    public let endpointUrl: String
    public let maxRetries: Int
    public let maxBatchSize: Int
    public let flushInterval: TimeInterval

    public init(
        apiKey: String,
        endpointUrl: String,
        maxRetries: Int = 5,
        maxBatchSize: Int = 20,
        flushInterval: TimeInterval = 5.0
    ) {
        precondition(!apiKey.isEmpty, "DTS RIS: apiKey is required")
        precondition(!endpointUrl.isEmpty, "DTS RIS: endpointUrl is required")

        self.apiKey = apiKey
        self.endpointUrl = endpointUrl.hasSuffix("/") ? String(endpointUrl.dropLast()) : endpointUrl
        self.maxRetries = max(1, maxRetries)
        self.maxBatchSize = max(1, maxBatchSize)
        self.flushInterval = max(1.0, flushInterval)
    }
}
