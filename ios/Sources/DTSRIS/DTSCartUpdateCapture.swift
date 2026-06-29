import Foundation

/// Captures cart interaction events.
/// Integrators annotate their cart-related UI elements with accessibility identifiers
/// matching the pattern `dtsris-cart-{action}` (e.g., `dtsris-cart-add`).
/// This ensures no PII is captured — only the semantic action name.
final class DTSCartUpdateCapture {
    private let emit: (DTSEventType, [String: DTSEventValue]) -> Void

    init(emit: @escaping (DTSEventType, [String: DTSEventValue]) -> Void) {
        self.emit = emit
    }

    /// Call this from your cart action handler (e.g. add-to-cart button tap).
    func capture(action: String, productId: String? = nil, quantity: Int? = nil) {
        var props: [String: DTSEventValue] = [
            "action": .string(action),
        ]
        if let pid = productId { props["productId"] = .string(pid) }
        if let qty = quantity { props["quantity"] = .int(qty) }
        emit(.cartUpdate, props)
    }
}
