"use client";

import { RNOutgoingMessageType, RNOutgoingMessage, RNIncomingMessage, HapticStyle } from "@/types";

// This is a workaround to fix the type error for the ReactNativeWebView object.
declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

type BridgeListener = (message: RNIncomingMessage) => void;
const listeners = new Set<BridgeListener>();

/**
 * Checks whether the webpage is running inside React Native WebView
 */
export function isReactNativeWebView(): boolean {
  return typeof window !== "undefined" && Boolean(window.ReactNativeWebView?.postMessage);
}

function postMessageToNative(serialized: string): boolean {
  try {
    if (window.ReactNativeWebView?.postMessage) {
      window.ReactNativeWebView.postMessage(serialized);
      return true;
    }
  } catch (err) {
    console.error("[RN Bridge] Failed to send message to React Native:", err);
  }
  return false;
}

/**
 * Sends a strongly-typed message to React Native host app.
 * Retries briefly because RN injects `window.ReactNativeWebView` after first JS.
 */
export function sendToReactNative<T = unknown>(type: RNOutgoingMessageType, payload?: T): void {
  if (typeof window === "undefined") return;

  const message: RNOutgoingMessage<T | undefined> = {
    type,
    payload,
    timestamp: Date.now(),
  };
  const serialized = JSON.stringify(message);

  // If the message is not sent to the native side, try to send it again.
  // This is a workaround to fix the issue that the message is not sent to the native side.
  if (!postMessageToNative(serialized)) {
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (postMessageToNative(serialized) || attempts >= 20) {
        window.clearInterval(timer);
        if (attempts >= 20 && !window.ReactNativeWebView) {
          console.warn(
            "[RN Bridge] ReactNativeWebView not found. Browser console logs will not appear in Metro.",
          );
        }
      }
    }, 50);
  }

  window.dispatchEvent(
    new CustomEvent("rn-bridge-message-sent", {
      detail: message,
    }),
  );

  console.log(
    `%c[Bridge ➔ RN] %c${type}`,
    "color: #8B5CF6; font-weight: bold;",
    "color: #10B981;",
    payload,
  );
}

/**
 * Subscribes to incoming messages from React Native
 */
export function subscribeToRNMessages(listener: BridgeListener): () => void {
  listeners.add(listener);

  if (typeof window !== "undefined" && !(window as { __rnBridgeInit?: boolean }).__rnBridgeInit) {
    (window as { __rnBridgeInit?: boolean }).__rnBridgeInit = true;

    const handleMessage = (event: MessageEvent) => {
      try {
        let data: unknown = event.data;
        if (typeof data === "string") {
          try {
            data = JSON.parse(data);
          } catch {
            // String payload
          }
        }

        if (data && typeof data === "object" && "type" in data) {
          const typedMessage = data as RNIncomingMessage;
          listeners.forEach((cb) => {
            try {
              cb(typedMessage);
            } catch (err) {
              console.error("[RN Bridge] Listener error:", err);
            }
          });
        }
      } catch (err) {
        console.error("[RN Bridge] Parse error:", err);
      }
    };

    window.addEventListener("message", handleMessage);
    document.addEventListener("message", handleMessage as EventListener);
  }

  return () => {
    listeners.delete(listener);
  };
}

/**
 * Helper to trigger native device haptics
 */
export function triggerHaptic(style: HapticStyle = "light"): void {
  sendToReactNative("TRIGGER_HAPTIC", { style });
}
