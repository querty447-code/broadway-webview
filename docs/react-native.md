# Use Broadway Web in a React Native app

Broadway Web is a Next.js site loaded inside a React Native `WebView`. The native app owns navigation chrome, cart, checkout, and device APIs. The web app owns the OTA screen (home, sale, terms, and so on) and talks to native through a JSON bridge.

Package on the native side: `[react-native-webview](https://github.com/react-native-webview/react-native-webview)`.

## Routes you can open

| URL path  | Screen       |
| --------- | ------------ |
| `/`       | Default home |
| `/home`   | Home         |
| `/sale`   | Sale         |
| `/search` | Search       |
| `/terms`  | Terms        |
| `/about`  | About        |

Base URL examples:

```
# local device / simulator
http://10.0.2.2:3000/sale          # Android emulator → host machine
http://localhost:3000/sale         # iOS simulator
http://192.168.1.20:3000/sale      # physical device on same Wi-Fi

# production
https://your-broadway-web.example.com/sale
```

Point the WebView at **one screen URL**. Do not load `/` and then try to client-route to `/sale` unless you intend the WebView to own in-web navigation.

---

## Load the page

```tsx
import { useCallback, useRef } from "react";
import { Platform, Share } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import WebView from "react-native-webview";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";

const WEB_BASE_URL = "http://10.5.57.161:3000";

function parseBridgeMessage(raw: string) {
  try {
    const data = JSON.parse(raw);
    if (data && typeof data === "object" && "type" in data) return data;
  } catch {
    return null;
  }
  return null;
}

const SaleScreen = () => {
  const webRef = useRef<WebView>(null);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const uri = `${WEB_BASE_URL}/sale?rn=true&safeTop=${Math.round(
    insets.top,
  )}&safeBottom=${Math.round(insets.bottom)}`;

  const onMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      console.log("[Broadway Web] Message", event);
      const msg = parseBridgeMessage(event.nativeEvent.data);
      if (!msg) return;

      const payload = (msg.payload ?? {}) as Record<string, unknown>;

      switch (msg.type) {
        case "WEBVIEW_READY":
          break;
        case "OPEN_PRODUCT_DETAIL":
          break;
        case "ADD_TO_CART":
          // cart.add(payload)
          break;
        case "CLOSE_WEBVIEW":
          navigation.goBack();
          break;
        case "TRIGGER_HAPTIC":
          try {
            ReactNativeHapticFeedback.trigger("impactLight");
          } catch {
            // native module missing — do not fail the next message
          }
          break;
        case "SHARE_PROMOTION":
          Share.share({
            message: String(payload.title ?? ""),
            url: String(payload.url ?? ""),
          });
          break;
        default:
          break;
      }
    },
    [navigation],
  );

  return (
    <WebView
      ref={webRef}
      source={{ uri }}
      javaScriptEnabled
      onMessage={onMessage}
      injectedJavaScript="true;"
      domStorageEnabled
      allowsInlineMediaPlayback
      setSupportMultipleWindows={false}
      originWhitelist={["https://*", "http://*"]}
      decelerationRate={Platform.OS === "ios" ? 0.998 : undefined}
    />
  );
};

export default SaleScreen;
```

`viewport-fit=cover` is already set on the web side. Pass real inset pixels so content does not sit under the notch or home indicator.

### Safe-area query params

The web app reads these on first load:

| Param        | Alias           | Meaning                                   |
| ------------ | --------------- | ----------------------------------------- |
| `rn`         | —               | `true` marks the page as a native WebView |
| `safeTop`    | `sat`, `top`    | Top inset in px                           |
| `safeBottom` | `sab`, `bottom` | Bottom inset in px                        |

If `rn=true` (or a mobile UA) is present and no inset params are sent, the web app defaults to **44** top and **24** bottom. Prefer sending the real values from `useSafeAreaInsets()`.

You can also push insets later with `SAFE_AREA_UPDATE` (see below).

---

## Message format

Every message is a JSON object:

```ts
{
  type: string;
  payload: unknown;
  timestamp?: number; // web → native always includes this
}
```

Web → native uses `window.ReactNativeWebView.postMessage(JSON.stringify(message))`.  
Native → web must post the same shape into the page (see [Send a message to the web](#send-a-message-to-the-web)).

Parse defensively. Ignore messages that have no `type`.

```ts
type BridgeMessage = {
  type: string;
  payload?: unknown;
  timestamp?: number;
};

function parseBridgeMessage(raw: string): BridgeMessage | null {
  try {
    const data = JSON.parse(raw) as unknown;
    if (data && typeof data === "object" && "type" in data) {
      return data as BridgeMessage;
    }
  } catch {
    return null;
  }
  return null;
}
```

---

## Handshake

On mount the web app sends:

```json
{
  "type": "WEBVIEW_READY",
  "payload": { "route": "/sale" },
  "timestamp": 1710000000000
}
```

Treat this as “the page is listening.” **Then** send session and insets:

1. `SET_USER_DATA`
2. `SAFE_AREA_UPDATE` (if you did not put insets on the URL)

Do not send user/token before `WEBVIEW_READY` — the listener is not attached yet.

---

## Native → web (you send these)

Use `injectJavaScript` so the page receives a `message` event. The web app listens on both `window` and `document`.

```ts
import type { RefObject } from "react";
import type WebView from "react-native-webview";

export function postToWeb(webRef: RefObject<WebView | null>, type: string, payload?: unknown) {
  const message = JSON.stringify({ type, payload, timestamp: Date.now() });
  const js = `
    (function () {
      var data = ${message};
      window.postMessage(data, '*');
      document.dispatchEvent(new MessageEvent('message', { data: data }));
    })();
    true;
  `;
  webRef.current?.injectJavaScript(js);
}
```

`injectJavaScript` must end with `true;` so the result is not returned to native as an unused value.

### `SET_USER_DATA`

Merges into the web session. Send after `WEBVIEW_READY`, and again if the user logs in or out.

```ts
postToWeb(webRef, "SET_USER_DATA", {
  id: "user_123",
  name: "Ada",
  email: "ada@example.com",
  token: "…", // used by web API calls that need the session
  vipTier: "gold",
});
```

All fields are optional. Omit `token` for a logged-out user (`{}` or `{ token: undefined }` after a logout).

### `SAFE_AREA_UPDATE`

```ts
postToWeb(webRef, "SAFE_AREA_UPDATE", {
  top: insets.top,
  bottom: insets.bottom,
  left: insets.left,
  right: insets.right,
});
```

Updates `--safe-top` / `--safe-bottom` and the page padding.

### `REFRESH_PAGE`

```ts
postToWeb(webRef, "REFRESH_PAGE", {});
```

Calls `window.location.reload()`. Use after logout or a hard data reset.

### Declared but not handled yet

These types exist in `src/types/bridge.ts` but the web app does **not** act on them today:

| Type                  | Intended use                                       |
| --------------------- | -------------------------------------------------- |
| `THEME_CHANGE`        | Push light/dark                                    |
| `BACK_BUTTON_PRESSED` | Tell the page the hardware back button was pressed |

You can still send them; they are ignored until the web app adds handlers.

---

## Web → native (you handle these)

`onMessage` receives a **string**. Parse it, then switch on `type`.

```ts
function handleWebMessage(raw: string, webRef: RefObject<WebView | null>) {
  const msg = parseBridgeMessage(raw);
  if (!msg) return;

  switch (msg.type) {
    case "WEBVIEW_READY":
      postToWeb(webRef, "SET_USER_DATA", currentUser);
      postToWeb(webRef, "SAFE_AREA_UPDATE", currentInsets);
      break;

    case "NAVIGATE_TO_NATIVE_SCREEN":
      // payload: { screen: string; params?: Record<string, unknown> }
      navigation.navigate(payload.screen, payload.params);
      break;

    case "OPEN_PRODUCT_DETAIL":
      // payload: { productId: string, ...metadata }
      navigation.navigate("ProductDetail", { productId: payload.productId });
      break;

    case "ADD_TO_CART":
      // payload: { id, title, price, quantity? }
      cart.add(payload);
      break;

    case "BUY_NOW":
      // payload: { id, title, price }
      checkout.start(payload);
      break;

    case "CLAIM_VOUCHER":
      // payload: { id, code, discount? }
      vouchers.claim(payload);
      break;

    case "SHARE_PROMOTION":
      // payload: { title: string; url: string }
      Share.share({ message: payload.title, url: payload.url });
      break;

    case "CLOSE_WEBVIEW":
      // payload: { reason: 'USER_ACTION' }
      navigation.goBack();
      break;

    case "TRIGGER_HAPTIC":
      // payload: { style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' }
      playHaptic(payload.style);
      break;

    case "OPEN_DEEPLINK":
      Linking.openURL(payload.url);
      break;

    case "TRACK_ANALYTICS":
      analytics.track(payload);
      break;

    default:
      break;
  }
}
```

### Payload shapes

| `type`                      | `payload`                                                         |
| --------------------------- | ----------------------------------------------------------------- | -------- | ------- | --------- | ------------ |
| `WEBVIEW_READY`             | `{ route: string }`                                               |
| `NAVIGATE_TO_NATIVE_SCREEN` | `{ screen: string; params?: object }`                             |
| `OPEN_PRODUCT_DETAIL`       | `{ productId: string }` plus any extra metadata keys              |
| `ADD_TO_CART`               | `{ id: string; title: string; price: number; quantity?: number }` |
| `BUY_NOW`                   | `{ id: string; title: string; price: number }`                    |
| `CLAIM_VOUCHER`             | `{ id: string; code: string; discount?: string }`                 |
| `SHARE_PROMOTION`           | `{ title: string; url: string }`                                  |
| `CLOSE_WEBVIEW`             | `{ reason: 'USER_ACTION' }`                                       |
| `TRIGGER_HAPTIC`            | `{ style: 'light'                                                 | 'medium' | 'heavy' | 'success' | 'warning' }` |
| `OPEN_DEEPLINK`             | defined by the web caller                                         |
| `TRACK_ANALYTICS`           | defined by the web caller                                         |

Unknown `type` values can still arrive via `sendCustomMessage` on the web. Log them; do not crash.

### Haptics

Map `style` onto your native haptic helper (for example `react-native-haptic-feedback` or Expo `Haptics`):

| Web `style` | Typical native feel |
| ----------- | ------------------- |
| `light`     | impactLight         |
| `medium`    | impactMedium        |
| `heavy`     | impactHeavy         |
| `success`   | notificationSuccess |
| `warning`   | notificationWarning |

---

## Full native screen example

```tsx
import { useCallback, useRef } from "react";
import { Share } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import WebView from "react-native-webview";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";

const WEB_BASE_URL = "https://your-broadway-web.example.com";

export function SaleWebScreen() {
  const webRef = useRef<WebView>(null);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const uri = `${WEB_BASE_URL}/sale?rn=true&safeTop=${Math.round(insets.top)}&safeBottom=${Math.round(insets.bottom)}`;

  const onMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      const msg = parseBridgeMessage(event.nativeEvent.data);
      if (!msg) return;

      const payload = (msg.payload ?? {}) as Record<string, unknown>;

      switch (msg.type) {
        case "WEBVIEW_READY":
          postToWeb(webRef, "SET_USER_DATA", {
            id: "user_123",
            token: "…",
          });
          break;
        case "OPEN_PRODUCT_DETAIL":
          navigation.navigate("ProductDetail" as never, { productId: payload.productId } as never);
          break;
        case "ADD_TO_CART":
          // add to your cart store
          break;
        case "CLOSE_WEBVIEW":
          navigation.goBack();
          break;
        case "TRIGGER_HAPTIC":
          ReactNativeHapticFeedback.trigger("impactLight");
          break;
        case "SHARE_PROMOTION":
          Share.share({
            message: String(payload.title ?? ""),
            url: String(payload.url ?? ""),
          });
          break;
        default:
          console.log("[Broadway Web]", msg.type, payload);
      }
    },
    [navigation],
  );

  return <WebView ref={webRef} source={{ uri }} javaScriptEnabled onMessage={onMessage} />;
}
```

Wire `NAVIGATE_TO_NATIVE_SCREEN`, `BUY_NOW`, and `CLAIM_VOUCHER` the same way once those native screens exist.

---

## Local development

1. Run Broadway Web: `npm run dev` (default `http://localhost:3000`).
2. iOS Simulator can use `http://localhost:3000/sale`.
3. Android Emulator uses `http://10.0.2.2:3000/sale` (that is the host loopback).
4. A physical phone needs your machine LAN IP, and the Next dev server must allow that origin.

`next.config.ts` already lists `allowedDevOrigins` for local IPs. Add your machine IP there if the WebView is blocked in dev.

App Transport / cleartext:

- iOS: allow `localhost` (or your IP) in `Info.plist` `NSAppTransportSecurity` while developing.
- Android: allow HTTP for the dev host in `network_security_config.xml`.

Production should be HTTPS only.

---

## Web side (this repo)

Screens call the bridge with `useRNBridge` from `@/lib/bridge`. They must be Client Components.

```tsx
"use client";

import { useRNBridge } from "@/lib/bridge";

export default function SaleScreen() {
  const { addToCart, openProductDetail, closeWebView, user } = useRNBridge();

  return (
    <button type="button" onClick={() => addToCart({ id: "sku_1", title: "Tee", price: 499 })}>
      Add to cart {user.name ? `(${user.name})` : ""}
    </button>
  );
}
```

In a browser (no `window.ReactNativeWebView`) messages are still logged and dispatched as `rn-bridge-message-sent`. Native handlers do not run. That is expected.

Contract source of truth: `[src/types/bridge.ts](../src/types/bridge.ts)`.

---

## Checklist

- [ ] Open a **specific path** (`/sale`, `/home`, …), not a generic homepage unless you want `/`
- [ ] Pass `rn=true` and real `safeTop` / `safeBottom`
- [ ] Wait for `WEBVIEW_READY` before `SET_USER_DATA`
- [ ] Handle `CLOSE_WEBVIEW`, `OPEN_PRODUCT_DETAIL`, `ADD_TO_CART`, `TRIGGER_HAPTIC` at minimum
- [ ] Use HTTPS in production; keep `originWhitelist` tight if you can
- [ ] On logout, send `SET_USER_DATA` with an empty user (and `REFRESH_PAGE` if the page must drop cached UI)
