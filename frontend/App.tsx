import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { ThreadProvider } from './contexts/ThreadContext';
import { ToastProvider } from './contexts/ToastContext';
import { GatewayProvider } from './contexts/GatewayContext';
import { PulseAgentProvider } from './contexts/PulseAgentContext';
import { RiskFlowProvider } from './contexts/RiskFlowContext';
import { ContextBankProvider } from './contexts/ContextBankContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { VoiceProvider } from './contexts/VoiceContext';
import { MainLayout } from './components/layout/MainLayout';
import { NotificationContainer } from './components/NotificationToast';
import { ToastContainer } from './components/ui/Toast';
import { GitHubOAuthCallback } from './components/GitHubOAuthCallback';
import { UpdateBanner } from './components/UpdateBanner';

/**
 * Pulse - Local Single-User Trading Platform
 * No authentication required - company internal use only
 */
export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <SettingsProvider>
        <ToastProvider>
          <GatewayProvider>
            <PulseAgentProvider>
              <RiskFlowProvider>
              <ContextBankProvider>
              <ThreadProvider>
              <VoiceProvider>
                <div className="dark">
                  <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&family=Roboto+Mono:wght@400;500&display=swap');

                    * {
                      scrollbar-width: thin;
                      scrollbar-color: var(--pulse-accent) var(--pulse-surface);
                    }

                    *::-webkit-scrollbar {
                      width: 8px;
                      height: 8px;
                    }

                    *::-webkit-scrollbar-track {
                      background: var(--pulse-surface);
                    }

                    *::-webkit-scrollbar-thumb {
                      background: var(--pulse-accent);
                      border-radius: 4px;
                    }

                    *::-webkit-scrollbar-thumb:hover {
                      background: color-mix(in srgb, var(--pulse-accent) 70%, white);
                    }

                    .scanline-overlay {
                      background: repeating-linear-gradient(
                        0deg,
                        color-mix(in srgb, var(--pulse-accent) 3%, transparent) 0px,
                        color-mix(in srgb, var(--pulse-accent) 3%, transparent) 1px,
                        transparent 1px,
                        transparent 2px
                      );
                      pointer-events: none;
                    }
                  `}</style>
                  <UpdateBanner />
                  <GitHubOAuthCallback />
                  <MainLayout />
                  <NotificationContainer />
                  <ToastContainer />
                </div>
              </VoiceProvider>
              </ThreadProvider>
              </ContextBankProvider>
              </RiskFlowProvider>
            </PulseAgentProvider>
          </GatewayProvider>
        </ToastProvider>
      </SettingsProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}
