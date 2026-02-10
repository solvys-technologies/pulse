import {
  executiveAgentHealth,
  executiveAlerts,
  executiveKpis,
  executiveNeedToKnow,
  executiveSchedule,
} from './mockExecutiveData';

function PanelTitle({ title, tag }: { title: string; tag?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[#D4AF37]/20 px-5 py-4">
      <h2 className="text-sm font-semibold text-[#D4AF37] tracking-[0.18em] uppercase">{title}</h2>
      {tag ? (
        <span className="text-[10px] tracking-[0.22em] uppercase text-gray-500 border border-[#D4AF37]/20 rounded-full px-3 py-1 bg-[#050500]">
          {tag}
        </span>
      ) : null}
    </div>
  );
}

function Card({
  title,
  children,
  tag,
}: {
  title: string;
  tag?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#D4AF37]/15 bg-[#0a0a00] overflow-hidden">
      <PanelTitle title={title} tag={tag} />
      <div className="p-5">{children}</div>
    </div>
  );
}

export function ExecutiveDashboard() {
  return (
    <div className="h-full w-full p-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="text-xs tracking-[0.28em] uppercase text-gray-500">Pulse Executive</div>
          <h1 className="mt-2 text-2xl font-semibold text-white">Executive Dashboard</h1>
        </div>
        <div className="text-xs text-gray-500">Live Sync: Simulated</div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-8 space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {executiveKpis.map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-xl border border-[#D4AF37]/15 bg-[#0a0a00] p-5"
              >
                <div className="text-[11px] tracking-[0.22em] uppercase text-gray-500">
                  {kpi.label}
                </div>
                <div className="mt-2 text-3xl font-semibold text-white">{kpi.value}</div>
                <div className="mt-2 text-xs text-gray-400">{kpi.meta}</div>
              </div>
            ))}
          </div>

          <Card title="Alerts + Signals" tag="Priority Feed">
            <div className="space-y-3">
              {executiveAlerts.map((alert) => (
                <div
                  key={alert.title}
                  className="rounded-lg border border-[#D4AF37]/10 bg-black/20 px-4 py-3"
                >
                  <div className="text-sm font-semibold text-white">{alert.title}</div>
                  <div className="mt-1 text-xs text-gray-400">{alert.detail}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="xl:col-span-4 space-y-5">
          <Card title="Agent Health" tag="Heartbeat">
            <div className="space-y-3">
              {executiveAgentHealth.map((agent) => (
                <div
                  key={agent.name}
                  className="flex items-center justify-between rounded-lg border border-[#D4AF37]/10 bg-black/20 px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-semibold text-white">{agent.name}</div>
                    <div className="mt-1 text-xs text-gray-400">{agent.status}</div>
                  </div>
                  <div className="text-xs text-gray-500">{agent.lastCheckin}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Need-to-Know Brief" tag="Daily Summary">
            <div className="space-y-3">
              {executiveNeedToKnow.map((item) => (
                <div key={item.title} className="rounded-lg border border-[#D4AF37]/10 bg-black/20 px-4 py-3">
                  <div className="text-sm font-semibold text-white">{item.title}</div>
                  <div className="mt-1 text-xs text-gray-400">{item.detail}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Session Calendar" tag="Upcoming">
            <div className="space-y-3">
              {executiveSchedule.map((item) => (
                <div key={item.title} className="flex items-center justify-between rounded-lg border border-[#D4AF37]/10 bg-black/20 px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-white">{item.title}</div>
                    <div className="mt-1 text-xs text-gray-400">{item.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

