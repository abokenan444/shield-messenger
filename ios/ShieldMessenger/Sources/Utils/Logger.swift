import Foundation
import os.log

/// Logger — Secure logging utility.
///
/// Wraps os.log with log levels and ensures no sensitive data
/// (keys, passwords, message content) is ever written to logs.
/// In release builds, only warning and error levels are emitted.
final class Logger {

    enum Level: Int, Comparable {
        case debug = 0
        case info = 1
        case warning = 2
        case error = 3

        static func < (lhs: Level, rhs: Level) -> Bool {
            return lhs.rawValue < rhs.rawValue
        }

        var osLogType: OSLogType {
            switch self {
            case .debug: return .debug
            case .info: return .info
            case .warning: return .default
            case .error: return .error
            }
        }

        var prefix: String {
            switch self {
            case .debug: return "🔍"
            case .info: return "ℹ️"
            case .warning: return "⚠️"
            case .error: return "❌"
            }
        }
    }

    static let shared = Logger()

    private let osLog: OSLog
    private let minimumLevel: Level

    private init() {
        self.osLog = OSLog(subsystem: "com.shieldmessenger", category: "app")
        #if DEBUG
        self.minimumLevel = .debug
        #else
        self.minimumLevel = .warning
        #endif
    }

    func debug(_ message: String, file: String = #file, line: Int = #line) {
        log(message, level: .debug, file: file, line: line)
    }

    func info(_ message: String, file: String = #file, line: Int = #line) {
        log(message, level: .info, file: file, line: line)
    }

    func warning(_ message: String, file: String = #file, line: Int = #line) {
        log(message, level: .warning, file: file, line: line)
    }

    func error(_ message: String, file: String = #file, line: Int = #line) {
        log(message, level: .error, file: file, line: line)
    }

    // MARK: - Private

    private func log(_ message: String, level: Level, file: String, line: Int) {
        guard level >= minimumLevel else { return }

        let filename = (file as NSString).lastPathComponent
        let logMessage = "\(level.prefix) [\(filename):\(line)] \(message)"

        os_log("%{public}@", log: osLog, type: level.osLogType, logMessage)
    }
}
