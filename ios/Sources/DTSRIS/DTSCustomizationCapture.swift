import Foundation

/// Captures product customization events.
/// Integrators call `capture(attribute:oldValue:newValue:)` when a customization
/// attribute changes. No PII is collected — only the attribute name and values.
final class DTSCustomizationCapture {
    private let emit: (DTSEventType, [String: DTSEventValue]) -> Void

    init(emit: @escaping (DTSEventType, [String: DTSEventValue]) -> Void) {
        self.emit = emit
    }

    func capture(attribute: String, oldValue: String? = nil, newValue: String? = nil) {
        var props: [String: DTSEventValue] = [
            "attribute": .string(attribute),
        ]
        if let ov = oldValue { props["oldValue"] = .string(ov) }
        if let nv = newValue { props["newValue"] = .string(nv) }
        emit(.customization, props)
    }
}
