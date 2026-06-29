import Foundation

enum DTSRetry {
    private static let initialBackoff: TimeInterval = 1.0
    private static let maxBackoff: TimeInterval = 30.0

    static func withBackoff<T>(
        maxRetries: Int,
        operation: @escaping () async throws -> T
    ) async throws -> T {
        var lastError: Error?
        for attempt in 0...maxRetries {
            do {
                return try await operation()
            } catch {
                lastError = error
                if attempt >= maxRetries { break }
                let base = initialBackoff * pow(2.0, Double(attempt))
                let jitter = base * Double.random(in: 0.8...1.2)
                let delay = min(jitter, maxBackoff)
                try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
            }
        }
        throw lastError ?? DTSRetryError.unknown
    }
}

enum DTSRetryError: Error {
    case unknown
}
