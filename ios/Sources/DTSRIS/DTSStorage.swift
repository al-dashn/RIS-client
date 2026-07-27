import Foundation

enum DTSStorage {
    private static let uidKey = "com.dtsris.anonymousUserId"
    private static let sidKey = "com.dtsris.sessionId"
    private static let installTrackedKey = "com.dtsris.installTracked"

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

    static func hasInstallBeenTracked() -> Bool {
        return UserDefaults.standard.bool(forKey: installTrackedKey)
    }

    static func markInstallTracked() {
        UserDefaults.standard.set(true, forKey: installTrackedKey)
    }
}
