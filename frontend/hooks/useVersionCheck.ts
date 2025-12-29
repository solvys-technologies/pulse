/**
 * Version Check Hook
 * Forces users to re-authenticate when the app version changes
 */

import { useEffect } from 'react';
import { useClerk } from '@clerk/clerk-react';

// Get app version from build timestamp (injected at build time)
// Each build will have a unique timestamp, forcing re-auth on updates
const APP_VERSION = import.meta.env.BUILD_TIME || new Date().toISOString();

const VERSION_STORAGE_KEY = 'pulse_app_version';

export function useVersionCheck() {
  const clerk = useClerk();

  useEffect(() => {
    // Skip version check in development or if auth is bypassed
    const DEV_MODE = import.meta.env.DEV || import.meta.env.MODE === 'development';
    const BYPASS_AUTH = DEV_MODE && import.meta.env.VITE_BYPASS_AUTH === 'true';
    
    if (BYPASS_AUTH) {
      return;
    }

    const storedVersion = localStorage.getItem(VERSION_STORAGE_KEY);
    
    // If version has changed, sign out user to force re-authentication
    if (storedVersion && storedVersion !== APP_VERSION) {
      console.log('[VersionCheck] App version changed. Signing out to force re-authentication.', {
        oldVersion: storedVersion,
        newVersion: APP_VERSION,
      });
      
      // Sign out from Clerk
      if (clerk.signOut) {
        clerk.signOut().catch((error) => {
          console.error('[VersionCheck] Error signing out:', error);
          // Clear version anyway to prevent loop
          localStorage.removeItem(VERSION_STORAGE_KEY);
        });
      } else {
        // Fallback: clear version and reload
        localStorage.removeItem(VERSION_STORAGE_KEY);
        window.location.reload();
      }
    } else if (!storedVersion) {
      // First time or version not set - store current version
      localStorage.setItem(VERSION_STORAGE_KEY, APP_VERSION);
      console.log('[VersionCheck] Storing app version:', APP_VERSION);
    }
  }, [clerk]);
}
