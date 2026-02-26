import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { ThreadProvider } from './contexts/ThreadContext';
import { ToastProvider } from './contexts/ToastContext';
import { GatewayProvider } from './contexts/GatewayContext';
import { PulseAgentProvider } from './contexts/PulseAgentContext';
import { RiskFlowProvider } from './contexts/RiskFlowContext';
import { MainLayout } from './components/layout/MainLayout';
import { NotificationContainer } from './components/NotificationToast';
import { ToastContainer } from './components/ui/Toast';

/**
 * Pulse - Local Single-User Trading Platform
 * No authentication required - company internal use only
 */
export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <ToastProvider>
          <GatewayProvider>
            <PulseAgentProvider>
              <RiskFlowProvider>
              <ThreadProvider>
                <div className="dark">
                  <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&family=Roboto+Mono:wght@400;500&display=swap');

                    * {
                      scrollbar-width: thin;
                      scrollbar-color: #D4AF37 #0a0a00;
                    }

                    *::-webkit-scrollbar {
                      width: 8px;
                      height: 8px;
                    }

                    *::-webkit-scrollbar-track {
                      background: #0a0a00;
                    }

                    *::-webkit-scrollbar-thumb {
                      background: #D4AF37;
                      border-radius: 4px;
                    }

                    *::-webkit-scrollbar-thumb:hover {
                      background: #FFD060;
                    }

                    .scanline-overlay {
                      background: repeating-linear-gradient(
                        0deg,
                        rgba(255, 192, 56, 0.03) 0px,
                        rgba(255, 192, 56, 0.03) 1px,
                        transparent 1px,
                        transparent 2px
                      );
                      pointer-events: none;
                    }
                  `}</style>
                  <MainLayout />
                  <NotificationContainer />
                  <ToastContainer />
                </div>
              </ThreadProvider>
              </RiskFlowProvider>
            </PulseAgentProvider>
          </GatewayProvider>
        </ToastProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
