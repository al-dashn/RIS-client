# DTS RIS Client SDKs

Client libraries for iOS, Android, and Web that automatically capture
anonymous user-journey events (screen views, cart updates, customizations,
errors) and send them to the DTS RIS ingestion endpoint.

All SDKs are zero-PII by design — no personally identifiable information
is collected under any code path.

## SDKs

| Platform | Directory | Language |
|----------|-----------|----------|
| Web      | `web/`    | TypeScript (ES2020) |
| iOS      | `ios/`    | Swift 5.9+ |
| Android  | `android/`| Kotlin |

## Event Types

- `screen_view` — page / screen navigations
- `cart_update` — add, remove, or modify cart items
- `customization` — product attribute changes
- `error` — application errors (stripped of PII)

## Configuration

Each SDK requires two values at initialization:

| Variable | Description |
|----------|-------------|
| `DTSRIS_API_KEY` | API key for the ingestion endpoint |
| `DTSRIS_ENDPOINT_URL` | Base URL of the ingestion API |

See each platform's `.env.example` for the variable names.

## Web SDK Quick Start

```typescript
import { DTSTracker } from '@dtsris/web-sdk';

const tracker = new DTSTracker({
  apiKey: '<your-api-key>',
  endpointUrl: 'https://ingestion.example.com/v1',
});
tracker.start();

// Manual tracking (auto-capture is enabled by default)
tracker.track('cart_update', { action: 'add', productId: 'abc' });
```

Auto-capture requires zero code beyond `new DTSTracker({...})` + `.start()`.
To annotate UI elements for cart/customization capture, use `data-dtsris-*`
attributes (see source).

## iOS SDK Quick Start

```swift
import DTSRIS

let config = DTSConfig(apiKey: "<your-api-key>",
                       endpointUrl: "https://ingestion.example.com/v1")
let tracker = DTSTracker(config: config)
tracker.start()

// Manual tracking
tracker.track(type: .cartUpdate, properties: ["action": .string("add")])
```

## Android SDK Quick Start

```kotlin
val config = DTSConfig(
    apiKey = "<your-api-key>",
    endpointUrl = "https://ingestion.example.com/v1",
)
val tracker = DTSTracker.initialize(application, config)
tracker.start()

// Manual tracking
tracker.track(DTSEventType.CART_UPDATE, mapOf("action" to "add"))
```

## Retry Behavior

All SDKs use exponential backoff with jitter for transient network failures:
initial delay 1 s, multiplier 2×, capped at 30 s, up to 5 retries (configurable).

## Privacy

- No PII is ever collected — error messages are scrubbed before transmission
- Anonymous user IDs are random UUIDs stored locally
- Session IDs are random UUIDs scoped to the browser tab / app launch
- No device permissions are requested (no location, contacts, camera, etc.)
- All data is sent via HTTPS POST with the API key in the `X-API-Key` header
