internal import ExpoAppIntents
internal import ExpoModulesCore

/// Registered Expo inline module that wires app-target App Intents code to expo-app-intents.
/// Do not change the name of this class.
final class AppIntentsSetup: Module {
  public func definition() -> ExpoModulesCore.ModuleDefinition {
    Name("AppIntentsSetup")

    OnCreate {
      // Normalt allerede gjort i AppDelegate. Gjør ingenting andre gang.
      PurchaseNotifications.install()
    }

    // Appen sender kategoriene og stedene hver gang de endres, så varselet kan foreslå riktig.
    Function("setPurchaseConfig") { (json: String) in
      PurchaseConfig.save(json)
    }
  }
}
