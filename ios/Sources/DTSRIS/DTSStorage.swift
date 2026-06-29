import Foundation

enum DTSStorage {
    private static let uidKey = "com.dtsris.anonymousUserId"
    private static let sidKey = "com.dtsris.sessionId"

    static func getAnonymousUserId() -> String {
        if let existing = UserDefaults.standard.string(forKey: uidKey), !existing.isEmpty {
            return existing
        }
        let newId = UUID().uuidString
        UserDefaults.standard.set(newId, forKey: uidKey)
        return newId
    }

    static func getSessionId() -> String {
        if let existing = UserDefaults.standard.string(forKey: sidKey), !existing.isEmpty {
            return existing
        }
        let newId = UUID().uuidString
        UserDefaults.standard.set(newId, forKey: sidKey)
        return newId
    }

    /// Called when the app launches fresh to start a new session.
    static func rotateSessionId() {
        let newId = UUID().uuidString
        UserDefaults.standard.set(newId, forKey: sidKey)
    }
}
