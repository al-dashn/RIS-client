# DTS RIS SDK — Client Installation Guide

This guide tells a customer how to install and initialize the DTS RIS SDKs
in their own applications. It covers the three platforms: Web, Android, and iOS.

> All SDKs are **zero-PII by design**. No personally identifiable information
> is collected under any code path.

---

## Prerequisites

Every customer needs two things from you (DTS) before they start:

1. **API key** — issued by DTS, unique per customer site/app.
2. **Endpoint URL** — the DTS RIS ingestion endpoint, e.g.
   `https://ingestion.example.com/events`.

Provide both in the welcome/onboarding email along with this guide.

---

## 1. Web SDK

Published to **GitHub Packages** (npm registry: `npm.pkg.github.com`).

### One-time setup (GitHub access)

The package is private, so the customer's developers need a GitHub
Personal Access Token (PAT) with the `read:packages` scope.

1. Create a PAT: GitHub → Settings → Developer settings → Personal access tokens.
2. Grant `read:packages`.
3. Point npm at GitHub Packages for the `@al-dashn` scope:

   ```bash
   npm config set @al-dashn:registry https://npm.pkg.github.com
   ```

4. Authenticate (use the PAT as the password):

   ```bash
   npm login --registry=https://npm.pkg.github.com
   # Username: <their GitHub username>
   # Password: <the PAT, not their GitHub password>
   ```

> ⚠️ The customer's GitHub account must be granted access to the package.
> DTS adds their GitHub username/team to the `@al-dashn/web-sdk` package's
> access list.

### Install & initialize

```bash
npm install @al-dashn/web-sdk
```

```js
import { DTSTracker } from '@al-dashn/web-sdk';

const tracker = new DTSTracker({
  apiKey: 'API_KEY_FROM_DTS',
  endpointUrl: 'https://ingestion.example.com/events',
});

tracker.start();
```

### CDN alternative

For customers without a bundler, the UMD bundle is attached to each GitHub
Release. Host it on their own CDN and load:

```html
<script src="/path/to/dtsris-tracker.umd.js"></script>
<script>
  new DTSRIS.DTSTracker({
    apiKey: 'API_KEY_FROM_DTS',
    endpointUrl: 'https://ingestion.example.com/events',
  }).start();
</script>
```

---

## 2. Android SDK

Published via **JitPack**, auto-built from the release tag.

### Install

In `settings.gradle.kts` (project level), add JitPack:

```kotlin
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven { url = uri("https://jitpack.io") }
    }
}
```

In the app module's `build.gradle.kts`:

```kotlin
dependencies {
    implementation("com.github.al-dashn:RIS-client:0.3.0")
}
```

### Initialize

```kotlin
import com.dashn.sdk.DTSTracker
import com.dashn.sdk.DTSConfig

class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        val tracker = DTSTracker.initialize(this, DTSConfig(
            apiKey = "API_KEY_FROM_DTS",
            endpointUrl = "https://ingestion.example.com/events",
        ))
        tracker.start()
    }
}
```

---

## 3. iOS SDK

Distributed via **Swift Package Manager** (no account/registry needed).

### Install

Xcode → File → Add Package Dependencies → enter:

```
https://github.com/al-dashn/RIS-client
```

Select the `DTSRIS` library product.

### Initialize

```swift
import DTSRIS

DTSTracker.initialize(config: DTSConfig(
    apiKey: "API_KEY_FROM_DTS",
    endpointUrl: "https://ingestion.example.com/events",
)).start()
```

---

## Quick reference

| Platform | Package / coordinate | Registry |
|----------|----------------------|----------|
| Web      | `@al-dashn/web-sdk` | GitHub Packages (`npm.pkg.github.com`) |
| Android  | `com.github.al-dashn:RIS-client:0.3.0` | JitPack |
| iOS      | `DTSRIS` | Swift Package Manager (GitHub tag) |

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Web: `401 Unauthorized` on `npm install` | Missing/invalid PAT, or account not granted access | Re-run `npm login`, confirm `read:packages`, confirm DTS granted access |
| Android: JitPack "not found" | Tag not pushed, or org mismatch | Confirm the `v0.3.0` tag exists on `al-dashn/RIS-client` |
| iOS: package not found in Xcode | Repo/tag not reachable | Confirm `https://github.com/al-dashn/RIS-client` is public or the customer has repo read access |
| Events not arriving | Wrong endpoint URL or API key | Verify both values against the onboarding email |
