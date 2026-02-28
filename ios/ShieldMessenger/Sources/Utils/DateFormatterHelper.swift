import Foundation

/// DateFormatterHelper — Thread-safe date formatting utilities.
///
/// Caches formatters to avoid repeated allocation (DateFormatter is expensive).
/// Provides Shield Messenger–specific formats for message timestamps,
/// call logs, and relative time display.
final class DateFormatterHelper {

    static let shared = DateFormatterHelper()

    private init() {}

    // MARK: - Cached Formatters

    private lazy var timeFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "HH:mm"
        return f
    }()

    private lazy var shortDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .short
        f.timeStyle = .none
        return f
    }()

    private lazy var fullDateTimeFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .medium
        f.timeStyle = .short
        return f
    }()

    private lazy var iso8601Formatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    // MARK: - Public API

    /// Format as time only: "14:30"
    func time(from date: Date) -> String {
        return timeFormatter.string(from: date)
    }

    /// Format as short date: "12/25/24"
    func shortDate(from date: Date) -> String {
        return shortDateFormatter.string(from: date)
    }

    /// Format as full date+time: "Dec 25, 2024, 2:30 PM"
    func fullDateTime(from date: Date) -> String {
        return fullDateTimeFormatter.string(from: date)
    }

    /// Format as ISO 8601 for API/storage: "2024-12-25T14:30:00.000Z"
    func iso8601(from date: Date) -> String {
        return iso8601Formatter.string(from: date)
    }

    /// Parse an ISO 8601 string back to Date.
    func fromISO8601(_ string: String) -> Date? {
        return iso8601Formatter.date(from: string)
    }

    /// Chat-style relative timestamp:
    ///  - Today: "14:30"
    ///  - Yesterday: "Yesterday"
    ///  - This week: "Monday"
    ///  - Older: "12/25/24"
    func chatTimestamp(from date: Date) -> String {
        let calendar = Calendar.current
        let now = Date()

        if calendar.isDateInToday(date) {
            return time(from: date)
        } else if calendar.isDateInYesterday(date) {
            return "Yesterday"
        } else if let weekAgo = calendar.date(byAdding: .day, value: -6, to: now),
                  date > weekAgo {
            let weekdayFormatter = DateFormatter()
            weekdayFormatter.dateFormat = "EEEE"
            return weekdayFormatter.string(from: date)
        } else {
            return shortDate(from: date)
        }
    }

    /// Duration string: "2:05" or "1:23:45"
    func duration(seconds: Int) -> String {
        let hours = seconds / 3600
        let minutes = (seconds % 3600) / 60
        let secs = seconds % 60

        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, secs)
        } else {
            return String(format: "%d:%02d", minutes, secs)
        }
    }
}
