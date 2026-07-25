# DTS RIS Client SDKs

Client libraries for iOS, Android, and Web that automatically capture
anonymous user-journey events and send them to the DTS RIS ingestion endpoint.

All SDKs are **zero-PII by design** — no personally identifiable information
is collected under any code path.

---

## 🚀 Quick Start

### Web

```bash
npm install @dtsris/web-sdk
```

```js
import { DTSTracker } from '@dtsris/web-sdk';
const tracker = new DTSTracker({ apiKey: '...', endpointUrl: '...' });
tracker.start();
```

### iOS (Swift Package Manager)

1. Xcode → File → Add Packages → `https://github.com/your-org/ris-client`
2. Pick the `ios` target

```swift
import DTSRIS
DTSTracker.initialize(config: DTSConfig(apiKey: "...", endpointUrl: "...")).start()
```

### Android (JitPack)

Add to `settings.gradle.kts`:
```kotlin
maven { url = uri("https://jitpack.io") }
```

Add to module `build.gradle.kts`:
```kotlin
implementation("com.github.your-org:ris-client:0.2.0")
```

---

## 📦 Event Types

| Event           | Description                                    | Web | Android | iOS |
|-----------------|------------------------------------------------|:---:|:---:|:---:|
| `screen_view`   | Page/screen navigation                         | ✓ | ✓ | ✓ |
| `click`         | CTA, link, button clicks                       | ✓ | — | — |
| `form_submit`   | Form submissions (names only, no values)       | ✓ | — | — |
| `scroll_depth`  | Scroll milestones (25/50/75/90/100%)           | ✓ | — | — |
| `web_vital`     | LCP, FCP, CLS, TTFB, INP                      | ✓ | — | — |
| `cart_update`   | Cart add/remove/modify                         | ✓ | ✓ | ✓ |
| `customization` | Product attribute change                       | ✓ | ✓ | ✓ |
| `error`         | Unhandled exceptions & crash indicators        | ✓ | ✓ | ✓ |
| `identify`      | Link anonymous → logged-in user                | ✓ | ✓ | ✓ |
| `app_foreground`| App returns to foreground                      | — | ✓ | ✓ |
| `app_background`| App enters background                          | — | ✓ | ✓ |

---

## 🌐 Web SDK API

### Constructor

```ts
new DTSTracker({
  apiKey: string,                  // required
  endpointUrl: string,             // required
  maxRetries?: number,             // default 5
  maxBatchSize?: number,           // default 20
  flushIntervalMs?: number,        // default 5000
  autoCaptureClicks?: boolean,     // default true
  autoCaptureForms?: boolean,      // default true
  autoCaptureScroll?: boolean,     // default true
  autoCapturePerformance?: boolean,// default true
  consentRequired?: boolean,       // default false
})
```

### Methods

```ts
tracker.start()                       // Begin auto-capture + flush loop
tracker.track('checkout', { ... })    // Manual event
tracker.identify('user-123', { plan: 'pro' })  // Link identity
tracker.resetIdentity()               // On logout
tracker.grantConsent(['analytics'])   // GDPR consent
tracker.revokeConsent()               // Revoke consent
tracker.flush()                       // Force send now
tracker.dispose()                     // Shutdown
```

### CDN

```html
<script src="https://cdn.example.com/dtsris-tracker.umd.js"></script>
<script>
  new DTSRIS.DTSTracker({ apiKey: '...', endpointUrl: '...' }).start();
</script>
```

---

## 🍎 iOS SDK API

### Initialization

```swift
DTSTracker.initialize(config: DTSConfig(
    apiKey: "...",
    endpointUrl: "...",
    maxRetries: 5,          // optional, default 5
    maxBatchSize: 20,       // optional, default 20
    flushInterval: 5.0      // optional, default 5.0
)).start()
```

### Methods

```swift
DTSTracker.shared?.track(type: .screenView, page: "Home", properties: [:])
DTSTracker.shared?.track(eventType: "custom", page: "", properties: ["key": .string("val")])
DTSTracker.shared?.identify(userId: "user-123", traits: ["plan": .string("pro")])
DTSTracker.shared?.resetIdentity()
DTSTracker.shared?.trackCartAction(action: "add", productId: "p-1", quantity: 2)
DTSTracker.shared?.trackCustomization(attribute: "color", oldValue: "red", newValue: "blue")
DTSTracker.shared?.trackError(someError)
DTSTracker.shared?.flush()
DTSTracker.shared?.dispose()
```

---

## 🤖 Android SDK API

### Initialization

```kotlin
val tracker = DTSTracker.initialize(application, DTSConfig(
    apiKey = "...",
    endpointUrl = "...",
    maxRetries = 5,
    maxBatchSize = 20,
    flushIntervalMs = 5000L,
    allowInsecureSsl = false
))
tracker.start()
```

### Methods

```kotlin
DTSTracker.getInstance().track(DTSEventType.SCREEN_VIEW, "Home", mapOf())
DTSTracker.getInstance().track("custom_event", "", mapOf("key" to "val"))
DTSTracker.getInstance().identify("user-123", mapOf("plan" to "pro"))
DTSTracker.getInstance().resetIdentity()
DTSTracker.getInstance().cartCapture.capture("add", "p-1", 2)
DTSTracker.getInstance().customizationCapture.capture("color", "red", "blue")
DTSTracker.getInstance().errorCapture.captureMessage("Payment timeout")
DTSTracker.getInstance().dispose()
```

---

## 🔁 How It Works

```
SDK (client) → POST /events (X-API-Key) → Redis Stream → PostgreSQL JSONB
```

1. SDK auto-captures or receives `track()` calls
2. Events batched in memory, flushed every 5s (default)
3. Sent as `POST /events` → `{ "events": [{...}] }`
4. Exponential backoff retry on failure
5. **Mobile only**: offline buffering, network-adaptive batching

---

## 🚢 Releasing

```bash
# 1. Bump versions:
#    web/package.json → "version"
#    DTSRIS.podspec    → s.version
#    android/sdk/build.gradle.kts → VERSION_NAME

# 2. Tag & push
git tag vX.Y.Z && git push origin vX.Y.Z

# 3. Publish
npm publish --access public          # Web
pod trunk push DTSRIS.podspec        # iOS CocoaPods
# Android: JitPack auto-builds from tag
```
