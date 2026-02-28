import Foundation
import AVFoundation
import WebRTC
import Combine

/// Call types and states
enum CallType {
    case voice
    case video
}

enum CallDirection {
    case outgoing
    case incoming
}

enum CallState: Equatable {
    case idle
    case ringing
    case connecting
    case connected
    case reconnecting
    case ended
    case failed(String)
}

/// WebRTC-based call manager for encrypted voice and video calls
@MainActor
class CallViewModel: ObservableObject {
    @Published var callState: CallState = .idle
    @Published var callType: CallType = .voice
    @Published var callDirection: CallDirection = .outgoing
    @Published var remoteName: String = ""
    @Published var duration: Int = 0
    @Published var audioEnabled: Bool = true
    @Published var videoEnabled: Bool = false
    @Published var speakerOn: Bool = false
    @Published var showIncomingCall: Bool = false
    @Published var incomingCallFrom: String = ""
    @Published var incomingCallType: CallType = .voice
    @Published var callLog: [CallLogEntry] = CallLogEntry.mockData()

    private var durationTimer: Timer?
    private var callId: String = ""
    private var callStartTime: Date?

    var isActive: Bool {
        switch callState {
        case .idle, .ended, .failed:
            return false
        default:
            return true
        }
    }

    var formattedDuration: String {
        let h = duration / 3600
        let m = (duration % 3600) / 60
        let s = duration % 60
        if h > 0 {
            return String(format: "%d:%02d:%02d", h, m, s)
        }
        return String(format: "%d:%02d", m, s)
    }

    // MARK: - Call Control

    func startCall(userId: String, displayName: String, type: CallType) {
        guard !isActive else { return }

        callId = UUID().uuidString
        callType = type
        callDirection = .outgoing
        remoteName = displayName
        audioEnabled = true
        videoEnabled = type == .video
        callState = .ringing

        // Request media permissions
        requestMediaPermissions(for: type)

        // Simulate connection (in production, WebRTC signaling via Tor)
        Task {
            try? await Task.sleep(nanoseconds: 2_000_000_000)
            if callState == .ringing {
                callState = .connecting
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                if callState == .connecting {
                    callState = .connected
                    startDurationTimer()
                }
            }
        }
    }

    func receiveIncomingCall(from: String, type: CallType) {
        guard !isActive else { return }

        callId = UUID().uuidString
        incomingCallFrom = from
        incomingCallType = type
        showIncomingCall = true
    }

    func acceptCall() {
        guard showIncomingCall else { return }

        callType = incomingCallType
        callDirection = .incoming
        remoteName = incomingCallFrom
        audioEnabled = true
        videoEnabled = incomingCallType == .video
        showIncomingCall = false
        callState = .connecting

        requestMediaPermissions(for: callType)

        Task {
            try? await Task.sleep(nanoseconds: 1_000_000_000)
            if callState == .connecting {
                callState = .connected
                startDurationTimer()
            }
        }
    }

    func rejectCall() {
        if showIncomingCall {
            addCallLog(missed: true)
        }
        showIncomingCall = false
        endCall()
    }

    func hangup() {
        addCallLog(missed: false)
        endCall()
    }

    func toggleAudio() {
        audioEnabled.toggle()
    }

    func toggleVideo() {
        videoEnabled.toggle()
    }

    func toggleSpeaker() {
        speakerOn.toggle()
        let session = AVAudioSession.sharedInstance()
        try? session.overrideOutputAudioPort(speakerOn ? .speaker : .none)
    }

    func switchCamera() {
        // In production, switch between front and back camera
    }

    func upgradeToVideo() {
        if callType == .voice && isActive {
            callType = .video
            videoEnabled = true
        }
    }

    // MARK: - Private

    private func requestMediaPermissions(for type: CallType) {
        AVAudioSession.sharedInstance().requestRecordPermission { _ in }
        if type == .video {
            AVCaptureDevice.requestAccess(for: .video) { _ in }
        }
    }

    private func startDurationTimer() {
        callStartTime = Date()
        duration = 0
        durationTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.duration += 1
            }
        }
    }

    private func endCall() {
        durationTimer?.invalidate()
        durationTimer = nil
        callState = .ended
        duration = 0
        callStartTime = nil

        // Reset to idle after a brief delay
        Task {
            try? await Task.sleep(nanoseconds: 500_000_000)
            callState = .idle
        }
    }

    private func addCallLog(missed: Bool) {
        let entry = CallLogEntry(
            id: UUID().uuidString,
            displayName: showIncomingCall ? incomingCallFrom : remoteName,
            type: showIncomingCall ? incomingCallType : callType,
            direction: showIncomingCall ? .incoming : callDirection,
            duration: duration,
            timestamp: callStartTime ?? Date(),
            missed: missed
        )
        callLog.insert(entry, at: 0)
    }
}

// MARK: - Call Log Data

struct CallLogEntry: Identifiable {
    let id: String
    let displayName: String
    let type: CallType
    let direction: CallDirection
    let duration: Int
    let timestamp: Date
    let missed: Bool

    var formattedDuration: String {
        guard duration > 0 else { return "" }
        let m = duration / 60
        let s = duration % 60
        return String(format: "%d:%02d", m, s)
    }

    static func mockData() -> [CallLogEntry] {
        [
            CallLogEntry(
                id: "1",
                displayName: "أحمد محمد",
                type: .voice,
                direction: .incoming,
                duration: 180,
                timestamp: Date().addingTimeInterval(-3600),
                missed: false
            ),
            CallLogEntry(
                id: "2",
                displayName: "سارة أحمد",
                type: .video,
                direction: .outgoing,
                duration: 420,
                timestamp: Date().addingTimeInterval(-7200),
                missed: false
            ),
            CallLogEntry(
                id: "3",
                displayName: "أحمد محمد",
                type: .voice,
                direction: .incoming,
                duration: 0,
                timestamp: Date().addingTimeInterval(-86400),
                missed: true
            ),
        ]
    }
}
