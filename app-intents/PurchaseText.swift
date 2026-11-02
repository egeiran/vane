import Foundation

/// Stedsnavn og beløp til varselet. Gjør det samme som `merchantKey`, `cleanMerchant`,
/// `parseAmount` og `formatAmount` i `src/lib/money.ts`. Eksemplene står i testene der
/// (`src/lib/__tests__/money.test.ts`). Endrer du noe her, endre det der også.
enum PurchaseText {
  private static let keyPunctuation = Set("!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~")
  private static let wordBreaks: Set<Character> = [" ", "-", "/", "&", "("]
  private static let droppedLast: Set<String> = ["NO", "NOR", "NORGE", "NORWAY", "AS", "ASA"]

  /// Valutaer som skrives med `$`. Er hovedvalutaen en av dem, betyr `$` hovedvalutaen (`DOLLARS`).
  static let dollars: Set<String> = ["USD", "CAD", "AUD", "NZD", "SGD", "HKD"]
  /// Valutaer som skrives «kr» (`KRONER`).
  static let kroner: Set<String> = ["NOK", "SEK", "DKK", "ISK"]
  /// Dollar med landskode foran, slik iOS skriver dollar fra andre land: «US$», «CA$», «A$»
  /// (`DOLLAR_PREFIXES`).
  private static let dollarPrefixes: [String: String] = [
    "US": "USD", "CA": "CAD", "A": "AUD", "AU": "AUD", "NZ": "NZD",
    "HK": "HKD", "S": "SGD", "SG": "SGD", "MX": "MXN", "R": "BRL",
  ]
  /// Tegnet foran beløpet på engelsk (`SYMBOLS`). Andre valutaer skrives med koden.
  private static let symbols: [String: String] = ["USD": "$", "EUR": "€", "GBP": "£"]

  /// Stedet når et kjøp ikke har noe. Lagres alltid slik (som `UNKNOWN_PLACE` i money.ts), og vises
  /// oversatt i varselet.
  static let unknownPlace = "Ukjent sted"

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
    var words = s.split(separator: " ").map { String($0) }.filter { (word: String) -> Bool in
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
    return trimmed.isEmpty ? unknownPlace : trimmed
  }

  /// «kr 149,00», «1 234,50 kr», «149,-», «€12.50», «12,50 €», «$1,234.50». Gir hundredeler og
  /// valuta (hovedvalutaen `main` hvis ingen er nevnt), eller nil uten tall eller med over 15 siffer.
  ///
  /// Samme tilfeller som testene for `parseAmount` i `src/lib/__tests__/money.test.ts`, for eksempel:
  /// - «$12.50» med main USD → 1250 USD, med main CAD → 1250 CAD, med main NOK → 1250 USD
  /// - «12,50 €» → 1250 EUR, «£3.20» → 320 GBP, «1,234.50» → 123450 i main
  /// - «kr 149» med main SEK → 14900 SEK, med main USD → 14900 NOK, «149» med main USD → 14900 USD
  /// - «US$12.50» med main CAD → USD, «CA$12.50» med main USD → CAD, «A$5» → AUD, «R$ 10,00» → BRL
  static func parseAmount(_ text: String, main: String = "NOK") -> (amount: Int, currency: String)? {
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
    let digits = whole.filter { $0 != "," && $0 != "." }
    // Over 15 siffer er ikke et beløp, og ville gitt overflyt.
    if digits.count > 15 {
      return nil
    }
    let kroner = Int(digits) ?? 0
    let fractionValue = Double("0." + fraction) ?? 0
    let ore = fraction.isEmpty ? 0 : Int((fractionValue * 100).rounded())
    return (amount: kroner * 100 + ore, currency: currency(in: s, main: main))
  }

  /// Norsk: «149 kr», «1 234,50 kr», «12,50 EUR». Engelsk: «$1,234.50», «€12.50», «NOK 149».
  /// Som `formatAmount` i money.ts.
  static func formatAmount(_ amount: Int, currency: String = "NOK", english: Bool = false) -> String {
    let value = amount < 0 ? -amount : amount
    let digits = String(value / 100)
    let separator: Character = english ? "," : "\u{00A0}"
    var grouped = ""
    for (i, ch) in digits.enumerated() {
      if i > 0 && (digits.count - i) % 3 == 0 {
        grouped.append(separator)
      }
      grouped.append(ch)
    }
    let ore = value % 100
    let fraction = ore == 0 ? "" : (ore < 10 ? "0\(ore)" : "\(ore)")
    if english {
      let number = fraction.isEmpty ? grouped : grouped + "." + fraction
      if let symbol = symbols[currency] {
        return symbol + number
      }
      return currency + "\u{00A0}" + number
    }
    let number = fraction.isEmpty ? grouped : grouped + "," + fraction
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

  /// En valutakode med tre store bokstaver, ellers et valutategn, ellers hovedvalutaen. «US$», «CA$»
  /// osv. er den dollaren. En `$` alene er hovedvalutaen når den er en dollar (ellers USD), og «kr»
  /// når den er en krone (ellers NOK).
  private static func currency(in s: String, main: String) -> String {
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
    // Første `$` med store bokstaver rett foran: de én eller to siste av dem er landskoden.
    for (j, c) in chars.enumerated() where c == "$" && j > 0 && isUpper(chars[j - 1]) {
      let start = j >= 2 && isUpper(chars[j - 2]) ? j - 2 : j - 1
      if let code = dollarPrefixes[String(chars[start..<j])] {
        return code
      }
      break
    }
    if s.contains("€") {
      return "EUR"
    }
    if s.contains("$") {
      return dollars.contains(main) ? main : "USD"
    }
    if s.contains("£") {
      return "GBP"
    }
    if s.range(of: "kr", options: .caseInsensitive) != nil {
      return kroner.contains(main) ? main : "NOK"
    }
    return main
  }
}
