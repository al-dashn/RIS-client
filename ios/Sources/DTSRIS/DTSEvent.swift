import Foundation

public enum DTSEventType: String, Codable {
    case screenView = "screen_view"
    case cartUpdate = "cart_update"
    case customization
    case error
}

public struct DTSEvent: Codable {
    public let eventId: String
    public let eventType: DTSEventType
    public let timestamp: String
    public let sessionId: String
    public let anonymousUserId: String
    public let page: String
    public let properties: [String: DTSEventValue]

    public init(
        eventType: DTSEventType,
        sessionId: String,
        anonymousUserId: String,
        page: String = "",
        properties: [String: DTSEventValue] = [:]
    ) {
        self.eventId = UUID().uuidString
        self.eventType = eventType
        self.timestamp = ISO8601DateFormatter().string(from: Date())
        self.sessionId = sessionId
        self.anonymousUserId = anonymousUserId
        self.page = page
        self.properties = properties
    }
}

/// A type-safe JSON value for event properties.
public enum DTSEventValue: Codable {
    case string(String)
    case int(Int)
    case double(Double)
    case bool(Bool)
    case null
    case array([DTSEventValue])
    case object([String: DTSEventValue])

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let s = try? container.decode(String.self) { self = .string(s) }
        else if let i = try? container.decode(Int.self) { self = .int(i) }
        else if let d = try? container.decode(Double.self) { self = .double(d) }
        else if let b = try? container.decode(Bool.self) { self = .bool(b) }
        else if container.decodeNil() { self = .null }
        else if let arr = try? container.decode([DTSEventValue].self) { self = .array(arr) }
        else if let obj = try? container.decode([String: DTSEventValue].self) { self = .object(obj) }
        else { throw DecodingError.dataCorruptedError(in: container, debugDescription: "Unknown value") }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let s): try container.encode(s)
        case .int(let i): try container.encode(i)
        case .double(let d): try container.encode(d)
        case .bool(let b): try container.encode(b)
        case .null: try container.encodeNil()
        case .array(let a): try container.encode(a)
        case .object(let o): try container.encode(o)
        }
    }
}
