'use client';

import { useEffect, useState } from 'react';
import AppSidebar from '@/components/AppSidebar';
import Loader from '@/components/Loader';
import BusinessSection from '@/components/settings/BusinessSection';
import EstimateSection from '@/components/settings/EstimateSection';
import ServicesSection from '@/components/settings/ServicesSection';
import AiSection from '@/components/settings/AiSection';
import EmailSection from '@/components/settings/EmailSection';
import TemplatesSection from '@/components/settings/TemplatesSection';
import LeadRulesSection from '@/components/settings/LeadRulesSection';
import WorkspaceSection from '@/components/settings/WorkspaceSection';

const TABS = [
  { key: 'workspace', label: 'Workspace' },
  { key: 'business', label: 'Business' },
  { key: 'estimate', label: 'Estimate' },
  { key: 'services', label: 'Services & rates' },
  { key: 'email', label: 'Email' },
  { key: 'templates', label: 'Email templates' },
  { key: 'lead_rules', label: 'Lead rules' },
  { key: 'ai', label: 'AI' },
];

export default function SettingsPage() {
  const [tab, setTab] = useState('business');
  const [settings, setSettings] = useState(null);
  const [services, setServices] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    Promise.all([fetch('/api/settings'), fetch('/api/services'), fetch('/api/workspace')])
      .then(async ([settingsRes, servicesRes, workspaceRes]) => {
        const settingsData = await settingsRes.json();
        const servicesData = await servicesRes.json();
        const workspaceData = await workspaceRes.json();
        if (!settingsRes.ok) throw new Error(settingsData.error || 'Could not load settings');
        if (!servicesRes.ok) throw new Error(servicesData.error || 'Could not load services');
        if (!workspaceRes.ok) throw new Error(workspaceData.error || 'Could not load workspace');
        setSettings(settingsData.settings);
        setServices(servicesData.services);
        setWorkspace(workspaceData.workspace);
      })
      .catch((err) => setLoadError(err.message));
  }, []);

  return (
    <div className="app">
      <AppSidebar active="settings" />

      <div className="main">
        <header className="topbar">
          <div className="topbar-title">Settings</div>
        </header>

        <main className="content">
          <section className="view-pad">
            <div className="settings-wrap">
              <div className="tabs" role="tablist">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    role="tab"
                    aria-selected={tab === t.key}
                    className={`tab${tab === t.key ? ' active' : ''}`}
                    onClick={() => setTab(t.key)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {loadError && <p className="form-error">{loadError}</p>}
              {!loadError && (!settings || !services || !workspace) && <Loader label="Loading settings…" />}

              {settings && services && workspace && (
                <>
                  {tab === 'workspace' && (
                    <WorkspaceSection workspace={workspace} onSaved={setWorkspace} />
                  )}
                  {tab === 'business' && (
                    <BusinessSection settings={settings} onSaved={setSettings} />
                  )}
                  {tab === 'estimate' && (
                    <EstimateSection settings={settings} onSaved={setSettings} />
                  )}
                  {tab === 'services' && (
                    <ServicesSection services={services} onChange={setServices} />
                  )}
                  {tab === 'email' && (
                    <EmailSection settings={settings} onSaved={setSettings} />
                  )}
                  {tab === 'templates' && <TemplatesSection />}
                  {tab === 'lead_rules' && (
                    <LeadRulesSection settings={settings} onSaved={setSettings} />
                  )}
                  {tab === 'ai' && (
                    <AiSection settings={settings} onSaved={setSettings} />
                  )}
                </>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
