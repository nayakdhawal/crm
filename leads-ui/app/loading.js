import Loader from '@/components/Loader';

// Shown while a page is loading on the server (route changes, first visits).
export default function Loading() {
  return <Loader label="Loading…" fullPage />;
}
