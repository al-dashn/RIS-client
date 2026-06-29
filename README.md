# DTS RIS Client SDKs

Client libraries for iOS, Android, and Web that automatically capture
anonymous user-journey events and send them to the DTS RIS ingestion endpoint.

All SDKs are **zero-PII by design** — no personally identifiable information
is collected under any code path. Anonymous user and session identifiers are
random UUIDs generated locally. Error messages are scrubbed before transmission.

---

## Platforms

| Platform  | Directory    | Language              | Min Version        |
|-----------|--------------|-----------------------|--------------------|
| Web       | `web/`       | TypeScript (ES2020)   | All modern browsers |
| iOS       | `ios/`       | Swift 5.9+            | iOS 15+ / macOS 12+ |
| Android   | `android/`   | Kotlin                | API 24+ (Android 7) |

---

## Event Types

| Event           | Description                                    | Auto-captured |
|-----------------|------------------------------------------------|:---:|
| `screen_view`   | Page navigation (web) / screen appearance (mobile) | ✓ |
| `cart_update`   | Add, remove, or modify items in cart             | ✓ |
| `customization` | Product attribute or configuration change        | ✓ |
| `error`         | Unhandled exceptions and crash indicators        | ✓ |

Additional event properties may be attached manually via the `track()` method.

---

## Web SDK

### Installation

```bash
npm install @dtsris/web-sdk
```

Or include directly from your CDN of choice. The SDK has zero runtime dependencies.

### Initialization

```typescript
import { DTSTracker } from '@dtsris/web-sdk';

const tracker = new DTSTracker({
  apiKey: '<your-tenant-api-key>',
  endpointUrl: '<your-ingestion-base-url>',
  // Optional overrides:
  maxRetries: 5,           // default 5
  maxBatchSize: 20,        // default 20
  flushIntervalMs: 5000,   // default 5000 (5 seconds)
});

tracker.start();
```

**Parameters:**

| Parameter          | Required | Default | Description                                   |
|--------------------|:--------:|---------|-----------------------------------------------|
| `apiKey`           | Yes      | —       | Tenant API key for the ingestion endpoint      |
| `endpointUrl`      | Yes      | —       | Base URL of the ingestion API (e.g. `https://ingestion.example.com/v1`) |
| `maxRetries`       | No       | `5`     | Maximum retry attempts per flush               |
| `maxBatchSize`     | No       | `20`    | Events queued before immediate flush           |
| `flushIntervalMs`  | No       | `5000`  | Interval in ms between automatic flushes       |

### Event Capture

**Auto-capture** is enabled automatically when `start()` is called:

- `screen_view` fires on page load and on all SPA navigation (pushState, replaceState, popstate, hashchange). Query strings and fragments are stripped to avoid accidental PII.
- `cart_update` fires when a user clicks an element annotated with `data-dtsris-cart-action`. You can add `data-dtsris-product-id` and `data-dtsris-quantity` to the same element.
- `customization` fires when an attribute changes on any element bearing `data-dtsris-customize`.
- `error` fires on `window.onerror` and `unhandledrejection`. Message content is automatically scrubbed (emails, phone numbers, SSNs redacted).

**Manual tracking:**

```typescript
// Basic event
tracker.track('screen_view', { section: 'pricing' });

// Cart action
tracker.track('cart_update', {
  action: 'remove',
  productId: 'prod-123',
  quantity: 2,
});

// Customization
tracker.track('customization', {
  attribute: 'color',
  oldValue: 'red',
  newValue: 'blue',
});

// Error (message will be scrubbed)
tracker.track('error', { message: 'Checkout failed', source: 'manual' });
```

**Annotating elements for auto-capture:**

```html
<button
  data-dtsris-cart-action="add"
  data-dtsris-product-id="prod-456"
  data-dtsris-quantity="1"
>
  Add to Cart
</button>

<select data-dtsris-customize>
  <option value="small">Small</option>
  <option value="large">Large</option>
</select>
```

### Immediate Flush & Disposal

```typescript
// Flush queued events immediately (returns Promise)
await tracker.flush();

// Stop all capture and flush remaining events
tracker.dispose();
```

### Idempotency

Every event carries a unique UUID (`eventId`) generated at creation time.
If a batch is retried due to network failure, the ingestion API deduplicates
by `eventId` — the same event will never be recorded twice.

### Consent Configuration

This SDK is zero-PII by default. If your tenant has PII consent enabled,
you can send PII fields in event properties. The ingestion API validates
that the tenant's consent covers the requested fields before storing them.

PII consent is managed server-side via the Dashboard or API. No SDK changes
are needed — the SDK continues to send events normally, and the backend
handles PII filtering based on consent state.

---

## iOS SDK

### Installation

**Swift Package Manager (SPM):**

Add the following to your `Package.swift`:

```swift
.package(url: "https://github.com/your-org/dts-ris-sdks", from: "1.0.0")
```

Then add `DTSRIS` as a dependency to your target:

```swift
.target(name: "YourApp", dependencies: ["DTSRIS"])
```

Or in Xcode: File → Add Packages… → enter the repository URL.

### Initialization

Initialize the tracker early in your app lifecycle — ideally in
`application(_:didFinishLaunchingWithOptions:)`:

```swift
import DTSRIS

let config = DTSConfig(
    apiKey: "<your-tenant-api-key>",
    endpointUrl: "<your-ingestion-base-url>",
    // Optional overrides:
    maxRetries: 5,         // default 5
    maxBatchSize: 20,      // default 20
    flushInterval: 5.0     // default 5.0 seconds
)

let tracker = DTSTracker(config: config)
tracker.start()
```

**Parameters:**

| Parameter       | Required | Default | Description                                    |
|-----------------|:--------:|---------|------------------------------------------------|
| `apiKey`        | Yes      | —       | Tenant API key for the ingestion endpoint       |
| `endpointUrl`   | Yes      | —       | Base URL of the ingestion API                   |
| `maxRetries`    | No       | `5`     | Maximum retry attempts per flush                |
| `maxBatchSize`  | No       | `20`    | Events queued before immediate flush            |
| `flushInterval` | No       | `5.0`   | Interval in seconds between automatic flushes   |

### Session Management

The SDK generates persistent anonymous user IDs and per-launch session IDs
automatically. On each app launch, `DTSStorage.rotateSessionId()` is called
to start a fresh session. Previous crash detection is built in — if the
session-alive flag was not cleared on the last run, a crash error event
is emitted on the next launch.

### Event Capture

**Auto-capture:**

- `screen_view` fires when the app becomes active and reports the top
  view controller's type name (e.g. `ProductViewController`).
- `error` captures `NSException` via `NSSetUncaughtExceptionHandler`
  and reports crash indicators across sessions. Message content is
  scrubbed of emails and phone numbers.
- `cart_update` and `customization` require explicit integration calls
  (see below).

**Manual tracking:**

```swift
// Screen view with custom properties
tracker.track(type: .screenView, page: "ProductDetail", properties: [
    "productId": .string("prod-123")
])

// Cart update
tracker.trackCartAction(action: "add", productId: "prod-456", quantity: 2)

// Customization
tracker.trackCustomization(attribute: "size", oldValue: "M", newValue: "L")

// Error capture
tracker.trackErrorMessage("Checkout validation failed")
tracker.trackError(someError)
```

### Disposal

```swift
tracker.dispose()
```

This cancels the flush timer, marks the session as cleanly terminated
(preventing false crash reports on next launch), and performs a final
best-effort flush of queued events.

### Idempotency

Every event carries a unique UUID (`eventId`) generated at creation time.
Retried batches are deduplicated by the ingestion API on `eventId`.

### Consent Configuration

This SDK is **zero-PII by default**. No PII fields are collected.
PII consent is managed server-side — if your tenant enables PII collection,
the ingestion API handles field validation and encrypted storage transparently.

---

## Android SDK

### Installation

Add the SDK to your module's `build.gradle.kts`:

```kotlin
dependencies {
    implementation("com.dtsris:sdk:1.0.0")
}
```

The SDK requires `kotlinx-coroutines-android` and `kotlinx-serialization-json`
(automatically resolved as transitive dependencies).

### Initialization

Initialize in your `Application` subclass, before any activities are created:

```kotlin
import com.dtsris.sdk.DTSTracker
import com.dtsris.sdk.DTSConfig

class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()

        val config = DTSConfig(
            apiKey = "<your-tenant-api-key>",
            endpointUrl = "<your-ingestion-base-url>",
            // Optional overrides:
            maxRetries = 5,          // default 5
            maxBatchSize = 20,       // default 20
            flushIntervalMs = 5000L, // default 5000 (5 seconds)
        )

        val tracker = DTSTracker.initialize(this, config)
        tracker.start()
    }
}
```

**Parameters:**

| Parameter        | Required | Default | Description                                    |
|------------------|:--------:|---------|------------------------------------------------|
| `apiKey`         | Yes      | —       | Tenant API key for the ingestion endpoint       |
| `endpointUrl`    | Yes      | —       | Base URL of the ingestion API                   |
| `maxRetries`     | No       | `5`     | Maximum retry attempts per flush                |
| `maxBatchSize`   | No       | `20`    | Events queued before immediate flush            |
| `flushIntervalMs`| No       | `5000`  | Interval in ms between automatic flushes        |

### Event Capture

**Auto-capture:**

- `screen_view` fires when an activity is resumed. The activity's simple
  class name is reported (e.g. `ProductActivity`).
- `error` captures uncaught exceptions via
  `Thread.setDefaultUncaughtExceptionHandler`. Messages are scrubbed
  of emails and phone numbers.
- `cart_update` and `customization` require explicit integration calls.

**Manual tracking:**

```kotlin
val tracker = DTSTracker.getInstance()

// Basic screen view
tracker.track(DTSEventType.SCREEN_VIEW, "ProductActivity", mapOf("section" to "reviews"))

// Cart update
tracker.cartCapture.capture(action = "add", productId = "prod-789", quantity = 1)
tracker.track(DTSEventType.CART_UPDATE, "", mapOf("action" to "remove", "productId" to "prod-123"))

// Customization
tracker.customizationCapture.capture(attribute = "color", oldValue = "black", newValue = "white")

// Error
tracker.errorCapture.captureMessage("Payment timeout", source = "checkout")
tracker.errorCapture.capture(throwable, source = "network")
```

### Disposal

```kotlin
tracker.dispose()
```

Cancels the flush coroutine, unregisters activity lifecycle callbacks,
and performs a final best-effort flush.

### Idempotency

Every event carries a unique UUID (`eventId`) generated at creation time
via `java.util.UUID.randomUUID()`. The ingestion API deduplicates on
`event_id` using `ON CONFLICT DO NOTHING` — retried batches never produce
duplicate records.

### Consent Configuration

Zero-PII by default. PII consent is managed server-side via the Dashboard
or PII Consent API. No SDK-level changes are required to enable or disable
PII collection — the ingestion backend handles consent validation and
field-level encryption transparently.

---

## Retry & Delivery Guarantees

All SDKs use **exponential backoff with jitter** for transient network
failures:

| Parameter       | Value      |
|-----------------|------------|
| Initial delay   | 1 second   |
| Multiplier      | 2×         |
| Maximum delay   | 30 seconds |
| Jitter          | ±20%       |
| Max retries     | 5 (configurable) |

If all retries are exhausted, events are re-queued and retried on the
next flush cycle — no events are silently dropped.

The ingestion API deduplicates events by `eventId`. Each event receives
a unique UUID at creation time on the client. When a batch is retried,
the server ignores events whose `event_id` has already been recorded.

---

## Event Payload Schema

Each event sent to the ingestion endpoint has this structure:

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "eventType": "screen_view",
  "timestamp": "2025-06-29T13:00:00.000Z",
  "sessionId": "b7d3c1a4-...",
  "anonymousUserId": "f2e8a1c9-...",
  "page": "/products/42",
  "properties": {
    "title": "Widget Pro",
    "section": "reviews"
  }
}
```

| Field              | Type   | Description                                       |
|--------------------|--------|---------------------------------------------------|
| `eventId`          | UUID   | Unique event identifier for idempotent deduplication |
| `eventType`        | string | One of `screen_view`, `cart_update`, `customization`, `error` |
| `timestamp`        | ISO8601| Client-side timestamp of event creation           |
| `sessionId`        | UUID   | Per-session identifier (browser tab or app launch) |
| `anonymousUserId`  | UUID   | Persistent anonymous user identifier              |
| `page`             | string | URL path (web) or screen/activity name (mobile)   |
| `properties`       | object | Arbitrary key-value payload (no PII by default)   |

---

## Privacy

- **No PII** is collected by default — error messages are scrubbed of emails,
  phone numbers, and SSN-like patterns before transmission
- **Anonymous user IDs** are random UUIDs stored in localStorage / UserDefaults /
  SharedPreferences. No device or advertising identifiers are used
- **Session IDs** are random UUIDs scoped to the browser tab or app launch
- **No device permissions** are requested (no location, contacts, camera, etc.)
- All data is sent via **HTTPS POST** with the API key in the `X-API-Key` header
- Query strings and URL fragments are stripped from `screen_view` events to
  prevent accidental PII leakage

PII collection requires explicit tenant-level opt-in and field-level consent.
See the Dashboard API documentation for details on managing PII consent.

