'use client';

/**
 * Capacitor Plugin Bridge for Remote URL Usage
 *
 * When the Android Capacitor app loads the website from a remote URL
 * (server.url in capacitor.config.ts), the npm plugin packages are NOT
 * bundled with the website. The native plugins ARE installed on the
 * Android side, but the JS proxies need to be created manually using
 * Capacitor.registerPlugin().
 *
 * This module registers and caches all required Capacitor plugin proxies.
 */

function getCapacitor(): any {
  if (typeof window === 'undefined') return null;
  return (window as any).Capacitor ?? null;
}

export function isNativePlatform(): boolean {
  const cap = getCapacitor();
  return cap?.isNativePlatform?.() ?? false;
}

export function isAndroid(): boolean {
  const cap = getCapacitor();
  return cap?.getPlatform?.() === 'android';
}

// --- Plugin caches ---
let _localNotifications: any = null;
let _pushNotifications: any = null;
let _appUpdate: any = null;

export function getLocalNotifications(): any {
  if (!_localNotifications) {
    const cap = getCapacitor();
    if (cap?.registerPlugin) {
      _localNotifications = cap.registerPlugin('LocalNotifications');
      console.log('CapBridge: Registered LocalNotifications plugin');
    }
  }
  return _localNotifications;
}

export function getPushNotifications(): any {
  if (!_pushNotifications) {
    const cap = getCapacitor();
    if (cap?.registerPlugin) {
      _pushNotifications = cap.registerPlugin('PushNotifications');
      console.log('CapBridge: Registered PushNotifications plugin');
    }
  }
  return _pushNotifications;
}

export function getAppUpdate(): any {
  if (!_appUpdate) {
    const cap = getCapacitor();
    if (cap?.registerPlugin) {
      _appUpdate = cap.registerPlugin('AppUpdate');
      console.log('CapBridge: Registered AppUpdate plugin');
    }
  }
  return _appUpdate;
}
