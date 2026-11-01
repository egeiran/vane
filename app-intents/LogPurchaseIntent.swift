import AppIntents
import Foundation
internal import ExpoAppIntents

/// «Registrer kjøp»: kjøres av en automatisering i Snarveier (Transaksjon) når man betaler med
/// Apple Pay. Kjøpet legges i køen til appen, og et varsel spør om kategori. Appen åpnes ikke.
///
/// Navnet på kallet og nøklene må være de samme som i `src/lib/purchaseIntents.ts`. Ikke endre
/// typenavnet eller navnene på parameterne: da slutter automatiseringer som allerede er satt opp,
/// å virke.
///
/// Begge parameterne er valgfrie. En automatisering kan ikke spørre om noe, så mangler et beløp
/// eller et sted i transaksjonen, ville en påkrevd parameter fått hele automatiseringen til å
/// feile. Da registreres kjøpet likevel, og man fyller inn resten i appen.
struct LogPurchaseIntent: AppIntent {
  static let title: LocalizedStringResource = "Registrer kjøp"
  static let openAppWhenRun: Bool = false

  @Parameter(title: "Beløp")
  var amount: String?

  @Parameter(title: "Sted")
  var merchant: String?

  static var parameterSummary: some ParameterSummary {
    Summary("Registrer \(\.$amount) hos \(\.$merchant)")
  }

  @MainActor
  func perform() async throws -> some IntentResult {
    // Før kjøpet legges i køen: kjører appen, synker den widgetene med riktig tall straks etterpå.
    WaitingCount.adjust(by: 1)
    let amountText = amount ?? ""
    let merchantText = merchant ?? ""
    let purchaseId = await AppIntentDispatcher.shared.dispatch(
      name: "logPurchase",
      params: ["amount": .string(amountText), "merchant": .string(merchantText)]
    )
    await PurchaseNotifications.notify(purchaseId: purchaseId, amount: amountText, merchant: merchantText, at: Date())
    return .result()
  }
}
