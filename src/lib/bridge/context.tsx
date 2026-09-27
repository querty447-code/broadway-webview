'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import {
  UserContextData,
  SafeAreaInsets,
  RNOutgoingMessage,
  RNIncomingMessage,
  HapticStyle,
} from '@/types';
import {
  isReactNativeWebView,
  sendToReactNative,
  subscribeToRNMessages,
  triggerHaptic,
} from './bridge';

interface RNBridgeContextType {
  isWebView: boolean;
  user: UserContextData;
  safeAreaInsets: SafeAreaInsets;
  recentBridgeEvents: RNOutgoingMessage[];
  recentNativeEvents: RNIncomingMessage[];
  // Bridge Actions
  navigateToNative: (screen: string, params?: Record<string, unknown>) => void;
  openProductDetail: (productId: string, metadata?: Record<string, unknown>) => void;
  addToCart: (item: { id: string; title: string; price: number; quantity?: number }) => void;
  buyNow: (item: { id: string; title: string; price: number }) => void;
  claimVoucher: (voucher: { id: string; code: string; discount?: string }) => void;
  sharePromotion: (title: string, url?: string) => void;
  closeWebView: () => void;
  triggerNativeHaptic: (style?: HapticStyle) => void;
  sendCustomMessage: (type: any, payload?: any) => void;
}

const RNBridgeContext = createContext<RNBridgeContextType | undefined>(undefined);

export function RNBridgeProvider({ children }: { children: ReactNode }) {
  const [isWebView, setIsWebView] = useState(false);
  const [user, setUser] = useState<UserContextData>({});
  const [safeAreaInsets, setSafeAreaInsets] = useState<SafeAreaInsets>({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });
  const [recentBridgeEvents, setRecentBridgeEvents] = useState<RNOutgoingMessage[]>([]);
  const [recentNativeEvents, setRecentNativeEvents] = useState<RNIncomingMessage[]>([]);

  useEffect(() => {
    setIsWebView(isReactNativeWebView());

    // Auto-detect safe-area parameters from URL or mobile device
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const querySafeTop = params.get('safeTop') || params.get('sat') || params.get('top');
      const querySafeBottom = params.get('safeBottom') || params.get('sab') || params.get('bottom');

      const isMobileUA = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const isRN = isReactNativeWebView() || params.get('rn') === 'true' || isMobileUA;

      const defaultTop = querySafeTop ? parseInt(querySafeTop, 10) : (isRN ? 44 : 0);
      const defaultBottom = querySafeBottom ? parseInt(querySafeBottom, 10) : (isRN ? 24 : 0);

      if (defaultTop > 0 || defaultBottom > 0) {
        setSafeAreaInsets({
          top: defaultTop,
          bottom: defaultBottom,
          left: 0,
          right: 0,
        });
        document.documentElement.style.setProperty('--safe-top', `${defaultTop}px`);
        document.documentElement.style.setProperty('--safe-bottom', `${defaultBottom}px`);
      }
    }

    // Capture local events for testing/logging
    const handleLocalBridge = (e: Event) => {
      const customEvent = e as CustomEvent<RNOutgoingMessage>;
      if (customEvent.detail) {
        queueMicrotask(() => {
          setRecentBridgeEvents((prev) => [customEvent.detail, ...prev.slice(0, 19)]);
        });
      }
    };
    window.addEventListener('rn-bridge-message-sent', handleLocalBridge);

    // Listen for incoming messages from React Native host
    const unsubscribe = subscribeToRNMessages((msg: RNIncomingMessage) => {
      queueMicrotask(() => {
        setRecentNativeEvents((prev) => [msg, ...prev.slice(0, 29)]);
      });
      console.log('[RN ➔ Bridge]', JSON.stringify(msg));

      if (msg.type === 'SET_USER_DATA') {
        setUser((prev) => ({ ...prev, ...(msg.payload as UserContextData) }));
      } else if (msg.type === 'SAFE_AREA_UPDATE') {
        const insets = msg.payload as SafeAreaInsets;
        setSafeAreaInsets(insets);
        document.documentElement.style.setProperty('--safe-top', `${insets.top}px`);
        document.documentElement.style.setProperty('--safe-bottom', `${insets.bottom}px`);
      } else if (msg.type === 'REFRESH_PAGE') {
        window.location.reload();
      }
    });

    // Notify React Native that WebView is ready
    sendToReactNative('WEBVIEW_READY', {
      route: window.location.pathname,
    });

    return () => {
      window.removeEventListener('rn-bridge-message-sent', handleLocalBridge);
      unsubscribe();
    };
  }, []);

  const triggerNativeHaptic = useCallback((style: HapticStyle = 'light') => {
    triggerHaptic(style);
  }, []);

  const navigateToNative = useCallback((screen: string, params?: Record<string, unknown>) => {
    triggerHaptic('light');
    sendToReactNative('NAVIGATE_TO_NATIVE_SCREEN', { screen, params });
  }, []);

  const openProductDetail = useCallback((productId: string, metadata?: Record<string, unknown>) => {
    triggerHaptic('light');
    sendToReactNative('OPEN_PRODUCT_DETAIL', { productId, ...metadata });
  }, []);

  const addToCart = useCallback((item: { id: string; title: string; price: number; quantity?: number }) => {
    triggerHaptic('medium');
    sendToReactNative('ADD_TO_CART', item);
  }, []);

  const buyNow = useCallback((item: { id: string; title: string; price: number }) => {
    triggerHaptic('heavy');
    sendToReactNative('BUY_NOW', item);
  }, []);

  const claimVoucher = useCallback((voucher: { id: string; code: string; discount?: string }) => {
    triggerHaptic('success');
    sendToReactNative('CLAIM_VOUCHER', voucher);
  }, []);

  const sharePromotion = useCallback((title: string, url?: string) => {
    triggerHaptic('light');
    const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
    sendToReactNative('SHARE_PROMOTION', { title, url: shareUrl });
  }, []);

  const closeWebView = useCallback(() => {
    triggerHaptic('light');
    sendToReactNative('CLOSE_WEBVIEW', { reason: 'USER_ACTION' });
  }, []);

  const sendCustomMessage = useCallback((type: any, payload?: any) => {
    sendToReactNative(type, payload);
  }, []);

  return (
    <RNBridgeContext.Provider
      value={{
        isWebView,
        user,
        safeAreaInsets,
        recentBridgeEvents,
        recentNativeEvents,
        navigateToNative,
        openProductDetail,
        addToCart,
        buyNow,
        claimVoucher,
        sharePromotion,
        closeWebView,
        triggerNativeHaptic,
        sendCustomMessage,
      }}
    >
      {children}
    </RNBridgeContext.Provider>
  );
}

export function useRNBridge() {
  const context = useContext(RNBridgeContext);
  if (!context) {
    throw new Error('useRNBridge must be used within an RNBridgeProvider');
  }
  return context;
}
