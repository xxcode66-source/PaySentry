# PaySentry — Android (native)

Native Kotlin + Jetpack Compose port of PaySentry. Talks to the **same live contracts**
on QDay Aevum Testnet — no backend, no database, the chain is the source of truth.

> Status: **foundation + home screen done.** Core flows (verify / pay / registry /
> sessions / audit) are wired through `PaySentryClient` (web3j) and being surfaced in
> screens incrementally.

## Requirements to build

- **Android Studio** (Hedgehog / Iguana or newer) — it bundles the Gradle wrapper & JDK.
- JDK 17, Android SDK 34, minSdk 26.
- Android Studio will auto-generate the Gradle wrapper on first open (`Sync`).

## Project layout

```
android/
├── build.gradle.kts / settings.gradle.kts / gradle.properties
└── app/src/main/
    ├── AndroidManifest.xml
    ├── java/com/paysentry/app/
    │   ├── MainActivity.kt
    │   ├── data/
    │   │   ├── ChainConfig.kt     # RPC + live contract addresses
    │   │   ├── Models.kt          # MatchResult, verdicts, sessions
    │   │   └── PaySentryClient.kt # web3j wrapper (read/write)
    │   └── ui/
    │       ├── theme/             # dark palette, shapes, typography
    │       └── screens/           # Compose screens
    └── res/                       # strings, themes, launcher
```

## Open & run

1. Open this `android/` folder in Android Studio (open `settings.gradle.kts`).
2. Let Gradle sync (first run downloads dependencies — a few minutes).
3. Run on an emulator (API 26+) or a physical device with a testnet private key
   (wallet wiring uses `Credentials.create(privateKey)` — set it in `PaySentryClient`).

## Chain / contracts (live testnet)

| | Address |
|---|---|
| QDay Aevum Testnet RPC | `https://rpc-test.qday.info` (chain 44005) |
| PayeeRegistry | `0xfFB0288590944e42aFF84033a8FF5A6c35d34b22` |
| PaymentGuard | `0x47e29aB215712b887F3A642d9ba60Df8d6F83828` |
| tUSD8 | `0x456569838f1d43009A91ebA4263147Afd7233483` |

## Notes

- web3j `4.10.3` does `eth_call` for reads and `RawTransactionManager` for writes.
- Writing requires a funded testnet key (tQDAY for gas). Never commit a real key.
- The web app (`app/`) and `sdk/` are unaffected — this is a standalone project.