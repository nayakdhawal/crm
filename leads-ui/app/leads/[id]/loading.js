import AppSidebar from '@/components/AppSidebar';
import Loader from '@/components/Loader';

// Shown while a lead's details are loading (opening a lead from the list, or a direct link).
export default function LeadLoading() {
  return (
    <div className="app">
      <AppSidebar active="leads" />
      <div className="main">
        <header className="topbar">
          <div className="topbar-title">Lead</div>
        </header>
        <main className="content">
          <section className="view-pad">
            <Loader label="Opening lead…" />
          </section>
        </main>
      </div>
    </div>
  );
}
