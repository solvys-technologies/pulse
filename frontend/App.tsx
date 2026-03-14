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
import { VoiceProvider, useVoice } from './contexts/VoiceContext';
import { ERProvider } from './contexts/ERContext';
import { MainLayout } from './components/layout/MainLayout';
import { NotificationContainer } from './components/NotificationToast';
import { ToastContainer } from './components/ui/Toast';
import { PreMarketReminder } from './components/PreMarketReminder';
import { GitHubOAuthCallback } from './components/GitHubOAuthCallback';
import { UpdateBanner } from './components/UpdateBanner';

// [claude-code 2026-03-13] VoiceBorderPulse — green pulse when listening, gold when speaking
function VoiceBorderPulse() {
  const { runtimeState, enabled } = useVoice();
  if (!enabled || runtimeState === 'idle') return null;

  const isListening = runtimeState === 'listening';
  const isSpeaking = runtimeState === 'speaking';
  if (!isListening && !isSpeaking) return null;

  const color = isListening ? 'rgba(34,197,94,' : 'rgba(199,159,74,';

  return (
    <>
      <style>{`
        @keyframes voiceBorderPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
      `}</style>
      <div
        className="fixed inset-0 pointer-events-none z-[90]"
        style={{
          border: `2px solid ${color}0.5)`,
          animation: 'voiceBorderPulse 2s ease-in-out infinite',
          boxShadow: `inset 0 0 20px ${color}0.15)`,
        }}
      />
    </>
  );
}

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
              <ERProvider>
                <div className="dark">
                  <VoiceBorderPulse />
                  <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

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
                  <PreMarketReminder />
                </div>
              </ERProvider>
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
