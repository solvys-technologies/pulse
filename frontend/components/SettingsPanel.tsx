import { Settings, Bell, CreditCard, Cpu, Code, Volume2, Terminal, Wifi, Palette, Users, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useSettings, type APIKeys } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { useGateway } from '../contexts/GatewayContext';
import Toggle from './Toggle';
import { Button } from './ui/Button';
import { useState, useEffect } from 'react';
import { useBackend } from '../lib/backend';
import { HEALING_BOWL_SOUNDS, healingBowlPlayer } from '../utils/healingBowlSounds';

import { ClawnalystDesk } from './settings/ClawnalystDesk';

type SettingsTab = 'general' | 'gateway' | 'appearance' | 'desk' | 'notifications' | 'trading' | 'api' | 'developer' | 'danger';

export function SettingsPage() {
  const { tier, setTier, isAuthenticated } = useAuth();
  const {
    apiKeys,
    setAPIKeys,
    tradingModels,
    setTradingModels,
    alertConfig,
    setAlertConfig,
    mockDataEnabled,
    setMockDataEnabled,
    selectedSymbol,
    setSelectedSymbol,
    riskSettings,
    setRiskSettings,
    developerSettings,
    setDeveloperSettings,
    autoPilotSettings,
    setAutoPilotSettings,
  } = useSettings();
  const backend = useBackend();
  const [contractsPerTrade, setContractsPerTrade] = useState<number>(1);

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [showLanding, setShowLanding] = useState(true);

  const handleTabChange = (tab: SettingsTab) => {
    if (!showLanding && tab === activeTab && !tabTransitioning) return;
    setShowLanding(false);
    if (tab === activeTab) return;
    setTabTransitioning(true);
    setPrevTab(activeTab);
    setTimeout(() => {
      setActiveTab(tab);
      setTimeout(() => {
        setTabTransitioning(false);
        setPrevTab(null);
      }, 50);
    }, 300);
  };

  const handleBackToLanding = () => {
    setShowLanding(true);
  };

  const availableSymbols = [
    {
      symbol: 'MNQ',
      contractName: 'MNQ Z25',
      description: 'E-mini Micro Nasdaq Futures'
    },
    {
      symbol: 'ES',
      contractName: 'ES Z25',
      description: 'E-mini S&P 500 Futures'
    },
    {
      symbol: 'NQ',
      contractName: 'NQ Z25',
      description: 'E-mini Nasdaq-100 Futures'
    },
    {
      symbol: 'YM',
      contractName: 'YM Z25',
      description: 'E-mini Dow Jones Futures'
    },
    {
      symbol: 'RTY',
      contractName: 'RTY Z25',
      description: 'E-mini Russell 2000 Futures'
    },
  ];

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [prevTab, setPrevTab] = useState<SettingsTab | null>(null);
  const [tabTransitioning, setTabTransitioning] = useState(false);
  const [showSymbolDropdown, setShowSymbolDropdown] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      // Save risk settings, selected symbol, and contracts per trade
      await backend.account.updateSettings({
        dailyTarget: riskSettings.dailyProfitTarget,
        dailyLossLimit: riskSettings.dailyLossLimit,
        topstepxUsername: apiKeys.topstepxUsername,
        topstepxApiKey: apiKeys.topstepxApiKey,
        selectedSymbol: selectedSymbol.symbol, // Save selected symbol to database for algorithm
        contractsPerTrade: contractsPerTrade, // Save contracts per trade for algorithm
      });

      // Save ProjectX credentials if provided
      if (apiKeys.topstepxUsername || apiKeys.topstepxApiKey) {
        await backend.account.updateProjectXCredentials({
          username: apiKeys.topstepxUsername || undefined,
          apiKey: apiKeys.topstepxApiKey || undefined,
        });
      }

      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveMessage('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Load account settings and credentials when component mounts
  useEffect(() => {
    if (!isAuthenticated) return;

    async function fetchData() {
      try {
        const account = await backend.account.get();

        // Load contracts settings
        if (account.contractsPerTrade) {
          setContractsPerTrade(account.contractsPerTrade);
        }

        // Load credentials if present
        if (account.projectxUsername) {
          setAPIKeys((prev: APIKeys) => ({
            ...prev,
            topstepxUsername: account.projectxUsername || '',
          }));
        }
      } catch (error) {
        console.error('Failed to load settings data:', error);
      }
    }

    fetchData();
  }, [backend, isAuthenticated, setAPIKeys]);

  const tabs = [
    { id: 'general' as const, label: 'Profile', icon: Settings, description: 'Trading symbol, billing, and account preferences' },
    { id: 'gateway' as const, label: 'Gateway', icon: Wifi, description: 'OpenClaw gateway connection and health status' },
    { id: 'appearance' as const, label: 'Appearance', icon: Palette, description: 'Theme and visual customization options' },
    { id: 'desk' as const, label: 'Clawnalyst Desk', icon: Users, description: 'Configure analyst personas and agent settings' },
    { id: 'trading' as const, label: 'Trading', icon: Cpu, description: 'Risk management, autopilot, and strategy toggles' },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell, description: 'Alerts, sounds, and notification preferences' },
    { id: 'api' as const, label: 'API Keys', icon: Code, description: 'TopstepX credentials and external service keys' },
    { id: 'developer' as const, label: 'Developer', icon: Terminal, description: 'Mock data, test tools, and tier management' },
    { id: 'danger' as const, label: 'Danger Zone', icon: AlertTriangle, description: 'Reset analysts, clear data, and export config' },
  ];

  return (
    <div className="h-full w-full flex relative">
      {/* Main content — stretches full width */}
      <div className="flex-1 flex flex-col min-h-0">

        {/* ===== LANDING PAGE ===== */}
        {showLanding ? (
          <div className="flex-1 overflow-y-auto px-8 py-8 flex items-center justify-center">
            <div className="max-w-3xl w-full">
              <div className="text-center mb-8">
                <h1 className="text-[22px] font-semibold text-white tracking-tight mb-1">Settings</h1>
                <p className="text-[13px] text-gray-500">Configure your Pulse environment</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  const isDanger = tab.id === 'danger';
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`group text-left p-4 rounded-lg border transition-all hover:scale-[1.01] ${
                        isDanger
                          ? 'border-red-500/15 hover:border-red-500/30 hover:bg-red-500/5'
                          : 'border-[#D4AF37]/10 hover:border-[#D4AF37]/30 hover:bg-[#D4AF37]/5'
                      }`}
                      style={{ backgroundColor: 'rgba(10,10,0,0.4)' }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isDanger
                            ? 'bg-red-500/10 text-red-400 group-hover:bg-red-500/20'
                            : 'bg-[#D4AF37]/10 text-[#D4AF37] group-hover:bg-[#D4AF37]/20'
                        } transition-colors`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className={`text-[13px] font-semibold ${isDanger ? 'text-red-400' : 'text-white'}`}>
                            {tab.label}
                          </div>
                          <div className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                            {tab.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
        /* ===== SUBSECTION CONTENT ===== */
        <div className="flex-1 flex flex-col min-h-0">
          {/* Back button + section title */}
          <div className="shrink-0 flex items-center gap-3 px-8 pt-5 pb-3">
            <button
              onClick={handleBackToLanding}
              className="flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors"
              title="Back to Settings"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              {(() => { const Icon = tabs.find(t => t.id === activeTab)?.icon ?? Settings; return <Icon className="w-4 h-4 text-[#D4AF37]/60" />; })()}
              <h2 className="text-[14px] font-semibold text-white tracking-tight">
                {tabs.find(t => t.id === activeTab)?.label}
              </h2>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-4 pb-20 space-y-6 relative">
            {activeTab === 'notifications' && (
              <div key="notifications" className={tabTransitioning && prevTab ? 'animate-fade-out-tab' : 'animate-fade-in-tab'}>
                <section>
                  <h3 className="text-sm font-semibold text-[#D4AF37] mb-3">Alert Configuration</h3>
                  <div className="space-y-3">
                    <Toggle
                      label="Price Alerts"
                      enabled={alertConfig.priceAlerts}
                      onChange={(val) => setAlertConfig({ ...alertConfig, priceAlerts: val })}
                    />
                    <Toggle
                      label="Psychological Alerts"
                      enabled={alertConfig.psychAlerts}
                      onChange={(val) => setAlertConfig({ ...alertConfig, psychAlerts: val })}
                    />
                    <Toggle
                      label="News Alerts"
                      enabled={alertConfig.newsAlerts}
                      onChange={(val) => setAlertConfig({ ...alertConfig, newsAlerts: val })}
                    />
                    <Toggle
                      label="Sound Enabled"
                      enabled={alertConfig.soundEnabled}
                      onChange={(val) => setAlertConfig({ ...alertConfig, soundEnabled: val })}
                    />
                  </div>
                </section>

                <section className="pt-6 border-t border-zinc-800">
                  <h3 className="text-sm font-semibold text-[#D4AF37] mb-3">Healing Bowl Sound</h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Select a sound to play when emotional tilt is detected. Calm sounds are relaxing, shock sounds are alerting.
                  </p>
                  <div className="space-y-2">
                    {HEALING_BOWL_SOUNDS.map((sound) => (
                      <div
                        key={sound.id}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${alertConfig.healingBowlSound === sound.id
                          ? 'bg-[#D4AF37]/20 border-[#D4AF37]/40'
                          : 'bg-[#0a0a00] border-zinc-800 hover:border-zinc-700'
                          }`}
                        onClick={() => setAlertConfig({ ...alertConfig, healingBowlSound: sound.id })}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-white">{sound.name}</span>
                            <span
                              className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full ${sound.type === 'calm'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                }`}
                            >
                              {sound.type}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">{sound.description}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            healingBowlPlayer.preview(sound.id);
                          }}
                          className="ml-3 p-2 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30 hover:bg-[#D4AF37]/20 transition-colors"
                          title="Preview sound"
                        >
                          <Volume2 className="w-4 h-4 text-[#D4AF37]" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'trading' && (
              <div key="trading" className={tabTransitioning && prevTab ? 'animate-fade-out-tab' : 'animate-fade-in-tab'}>
                <section>
                  <h3 className="text-sm font-semibold text-[#D4AF37] mb-4">Risk Management</h3>
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-3">Daily Profit Target</h4>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 text-sm">$</span>
                        <input
                          type="number"
                          value={riskSettings.dailyProfitTarget}
                          onChange={(e) => setRiskSettings({ ...riskSettings, dailyProfitTarget: parseFloat(e.target.value) || 0 })}
                          className="flex-1 bg-[#0a0a00] border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4AF37]/30"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Target profit amount per trading day
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-3">Daily Loss Limit</h4>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 text-sm">$</span>
                        <input
                          type="number"
                          value={riskSettings.dailyLossLimit}
                          onChange={(e) => setRiskSettings({ ...riskSettings, dailyLossLimit: parseFloat(e.target.value) || 0 })}
                          className="flex-1 bg-[#0a0a00] border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4AF37]/30"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Maximum loss amount per trading day
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-3">Contracts Per Trade</h4>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={contractsPerTrade}
                          onChange={(e) => setContractsPerTrade(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                          className="flex-1 bg-[#0a0a00] border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4AF37]/30"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Number of contracts the algorithm will use per trade. Stop loss is automatically calculated to ensure $330 total risk per trade.
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-3">Over-Trading Monitor</h4>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-400 mb-1">Max Trades</label>
                          <select
                            value={riskSettings.maxTrades || 5}
                            onChange={(e) => setRiskSettings({ ...riskSettings, maxTrades: parseInt(e.target.value) })}
                            className="w-full bg-[#0a0a00] border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4AF37]/30"
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30].map(num => (
                              <option key={num} value={num}>{num}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs text-gray-400 mb-1">Duration</label>
                          <select
                            value={riskSettings.overTradingDuration || 15}
                            onChange={(e) => setRiskSettings({ ...riskSettings, overTradingDuration: parseInt(e.target.value) })}
                            className="w-full bg-[#0a0a00] border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4AF37]/30"
                          >
                            {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60].map(min => (
                              <option key={min} value={min}>{min} min</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Maximum number of trades allowed within the specified duration window
                      </p>
                    </div>
                  </div>
                </section>

                <section className="pt-6 border-t border-zinc-800">
                  <h2 className="text-lg font-semibold text-[#D4AF37] mb-4">Autopilot</h2>

                  <div className="space-y-6">
                    {/* AutoPilot Mode Selector */}
                    <div>
                      <h4 className="text-sm font-semibold text-[#D4AF37] mb-3">Autopilot Mode</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { value: 'off', label: 'Off', desc: 'Manual trading only' },
                          { value: 'semi', label: 'Semi-Auto', desc: 'Proposals require approval' },
                          { value: 'autonomous', label: 'Autonomous', desc: 'Auto-execute trades' },
                        ].map(mode => (
                          <button
                            key={mode.value}
                            onClick={() => setAutoPilotSettings({ 
                              ...autoPilotSettings, 
                              mode: mode.value as 'off' | 'semi' | 'autonomous',
                              requireConfirmation: mode.value !== 'autonomous'
                            })}
                            className={`p-3 rounded-lg border text-left transition-all ${
                              autoPilotSettings.mode === mode.value
                                ? 'bg-[#D4AF37]/20 border-[#D4AF37]/40'
                                : 'bg-[#050500] border-zinc-800 hover:border-zinc-700'
                            }`}
                          >
                            <div className={`text-sm font-medium ${autoPilotSettings.mode === mode.value ? 'text-[#D4AF37]' : 'text-white'}`}>
                              {mode.label}
                            </div>
                            <div className="text-[10px] text-gray-500">{mode.desc}</div>
                          </button>
                        ))}
                      </div>
                      {autoPilotSettings.mode === 'autonomous' && (
                        <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
                          ⚠️ Autonomous mode will execute trades automatically without confirmation
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-[#D4AF37] mb-3">Price Action Strategies</h4>
                      <div className="space-y-3">
                        <Toggle
                          label="Morning Flush"
                          enabled={tradingModels.morningFlush}
                          onChange={(val) => setTradingModels({ ...tradingModels, morningFlush: val })}
                        />
                        <Toggle
                          label="Lunch/Power Hour Flush"
                          enabled={tradingModels.lunchPowerHourFlush}
                          onChange={(val) => setTradingModels({ ...tradingModels, lunchPowerHourFlush: val })}
                        />
                        <Toggle
                          label="40/40 Club"
                          enabled={tradingModels.fortyFortyClub}
                          onChange={(val) => setTradingModels({ ...tradingModels, fortyFortyClub: val })}
                        />
                        <Toggle
                          label="Momentum Model"
                          enabled={tradingModels.momentumModel}
                          onChange={(val) => setTradingModels({ ...tradingModels, momentumModel: val })}
                        />
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-[#D4AF37] mb-3">Volatility Strategies</h4>
                      <div className="space-y-3">
                        <Toggle
                          label="22 VIX Fix"
                          enabled={tradingModels.vixFixer}
                          onChange={(val) => setTradingModels({ ...tradingModels, vixFixer: val })}
                        />
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-[#D4AF37] mb-3">Risk Event-Based Strategies</h4>
                      <div className="space-y-3">
                        <Toggle
                          label="Charged Up Rippers"
                          enabled={tradingModels.chargedUpRippers}
                          onChange={(val) => setTradingModels({ ...tradingModels, chargedUpRippers: val })}
                        />
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-[#D4AF37] mb-3">Mean Reversion</h4>
                      <div className="space-y-3">
                        <Toggle
                          label="Mean Reversion Model"
                          enabled={tradingModels.meanReversionModel}
                          onChange={(val) => setTradingModels({ ...tradingModels, meanReversionModel: val })}
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    Enable or disable specific trading models for your algorithmic strategy
                  </p>
                </section>
              </div>
            )}

            {activeTab === 'general' && (
              <div key="general" className={tabTransitioning && prevTab ? 'animate-fade-out-tab' : 'animate-fade-in-tab'}>
                <section>
                  <h3 className="text-sm font-semibold text-[#D4AF37] mb-3">Trading Symbol</h3>
                  <div className="relative">
                    {(() => {
                      const symbolKey = selectedSymbol.symbol.replace('/', '');
                      const selected = availableSymbols.find(s => s.symbol === symbolKey) || availableSymbols[0];
                      return (
                        <>
                          <button
                            onClick={() => setShowSymbolDropdown(!showSymbolDropdown)}
                            className="w-full bg-[#0a0a00] border border-zinc-800 rounded-lg px-4 py-3 text-left hover:border-[#D4AF37]/30 focus:outline-none focus:border-[#D4AF37]/30 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="text-sm font-bold text-white">{selected.symbol}</div>
                                <div className="text-xs text-gray-400">{selected.contractName}</div>
                                <div className="text-xs text-gray-500">{selected.description}</div>
                              </div>
                              <svg className="w-5 h-5 text-gray-400 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </button>
                          {showSymbolDropdown && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setShowSymbolDropdown(false)}
                              />
                              <div className="absolute left-0 right-0 top-full mt-1 bg-[#0a0a00] border border-[#D4AF37]/30 rounded-lg shadow-xl z-20 max-h-64 overflow-y-auto">
                                {availableSymbols.map(sym => {
                                  const isSelected = sym.symbol === symbolKey;
                                  return (
                                    <button
                                      key={sym.symbol}
                                      onClick={() => {
                                        setSelectedSymbol({
                                          symbol: `/${sym.symbol}`,
                                          contractName: `/${sym.contractName.replace(' ', '')}`,
                                        });
                                        setShowSymbolDropdown(false);
                                      }}
                                      className={`w-full text-left px-4 py-3 hover:bg-[#D4AF37]/10 transition-colors border-b border-zinc-800 last:border-b-0 ${isSelected ? 'bg-[#D4AF37]/20' : ''
                                        }`}
                                    >
                                      <div className="text-sm font-bold text-white">{sym.symbol}</div>
                                      <div className="text-xs text-gray-400">{sym.contractName}</div>
                                      <div className="text-xs text-gray-500">{sym.description}</div>
                                    </button>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </section>

                <section className="pt-6 border-t border-zinc-800">
                  <h3 className="text-sm font-semibold text-[#D4AF37] mb-3">Billing</h3>
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-3">Current Plan</h4>
                      <div className="bg-[#050500] border border-[#D4AF37]/30 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-lg font-bold text-[#D4AF37]">{tier.replace('_', ' ').toUpperCase()}</p>
                            <p className="text-xs text-gray-500">Active subscription</p>
                          </div>
                          <Button variant="secondary" className="text-xs">
                            Change Plan
                          </Button>
                        </div>
                        <div className="text-sm text-gray-400">
                          <p>Next billing date: <span className="text-white">Jan 4, 2026</span></p>
                          <p className="mt-1">Amount: <span className="text-white">$149.00</span></p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-3">Payment Method</h4>
                      <div className="bg-[#050500] border border-zinc-800 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center">
                              <CreditCard className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-sm text-white">•••• •••• •••• 4242</p>
                              <p className="text-xs text-gray-500">Expires 12/2027</p>
                            </div>
                          </div>
                          <Button variant="secondary" className="text-xs">
                            Update
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-3">Billing History</h4>
                      <div className="bg-[#050500] border border-zinc-800 rounded-lg overflow-hidden">
                        {[
                          { date: 'Dec 4, 2025', amount: '$149.00', status: 'Paid' },
                          { date: 'Nov 4, 2025', amount: '$149.00', status: 'Paid' },
                          { date: 'Oct 4, 2025', amount: '$149.00', status: 'Paid' },
                        ].map((invoice, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 last:border-b-0 hover:bg-[#D4AF37]/5 transition-colors"
                          >
                            <div>
                              <p className="text-sm text-white">{invoice.date}</p>
                              <p className="text-xs text-gray-500">{invoice.status}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <p className="text-sm font-semibold text-white">{invoice.amount}</p>
                              <button className="text-xs text-[#D4AF37] hover:underline">
                                Download
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-red-500 mb-3">Danger Zone</h4>
                      <div className="bg-[#050500] border border-red-500/30 rounded-lg p-4">
                        <p className="text-sm text-gray-400 mb-3">
                          Cancel your subscription. You will retain access until the end of your billing period.
                        </p>
                        <Button variant="secondary" className="text-xs text-red-500 border-red-500/30 hover:bg-red-500/10">
                          Cancel Subscription
                        </Button>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'api' && (
              <div key="api" className={tabTransitioning && prevTab ? 'animate-fade-out-tab' : 'animate-fade-in-tab'}>
                <section>
                  <h3 className="text-sm font-semibold text-[#D4AF37] mb-4">TopstepX Credentials</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-300 mb-2">Username</label>
                      <input
                        type="text"
                        value={apiKeys.topstepxUsername || ''}
                        onChange={(e) => setAPIKeys({ ...apiKeys, topstepxUsername: e.target.value })}
                        placeholder="Enter your TopstepX username"
                        className="w-full bg-[#0a0a00] border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4AF37]/30"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-2">API Key</label>
                      <input
                        type="password"
                        value={apiKeys.topstepxApiKey || ''}
                        onChange={(e) => setAPIKeys({ ...apiKeys, topstepxApiKey: e.target.value })}
                        placeholder="Enter your TopstepX API key"
                        className="w-full bg-[#0a0a00] border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4AF37]/30"
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Sign up at <a href="https://topstepx.com" target="_blank" rel="noopener noreferrer" className="text-[#D4AF37] hover:underline">topstepx.com</a> and contact support for API access
                    </p>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'gateway' && (
              <div key="gateway" className={tabTransitioning && prevTab ? 'animate-fade-out-tab' : 'animate-fade-in-tab'}>
                <GatewayTab />
              </div>
            )}

            {activeTab === 'appearance' && (
              <div key="appearance" className={tabTransitioning && prevTab ? 'animate-fade-out-tab' : 'animate-fade-in-tab'}>
                <section>
                  <h3 className="text-sm font-semibold text-[#D4AF37] mb-3">Theme</h3>
                  <p className="text-sm text-gray-500">Dark mode is the default and only theme. Additional themes coming soon.</p>
                </section>
              </div>
            )}

            {activeTab === 'desk' && (
              <div key="desk" className={tabTransitioning && prevTab ? 'animate-fade-out-tab' : 'animate-fade-in-tab'}>
                <ClawnalystDesk />
              </div>
            )}

            {activeTab === 'danger' && (
              <div key="danger" className={tabTransitioning && prevTab ? 'animate-fade-out-tab' : 'animate-fade-in-tab'}>
                <section>
                  <h3 className="text-sm font-semibold text-red-500 mb-3">Danger Zone</h3>
                  <div className="space-y-4">
                    <div className="bg-[#050500] border border-red-500/20 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-white mb-1">Reset Analysts</h4>
                      <p className="text-xs text-gray-500 mb-3">Restore all analysts to their default configuration.</p>
                      <Button variant="secondary" className="text-xs text-red-500 border-red-500/30 hover:bg-red-500/10">Reset to Defaults</Button>
                    </div>
                    <div className="bg-[#050500] border border-red-500/20 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-white mb-1">Clear All Data</h4>
                      <p className="text-xs text-gray-500 mb-3">Remove all conversations, drafts, and local settings. This cannot be undone.</p>
                      <Button variant="secondary" className="text-xs text-red-500 border-red-500/30 hover:bg-red-500/10">Clear Data</Button>
                    </div>
                    <div className="bg-[#050500] border border-red-500/20 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-white mb-1">Export Configuration</h4>
                      <p className="text-xs text-gray-500 mb-3">Download your agent and settings configuration as JSON.</p>
                      <Button variant="secondary" className="text-xs text-[#D4AF37] border-[#D4AF37]/30 hover:bg-[#D4AF37]/10">Export</Button>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'developer' && (
              <div key="developer" className={tabTransitioning && prevTab ? 'animate-fade-out-tab' : 'animate-fade-in-tab'}>
                <section>
                  <h3 className="text-sm font-semibold text-[#D4AF37] mb-3">Account Tier</h3>
                  <div className="flex gap-2">
                    {(['free', 'pulse', 'pulse_plus', 'pulse_pro'] as const).map(t => (
                      <Button
                        key={t}
                        variant={tier === t ? 'primary' : 'secondary'}
                        onClick={() => setTier(t)}
                        className="text-xs"
                      >
                        {t.replace('_', ' ').toUpperCase()}
                      </Button>
                    ))}
                  </div>
                </section>

                <section className="pt-6 border-t border-zinc-800">
                  <h3 className="text-sm font-semibold text-[#D4AF37] mb-3">Developer Settings</h3>
                  <div className="space-y-3">
                    <Toggle
                      label="Enable Mock Data Feed"
                      enabled={mockDataEnabled}
                      onChange={setMockDataEnabled}
                    />
                    <p className="text-xs text-gray-500">
                      Generates simulated market data and news items for testing
                    </p>
                    <Toggle
                      label="Show Test Trade Button"
                      enabled={developerSettings.showTestTradeButton}
                      onChange={(val) => setDeveloperSettings({ ...developerSettings, showTestTradeButton: val })}
                    />
                    <p className="text-xs text-gray-500">
                      Display test trade button for firing mock market orders to TopstepX
                    </p>
                    <Toggle
                      label="Show Mock Proposal Trigger"
                      enabled={developerSettings.showMockProposal}
                      onChange={(val) => setDeveloperSettings({ ...developerSettings, showMockProposal: val })}
                    />
                    <p className="text-xs text-gray-500">
                      Show a button on the Tape to trigger a mock trading proposal for UX testing
                    </p>
                  </div>
                </section>
              </div>
            )}
          </div>

          {/* Sticky save bar */}
          <div className="sticky bottom-0 bg-[#050500] backdrop-blur-sm border-t border-[#D4AF37]/10 px-8 py-3">
            {saveMessage && (
              <div className={`mb-3 px-4 py-2 rounded text-sm ${saveMessage.includes('success')
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                {saveMessage}
              </div>
            )}
            <div className="flex items-center justify-end gap-3">
              <Button variant="primary" onClick={handleSave} className="px-6 py-2" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Right-side hover sidebar for subsections — only when inside a section */}
      {!showLanding && (
      <div
        className="absolute right-0 top-0 bottom-0 z-30"
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
      >
        {/* Hover trigger strip (always visible) */}
        {!sidebarHovered && (
          <div className="absolute right-0 top-0 bottom-0 w-3 bg-transparent cursor-pointer">
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-1.5">
              {tabs.map((_, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all ${
                    tabs[i].id === activeTab ? 'h-4 bg-[#D4AF37]' : 'h-1.5 bg-[#D4AF37]/25'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Expanded sidebar */}
        <div
          className={`h-full bg-[#050500] border-l border-[#D4AF37]/15 flex flex-col py-5 transition-all duration-200 ease-out overflow-hidden ${
            sidebarHovered ? 'w-52 opacity-100' : 'w-0 opacity-0'
          }`}
        >
          <div className="px-4 mb-4">
            <span className="text-[10px] tracking-[0.2em] uppercase text-gray-500 font-semibold">Subsections</span>
          </div>
          <div className="flex-1 space-y-0.5 px-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                    isActive
                      ? 'bg-[#D4AF37]/15 text-[#D4AF37]'
                      : 'text-gray-400 hover:bg-[#D4AF37]/8 hover:text-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className={`text-[12px] font-medium truncate ${isActive ? 'text-[#D4AF37]' : ''}`}>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Gateway settings tab                                               */
/* ------------------------------------------------------------------ */

function GatewayTab() {
  const { status, lastHealthCheck, reconnect, gatewayUrl } = useGateway();
  const statusColor = status === 'connected' ? '#34D399' : status === 'connecting' ? '#D4AF37' : '#EF4444';
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <section>
      <h3 className="text-sm font-semibold text-[#D4AF37] mb-4">OpenClaw Gateway</h3>
      <div className="space-y-4">
        <div className="bg-[#050500] border border-[#D4AF37]/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusColor }} />
              <span className="text-sm font-medium text-white">{statusLabel}</span>
            </div>
            <button
              onClick={reconnect}
              className="text-xs text-[#D4AF37] border border-[#D4AF37]/30 rounded px-3 py-1 hover:bg-[#D4AF37]/10 transition-colors"
            >
              Reconnect
            </button>
          </div>
          <div className="text-xs text-gray-500 space-y-1">
            <p>URL: <span className="text-gray-400">{gatewayUrl}</span></p>
            {lastHealthCheck && (
              <p>Last health check: <span className="text-gray-400">{new Date(lastHealthCheck).toLocaleTimeString()}</span></p>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-500">
          The gateway connects Pulse to your OpenClaw agent sessions. Health checks run every 30 seconds.
        </p>
      </div>
    </section>
  );
}
