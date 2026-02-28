import SwiftUI
import AVFoundation

/// Voice call full-screen view
struct VoiceCallView: View {
    @EnvironmentObject var callVM: CallViewModel
    @EnvironmentObject var l10n: LocalizationManager

    var body: some View {
        ZStack {
            // Background
            LinearGradient(
                colors: [Color.black, Color(red: 0.05, green: 0.1, blue: 0.05)],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            VStack(spacing: 0) {
                // Header
                callHeader

                Spacer()

                // Avatar & Info
                avatarSection

                Spacer()

                // Controls
                callControls

                Spacer()
                    .frame(height: 40)
            }
        }
    }

    // MARK: - Header

    private var callHeader: some View {
        HStack {
            HStack(spacing: 4) {
                Image(systemName: "lock.shield.fill")
                    .font(.caption2)
                    .foregroundStyle(.green)
                Text(l10n.t["call_encrypted"] ?? "Encrypted Call E2EE")
                    .font(.caption)
                    .foregroundStyle(.green.opacity(0.8))
            }

            Spacer()

            callStateLabel
        }
        .padding()
    }

    private var callStateLabel: some View {
        HStack(spacing: 4) {
            if callVM.callState == .connected {
                Circle()
                    .fill(.green)
                    .frame(width: 6, height: 6)
            }

            Text(stateText)
                .font(.caption)
                .foregroundStyle(stateColor)
        }
    }

    private var stateText: String {
        switch callVM.callState {
        case .ringing: return l10n.t["state_ringing"] ?? "Ringing..."
        case .connecting: return l10n.t["state_connecting"] ?? "Connecting..."
        case .connected: return l10n.t["state_connected"] ?? "Connected"
        case .reconnecting: return l10n.t["state_reconnecting"] ?? "Reconnecting..."
        case .ended: return l10n.t["state_ended"] ?? "Ended"
        case .failed: return l10n.t["state_failed"] ?? "Failed"
        default: return ""
        }
    }

    private var stateColor: Color {
        switch callVM.callState {
        case .ringing, .connecting: return .yellow
        case .connected: return .green
        case .reconnecting: return .orange
        case .ended: return .gray
        case .failed: return .red
        default: return .gray
        }
    }

    // MARK: - Avatar

    private var avatarSection: some View {
        VStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(.green.opacity(0.15))
                    .frame(width: 140, height: 140)

                if callVM.callState == .ringing {
                    Circle()
                        .stroke(.green.opacity(0.3), lineWidth: 2)
                        .frame(width: 160, height: 160)
                        .scaleEffect(callVM.callState == .ringing ? 1.2 : 1)
                        .animation(.easeInOut(duration: 1).repeatForever(autoreverses: true), value: callVM.callState)
                }

                Text(String(callVM.remoteName.prefix(1)))
                    .font(.system(size: 56, weight: .bold))
                    .foregroundStyle(.green)
            }

            Text(callVM.remoteName)
                .font(.title)
                .fontWeight(.semibold)
                .foregroundStyle(.white)

            if callVM.callState == .connected {
                Text(callVM.formattedDuration)
                    .font(.title3)
                    .monospacedDigit()
                    .foregroundStyle(.gray)
            } else {
                Text(stateText)
                    .font(.body)
                    .foregroundStyle(.gray)
            }

            if !callVM.audioEnabled {
                HStack(spacing: 4) {
                    Image(systemName: "mic.slash.fill")
                        .font(.caption)
                    Text(l10n.t["call_mic_muted"] ?? "Microphone Muted")
                        .font(.caption)
                }
                .foregroundStyle(.yellow)
            }
        }
    }

    // MARK: - Controls

    private var callControls: some View {
        VStack(spacing: 24) {
            HStack(spacing: 32) {
                // Mute
                CallControlButton(
                    icon: callVM.audioEnabled ? "mic.fill" : "mic.slash.fill",
                    label: callVM.audioEnabled ? (l10n.t["call_mute"] ?? "Mute") : (l10n.t["call_unmute"] ?? "Unmute"),
                    isActive: !callVM.audioEnabled,
                    action: callVM.toggleAudio
                )

                // Speaker
                CallControlButton(
                    icon: callVM.speakerOn ? "speaker.wave.3.fill" : "speaker.fill",
                    label: callVM.speakerOn ? (l10n.t["call_speaker_on"] ?? "Speaker") : (l10n.t["call_speaker_off"] ?? "Earpiece"),
                    isActive: callVM.speakerOn,
                    action: callVM.toggleSpeaker
                )

                // Upgrade to video
                CallControlButton(
                    icon: "video.fill",
                    label: l10n.t["call_video_label"] ?? "Video",
                    action: callVM.upgradeToVideo
                )
            }

            // Hangup
            Button(action: callVM.hangup) {
                ZStack {
                    Circle()
                        .fill(.red)
                        .frame(width: 72, height: 72)
                        .shadow(color: .red.opacity(0.4), radius: 12, y: 4)

                    Image(systemName: "phone.down.fill")
                        .font(.title)
                        .foregroundStyle(.white)
                }
            }
        }
    }
}

/// Video call full-screen view
struct VideoCallView: View {
    @EnvironmentObject var callVM: CallViewModel
    @EnvironmentObject var l10n: LocalizationManager

    var body: some View {
        ZStack {
            // Remote video (full screen background)
            Color.black.ignoresSafeArea()

            if callVM.callState == .connected {
                // Placeholder for remote video feed
                VStack {
                    Spacer()
                    HStack(spacing: 4) {
                        Image(systemName: "video.fill")
                            .font(.caption)
                        Text(l10n.t["call_remote_video"] ?? "Remote Video")
                            .font(.caption)
                    }
                    .foregroundStyle(.gray)
                    Spacer()
                }
            } else {
                // Connecting state — show avatar
                VStack(spacing: 16) {
                    ZStack {
                        Circle()
                            .fill(.green.opacity(0.15))
                            .frame(width: 120, height: 120)

                        Text(String(callVM.remoteName.prefix(1)))
                            .font(.system(size: 48, weight: .bold))
                            .foregroundStyle(.green)
                    }

                    Text(callVM.remoteName)
                        .font(.title2)
                        .fontWeight(.semibold)
                        .foregroundStyle(.white)

                    Text(stateText)
                        .font(.body)
                        .foregroundStyle(.gray)
                }
            }

            VStack {
                // Header
                HStack {
                    HStack(spacing: 4) {
                        Image(systemName: "lock.shield.fill")
                            .font(.caption2)
                            .foregroundStyle(.green)
                        Text(l10n.t["call_video_encrypted"] ?? "Encrypted Video Call")
                            .font(.caption)
                            .foregroundStyle(.green.opacity(0.8))
                    }

                    Spacer()

                    if callVM.callState == .connected {
                        Text(callVM.formattedDuration)
                            .font(.caption)
                            .monospacedDigit()
                            .foregroundStyle(.white)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(.ultraThinMaterial)
                            .clipShape(Capsule())
                    }
                }
                .padding()

                Spacer()

                // Local camera preview (PiP)
                HStack {
                    Spacer()
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color(red: 0.1, green: 0.1, blue: 0.1))
                        .frame(width: 120, height: 170)
                        .overlay {
                            if callVM.videoEnabled {
                                VStack {
                                    Image(systemName: "person.fill")
                                        .font(.title)
                                        .foregroundStyle(.gray)
                                    Text(l10n.t["call_you"] ?? "You")
                                        .font(.caption2)
                                        .foregroundStyle(.gray)
                                }
                            } else {
                                VStack {
                                    Image(systemName: "video.slash.fill")
                                        .font(.title3)
                                        .foregroundStyle(.gray)
                                    Text(l10n.t["call_camera_off"] ?? "Camera Off")
                                        .font(.caption2)
                                        .foregroundStyle(.gray)
                                }
                            }
                        }
                        .shadow(radius: 8)
                }
                .padding()

                // Controls
                videoControls
                    .padding(.bottom, 32)
            }
        }
    }

    private var stateText: String {
        switch callVM.callState {
        case .ringing: return l10n.t["state_ringing"] ?? "Ringing..."
        case .connecting: return l10n.t["state_connecting"] ?? "Connecting..."
        case .reconnecting: return l10n.t["state_reconnecting"] ?? "Reconnecting..."
        default: return ""
        }
    }

    private var videoControls: some View {
        VStack(spacing: 20) {
            HStack(spacing: 24) {
                // Mute
                CallControlButton(
                    icon: callVM.audioEnabled ? "mic.fill" : "mic.slash.fill",
                    label: callVM.audioEnabled ? (l10n.t["call_mute"] ?? "Mute") : (l10n.t["call_unmute"] ?? "Unmute"),
                    isActive: !callVM.audioEnabled,
                    action: callVM.toggleAudio
                )

                // Camera toggle
                CallControlButton(
                    icon: callVM.videoEnabled ? "video.fill" : "video.slash.fill",
                    label: callVM.videoEnabled ? (l10n.t["call_camera_stop"] ?? "Stop") : (l10n.t["call_camera_start"] ?? "Start"),
                    isActive: !callVM.videoEnabled,
                    action: callVM.toggleVideo
                )

                // Switch camera
                if callVM.videoEnabled {
                    CallControlButton(
                        icon: "arrow.triangle.2.circlepath.camera",
                        label: l10n.t["call_switch_camera"] ?? "Switch",
                        action: callVM.switchCamera
                    )
                }

                // Speaker
                CallControlButton(
                    icon: callVM.speakerOn ? "speaker.wave.3.fill" : "speaker.fill",
                    label: callVM.speakerOn ? (l10n.t["call_speaker_short"] ?? "Speaker") : (l10n.t["call_earpiece_short"] ?? "Earpiece"),
                    isActive: callVM.speakerOn,
                    action: callVM.toggleSpeaker
                )
            }

            // Hangup
            Button(action: callVM.hangup) {
                ZStack {
                    Circle()
                        .fill(.red)
                        .frame(width: 64, height: 64)
                        .shadow(color: .red.opacity(0.4), radius: 12, y: 4)

                    Image(systemName: "phone.down.fill")
                        .font(.title2)
                        .foregroundStyle(.white)
                }
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 16)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 24))
        .padding(.horizontal)
    }
}

/// Incoming call sheet
struct IncomingCallSheet: View {
    @EnvironmentObject var callVM: CallViewModel
    @EnvironmentObject var l10n: LocalizationManager

    var body: some View {
        VStack(spacing: 24) {
            // Avatar
            ZStack {
                Circle()
                    .fill(.green.opacity(0.15))
                    .frame(width: 100, height: 100)

                Text(String(callVM.incomingCallFrom.prefix(1)))
                    .font(.system(size: 40, weight: .bold))
                    .foregroundStyle(.green)
            }
            .scaleEffect(1.05)
            .animation(.easeInOut(duration: 1).repeatForever(autoreverses: true), value: callVM.showIncomingCall)

            Text(callVM.incomingCallFrom)
                .font(.title2)
                .fontWeight(.semibold)

            Text(callVM.incomingCallType == .video ? (l10n.t["call_incoming_video"] ?? "Incoming video call...") : (l10n.t["call_incoming_voice"] ?? "Incoming voice call..."))
                .foregroundStyle(.secondary)

            HStack(spacing: 4) {
                Image(systemName: "lock.shield.fill")
                    .font(.caption2)
                Text(l10n.t["call_e2ee_short"] ?? "Encrypted E2EE")
                    .font(.caption)
            }
            .foregroundStyle(.green)

            // Buttons
            HStack(spacing: 48) {
                // Reject
                Button(action: callVM.rejectCall) {
                    VStack(spacing: 8) {
                        ZStack {
                            Circle()
                                .fill(.red)
                                .frame(width: 64, height: 64)

                            Image(systemName: "phone.down.fill")
                                .font(.title2)
                                .foregroundStyle(.white)
                        }
                        Text(l10n.t["call_reject"] ?? "Reject")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                // Accept
                Button(action: callVM.acceptCall) {
                    VStack(spacing: 8) {
                        ZStack {
                            Circle()
                                .fill(.green)
                                .frame(width: 64, height: 64)

                            Image(systemName: callVM.incomingCallType == .video ? "video.fill" : "phone.fill")
                                .font(.title2)
                                .foregroundStyle(.white)
                        }
                        .scaleEffect(1.1)
                        .animation(.easeInOut(duration: 0.6).repeatForever(autoreverses: true), value: callVM.showIncomingCall)

                        Text(l10n.t["call_accept"] ?? "Accept")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .padding(.vertical, 32)
    }
}

/// Reusable call control button
struct CallControlButton: View {
    let icon: String
    let label: String
    var isActive: Bool = false
    let action: () -> Void

    var body: some View {
        VStack(spacing: 6) {
            Button(action: action) {
                ZStack {
                    Circle()
                        .fill(isActive ? .white : Color(.systemGray5))
                        .frame(width: 56, height: 56)

                    Image(systemName: icon)
                        .font(.title3)
                        .foregroundStyle(isActive ? .black : .primary)
                }
            }

            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }
}
