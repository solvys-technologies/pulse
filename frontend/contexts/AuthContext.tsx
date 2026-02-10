import { createContext, useContext, useState, ReactNode } from 'react';

export type UserTier = 'free' | 'pulse' | 'pulse_plus' | 'pulse_pro';

interface OnboardingData {
  hasCompletedOnboarding: boolean;
  tradingStyle?: string;
  experienceLevel?: string;
  riskTolerance?: string;
}

interface AuthContextType {
  tier: UserTier;
  setTier: (tier: UserTier) => void;
  onboardingData: OnboardingData;
  setOnboardingData: (data: OnboardingData) => void;
  isAuthenticated: boolean;
  userId: string;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Local Auth Provider - No external authentication
 * Single-user local product for company use only
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [tier, setTier] = useState<UserTier>('pulse_pro'); // Default to pro tier
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    hasCompletedOnboarding: true,
  });

  return (
    <AuthContext.Provider
      value={{
        tier,
        setTier,
        onboardingData,
        setOnboardingData,
        isAuthenticated: true,
        userId: 'local-user',
        isLoading: false,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
