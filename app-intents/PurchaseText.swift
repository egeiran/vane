import Foundation

/// Stedsnavn og beløp til varselet. Gjør det samme som `merchantKey`, `cleanMerchant`,
/// `parseAmount` og `formatAmount` i `src/lib/money.ts`. Eksemplene står i testene der
/// (`src/lib/__tests__/money.test.ts`). Endrer du noe her, endre det der også.
enum PurchaseText {
  private static let keyPunctuation = Set("!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~")
  private static let wordBreaks: Set<Character> = [" ", "-", "/", "&", "("]
  private static let droppedLast: Set<String> = ["NO", "NOR", "NORGE", "NORWAY", "AS", "ASA"]

  /// Store bokstaver, uten mellomrom og ASCII-tegnsetting: «Rema 1000» og «REMA-1000» blir «REMA1000».
  static func merchantKey(_ raw: String) -> String {
    let upper = raw.precomposedStringWithCompatibilityMapping.uppercased()
    return String(upper.filter { !$0.isWhitespace && !keyPunctuation.contains($0) })
  }

  /// «SUMUP *KAFE FUGLEN 0123456 NO» blir «Kafe Fuglen».
  static func cleanMerchant(_ raw: String) -> String {
    var s = raw.precomposedStringWithCompatibilityMapping
      .components(separatedBy: .whitespacesAndNewlines)
      .filter { !$0.isEmpty }
      .joined(separator: " ")
    if let star = s.lastIndex(of: "*") {
      let after = s[s.index(after: star)...].trimmingCharacters(in: .whitespaces)
      if !after.isEmpty {
        s = after
      }
    }
    var words = s.split(separator: " ").map(String.init).filter { (word: String) -> Bool in
      if word.count >= 5 && isAsciiDigits(word) {
        return false
      }
      if word.count >= 2 && word.hasPrefix("#") && isAsciiDigits(String(word.dropFirst())) {
        return false
      }
      return true
    }
    while words.count > 1, let last = words.last, droppedLast.contains(last) {
      words.removeLast()
    }
    s = words.joined(separator: " ")
    if s == s.uppercased() && s.contains(where: { $0.isCased }) {
      s = titleCased(s)
    }
    if !s.isEmpty {
      return s
    }
    let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
    return trimmed.isEmpty ? "Ukjent sted" : trimmed
  }

  /// «kr 149,00», «1 234,50 kr», «149,-», «€12.50». Gir øre og valuta, eller nil uten tall.
  static func parseAmount(_ text: String) -> (amount: Int, currency: String)? {
    let s = text.precomposedStringWithCompatibilityMapping
    guard let start = s.firstIndex(where: { $0.isASCII && $0.isNumber }) else {
      return nil
    }
    var number = ""
    for ch in s[start...] {
      if ch.isASCII && ch.isNumber {
        number.append(ch)
      } else if ch == "," || ch == "." {
        number.append(ch)
      } else if ch == " " || ch == "'" {
        continue
      } else {
        break
      }
    }
    while let last = number.last, last == "," || last == "." {
      number.removeLast()
    }
    var whole = number
    var fraction = ""
    if let sep = number.lastIndex(where: { $0 == "," || $0 == "." }) {
      let after = String(number[number.index(after: sep)...])
      if after.count != 3 {
        whole = String(number[..<sep])
        fraction = after
      }
    }
    let kroner = Int(whole.filter { $0 != "," && $0 != "." }) ?? 0
    let ore = fraction.isEmpty ? 0 : Int(((Double("0." + fraction) ?? 0) * 100).rounded())
    return (amount: kroner * 100 + ore, currency: currency(in: s))
  }

  /// «149 kr», «1 234,50 kr», «12,50 EUR».
  static func formatAmount(_ amount: Int, currency: String = "NOK") -> String {
    let value = amount < 0 ? -amount : amount
    let digits = String(value / 100)
    var grouped = ""
    for (i, ch) in digits.enumerated() {
      if i > 0 && (digits.count - i) % 3 == 0 {
        grouped.append("\u{00A0}")
      }
      grouped.append(ch)
    }
    let ore = value % 100
    let number = ore == 0 ? grouped : grouped + "," + (ore < 10 ? "0\(ore)" : "\(ore)")
    return number + "\u{00A0}" + (currency == "NOK" ? "kr" : currency)
  }

  private static func isAsciiDigits(_ s: String) -> Bool {
    return !s.isEmpty && s.allSatisfy { $0.isASCII && $0.isNumber }
  }

  private static func titleCased(_ s: String) -> String {
    var out = ""
    var start = true
    for ch in s.lowercased() {
      out += start && ch.isCased ? String(ch).uppercased() : String(ch)
      start = wordBreaks.contains(ch)
    }
    return out
  }

  /// En valutakode med tre store bokstaver, ellers et valutategn, ellers kroner.
  private static func currency(in s: String) -> String {
    let chars = Array(s)
    let isUpper = { (c: Character) -> Bool in c.isASCII && c.isUppercase }
    let isLetter = { (c: Character) -> Bool in c.isASCII && c.isLetter }
    var i = 0
    while i + 3 <= chars.count {
      let before = i == 0 || !isLetter(chars[i - 1])
      let after = i + 3 == chars.count || !isLetter(chars[i + 3])
      if before && after && isUpper(chars[i]) && isUpper(chars[i + 1]) && isUpper(chars[i + 2]) {
        return String(chars[i..<(i + 3)])
      }
      i += 1
    }
    if s.contains("€") {
      return "EUR"
    }
    if s.contains("$") {
      return "USD"
    }
    if s.contains("£") {
      return "GBP"
    }
    return "NOK"
  }
}
