import Foundation

/// PasswordValidator — Password strength validation.
///
/// Enforces Shield Messenger password policy:
///  - Minimum 12 characters
///  - At least one uppercase letter
///  - At least one lowercase letter
///  - At least one digit
///  - At least one special character
///  - Not in the common passwords list
final class PasswordValidator {

    struct ValidationResult {
        let isValid: Bool
        let errors: [String]
        let strength: Strength
    }

    enum Strength: Int, Comparable {
        case weak = 0
        case fair = 1
        case good = 2
        case strong = 3

        static func < (lhs: Strength, rhs: Strength) -> Bool {
            return lhs.rawValue < rhs.rawValue
        }
    }

    static let shared = PasswordValidator()

    private let minimumLength = 12

    private let commonPasswords: Set<String> = [
        "password123456", "123456789012", "qwertyuiopas",
        "abcdefghijkl", "password1234", "admin1234567",
    ]

    private init() {}

    /// Validate a password and return detailed results.
    func validate(_ password: String) -> ValidationResult {
        var errors: [String] = []
        var score = 0

        // Length check
        if password.count < minimumLength {
            errors.append("Must be at least \(minimumLength) characters")
        } else {
            score += 1
        }

        // Uppercase
        if password.rangeOfCharacter(from: .uppercaseLetters) == nil {
            errors.append("Must contain at least one uppercase letter")
        } else {
            score += 1
        }

        // Lowercase
        if password.rangeOfCharacter(from: .lowercaseLetters) == nil {
            errors.append("Must contain at least one lowercase letter")
        } else {
            score += 1
        }

        // Digit
        if password.rangeOfCharacter(from: .decimalDigits) == nil {
            errors.append("Must contain at least one digit")
        } else {
            score += 1
        }

        // Special character
        let specialChars = CharacterSet.alphanumerics.inverted
        if password.unicodeScalars.first(where: { specialChars.contains($0) }) == nil {
            errors.append("Must contain at least one special character")
        } else {
            score += 1
        }

        // Bonus for length
        if password.count >= 16 { score += 1 }
        if password.count >= 20 { score += 1 }

        // Common password check
        if commonPasswords.contains(password.lowercased()) {
            errors.append("This password is too common")
            score = 0
        }

        let strength: Strength
        switch score {
        case 0...2: strength = .weak
        case 3...4: strength = .fair
        case 5...6: strength = .good
        default: strength = .strong
        }

        return ValidationResult(
            isValid: errors.isEmpty,
            errors: errors,
            strength: strength
        )
    }
}
