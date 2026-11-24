# PaySentry Android ProGuard (default — no minify, rules kept for future use)
-keep class org.web3j.** { *; }
-dontwarn okhttp3.**
-dontwarn org.slf4j.**