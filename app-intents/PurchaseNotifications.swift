import ExpoNotifications
import Foundation
import UserNotifications
import WidgetKit
internal import ExpoAppIntents

/// Varselet etter et kjøp, og svarene på knappene i det.
///
/// Knappene («Dagligvarer ✓», «Annen kategori …», «Senere») registreres fra appen med
/// expo-notifications (`src/lib/purchases.ts`). Svaret på forslaget tas imot her, fordi appens
/// JavaScript ikke kjører når man svarer uten å åpne appen. Det legges i køen som
/// `categorizePurchase`, og appen tar det neste gang den kjører. Andre svar (åpne appen) går
/// videre til expo-notifications som vanlig.
///
/// `install()` kalles fra `AppDelegate` ved oppstart (lagt inn av
/// `plugins/withPurchaseNotifications.js`), så svaret blir tatt imot også når appen bare startes
/// i bakgrunnen for å få det.
final class PurchaseNotifications: NotificationDelegate {
  static let newCategory = "purchase-new"
  static let suggestPrefix = "purchase-suggest:"
  static let approveAction = "purchase-approve"
  static let laterAction = "purchase-later"

  private static let shared = PurchaseNotifications()
  private static var installed = false

  static func install() {
    if installed {
      return
    }
    installed = true
    NotificationCenterManager.shared.addDelegate(shared)
  }

  /// Sender varselet for et nytt kjøp: med forslag hvis Vane kjenner stedet, ellers «Velg kategori».
  static func notify(purchaseId: String, amount: String, merchant: String, at date: Date) async {
    let config = PurchaseConfig.load()
    let memory = config.merchants[PurchaseText.merchantKey(merchant)]
    let name = memory?.name ?? PurchaseText.cleanMerchant(merchant)
    let amountText: String
    if let parsed = PurchaseText.parseAmount(amount) {
      amountText = PurchaseText.formatAmount(parsed.amount, currency: parsed.currency)
    } else {
      amountText = amount.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    let content = UNMutableNotificationContent()
    content.title = amountText.isEmpty ? name : "\(amountText) · \(name)"
    if let categoryId = memory?.categoryId, let categoryName = config.categories[categoryId] {
      content.body = "Forslag: \(categoryName). Hold inne for å svare."
      content.categoryIdentifier = suggestPrefix + categoryId
    } else {
      content.body = memory == nil ? "Nytt sted. Trykk for å velge kategori." : "Trykk for å velge kategori."
      content.categoryIdentifier = newCategory
    }
    content.threadIdentifier = "purchases"
    // Alt om kjøpet er med, så appen kan ta det inn fra varselet før den har lest køen.
    content.userInfo = [
      "kind": "purchase",
      "purchaseId": purchaseId,
      "amount": amount,
      "merchant": merchant,
      "at": date.timeIntervalSince1970 * 1000,
    ]
    let request = UNNotificationRequest(identifier: "purchase:\(purchaseId)", content: content, trigger: nil)
    try? await UNUserNotificationCenter.current().add(request)
  }

  func didReceive(_ response: UNNotificationResponse, completionHandler: @escaping () -> Void) -> Bool {
    let content = response.notification.request.content
    guard content.userInfo["kind"] as? String == "purchase" else {
      return false
    }
    switch response.actionIdentifier {
    case Self.approveAction:
      guard let purchaseId = content.userInfo["purchaseId"] as? String,
        content.categoryIdentifier.hasPrefix(Self.suggestPrefix)
      else {
        return true
      }
      let categoryId = String(content.categoryIdentifier.dropFirst(Self.suggestPrefix.count))
      Self.finishInBackground {
        await AppIntentDispatcher.shared.dispatch(
          name: "categorizePurchase",
          params: ["purchaseId": .string(purchaseId), "categoryId": .string(categoryId)]
        )
        WaitingCount.adjust(by: -1)
      }
      return true
    case Self.laterAction:
      return true
    default:
      // Åpne appen: expo-notifications sender svaret videre til appen.
      return false
    }
  }

  /// Gjør ferdig arbeidet selv om appen bare er startet i bakgrunnen for å ta imot svaret.
  private static func finishInBackground(_ work: @escaping @Sendable () async -> Void) {
    ProcessInfo.processInfo.performExpiringActivity(withReason: "Vane lagrer svaret på et kjøpsvarsel") { expired in
      if expired {
        return
      }
      let done = DispatchSemaphore(value: 0)
      Task {
        await work()
        done.signal()
      }
      _ = done.wait(timeout: .now() + 10)
    }
  }
}

/// Det appen sist sendte om kategorier og steder (`nativePurchaseConfig` i `src/lib/money.ts`).
struct PurchaseConfig: Decodable {
  struct Merchant: Decodable {
    let name: String?
    let categoryId: String?
  }

  let categories: [String: String]
  let merchants: [String: Merchant]

  private static let key = "vane.purchaseConfig"

  static func save(_ json: String) {
    UserDefaults.standard.set(json, forKey: key)
  }

  static func load() -> PurchaseConfig {
    guard let json = UserDefaults.standard.string(forKey: key),
      let data = json.data(using: .utf8),
      let config = try? JSONDecoder().decode(PurchaseConfig.self, from: data)
    else {
      return PurchaseConfig(categories: [:], merchants: [:])
    }
    return config
  }
}

/// Holder tallet for kjøp som venter, riktig i widgetene mens appen ikke kjører. Appen sender det
/// riktige tallet selv neste gang den synker widgetene.
enum WaitingCount {
  private static let widgets = ["PengerWidget", "TodayWidget"]

  static func adjust(by delta: Int) {
    guard let group = Bundle.main.object(forInfoDictionaryKey: "ExpoWidgetsAppGroupIdentifier") as? String,
      let defaults = UserDefaults(suiteName: group)
    else {
      return
    }
    for kind in widgets {
      // Samme lagring som expo-widgets bruker for oppslagene til widgeten.
      let key = "__expo_widgets_\(kind)_timeline"
      guard let timeline = defaults.array(forKey: key) as? [[String: Any]] else {
        continue
      }
      let patched = timeline.map { (entry: [String: Any]) -> [String: Any] in
        guard var props = entry["props"] as? [String: Any] else {
          return entry
        }
        let waiting = (props["waiting"] as? NSNumber)?.intValue ?? 0
        props["waiting"] = max(0, waiting + delta)
        var next = entry
        next["props"] = props
        return next
      }
      defaults.set(patched, forKey: key)
      WidgetCenter.shared.reloadTimelines(ofKind: kind)
    }
  }
}
