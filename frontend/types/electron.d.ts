/**
 * Type declarations for Electron API exposed via preload script
 */

export interface ElectronAPI {
  platform: 'electron';
  isElectron: true;
  toggleMiniWidget: () => Promise<void>;
  setKeepWidgetOnClose: (value: boolean) => Promise<void>;
  getKeepWidgetOnClose: () => Promise<boolean>;
  getAppVersion: () => string;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}

export {};
