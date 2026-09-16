/**
 * React Native Bridge Types & Contracts
 */

export type RNOutgoingMessageType =
  | 'NAVIGATE_TO_NATIVE_SCREEN'
  | 'OPEN_PRODUCT_DETAIL'
  | 'ADD_TO_CART'
  | 'BUY_NOW'
  | 'CLAIM_VOUCHER'
  | 'TRIGGER_HAPTIC'
  | 'SHARE_PROMOTION'
  | 'CLOSE_WEBVIEW'
  | 'OPEN_DEEPLINK'
  | 'TRACK_ANALYTICS'
  | 'WEBVIEW_READY';

export type RNIncomingMessageType =
  | 'SET_USER_DATA'
  | 'THEME_CHANGE'
  | 'SAFE_AREA_UPDATE'
  | 'REFRESH_PAGE'
  | 'BACK_BUTTON_PRESSED';

export interface RNOutgoingMessage<T = unknown> {
  type: RNOutgoingMessageType;
  payload: T;
  timestamp: number;
}

export interface RNIncomingMessage<T = unknown> {
  type: RNIncomingMessageType;
  payload: T;
  timestamp?: number;
}

export interface UserContextData {
  id?: string;
  name?: string;
  email?: string;
  token?: string;
  vipTier?: string;
}

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning';
