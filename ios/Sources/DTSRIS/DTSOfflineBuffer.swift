import Foundation

/// Offline event buffer backed by local file storage.
/// Events are persisted when the device is offline and flushed when connectivity returns.
public final class DTSOfflineBuffer {
    private let bufferURL: URL
    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()

    public var count: Int { loadAll().count }

    public init() {
        let cachesDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first!
        bufferURL = cachesDir.appendingPathComponent("dtsris_offline_buffer.json")
    }

    /// Persist a batch of events to disk.
    public func persist(_ events: [DTSEvent]) {
        let all = loadAll() + events
        do {
            let data = try encoder.encode(all)
            try data.write(to: bufferURL, options: .atomic)
        } catch {
            // Best-effort persistence
        }
    }

    /// Load all persisted events.
    public func loadAll() -> [DTSEvent] {
        guard let data = try? Data(contentsOf: bufferURL),
              let events = try? decoder.decode([DTSEvent].self, from: data) else {
            return []
        }
        return events
    }

    /// Clear the buffer after successful send.
    public func clear() {
        try? FileManager.default.removeItem(at: bufferURL)
    }

    /// Replace the buffer content (e.g., keep only remaining events).
    public func replace(_ events: [DTSEvent]) {
        if events.isEmpty {
            clear()
        } else {
            do {
                let data = try encoder.encode(events)
                try data.write(to: bufferURL, options: .atomic)
            } catch {
                // Ignore
            }
        }
    }
}
