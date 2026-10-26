import AppIntents
import Foundation
internal import ExpoAppIntents

/// «Registrer kjøp»: kjøres av en automatisering i Snarveier (Transaksjon) når man betaler med
/// Apple Pay. Kjøpet legges i køen til appen, og et varsel spør om kategori. Appen åpnes ikke.
///
/// Navnet på kallet og nøklene må være de samme som i `src/lib/purchaseIntents.ts`. Ikke endre
/// typenavnet eller parameterne: da slutter automatiseringer som allerede er satt opp, å virke.
struct LogPurchaseIntent: AppIntent {
  static let title: LocalizedStringResource = "Registrer kjøp"
  static let openAppWhenRun: Bool = false

  @Parameter(title: "Beløp", requestValueDialog: "Hvor mye kostet det?")
  var amount: String

  @Parameter(title: "Sted", requestValueDialog: "Hvor handlet du?")
  var merchant: String

  static var parameterSummary: some ParameterSummary {
    Summary("Registrer \(\.$amount) hos \(\.$merchant)")
  }

  @MainActor
  func perform() async throws -> some IntentResult {
    // Før kjøpet legges i køen: kjører appen, synker den widgetene med riktig tall straks etterpå.
    WaitingCount.adjust(by: 1)
    let purchaseId = await AppIntentDispatcher.shared.dispatch(
      name: "logPurchase",
      params: ["amount": .string(amount), "merchant": .string(merchant)]
    )
    await PurchaseNotifications.notify(purchaseId: purchaseId, amount: amount, merchant: merchant, at: Date())
    return .result()
  }
}
