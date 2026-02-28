import Foundation

/// NetworkMonitor — Monitors network reachability and Tor connection state.
///
/// Shield Messenger routes all traffic through Tor. This helper tracks
/// whether the device has connectivity and whether the Tor circuit is established.
final class NetworkMonitor {

    enum ConnectionState {
        case disconnected
        case connecting
        case connectedDirect
        case connectedViaTor
    }

    static let shared = NetworkMonitor()

    private(set) var state: ConnectionState = .disconnected

    /// Posted when connection state changes. Object is the new ConnectionState.
    static let stateChangedNotification = Notification.Name("SL_NetworkStateChanged")

    private init() {}

    /// Update the current connection state and notify observers.
    func updateState(_ newState: ConnectionState) {
        guard state != newState else { return }
        state = newState
        NotificationCenter.default.post(
            name: Self.stateChangedNotification,
            object: newState
        )
        Logger.shared.info("Network state changed: \(newState)")
    }

    /// Whether any outbound connection is available.
    var isConnected: Bool {
        switch state {
        case .connectedDirect, .connectedViaTor:
            return true
        default:
            return false
        }
    }

    /// Whether traffic is routed through Tor.
    var isTorActive: Bool {
        return state == .connectedViaTor
    }
}
