// Loading indicators shared across the app.
//   <Loader label="Loading leads…" />             centred block for a section
//   <Loader fullPage />                           whole-page fallback (used by app/loading.js)
//   <Loader label="Saving…" color="#15803D" />    custom colour
//   <Spinner small />                             inline, inside a button
//   <SkeletonRows rows={5} cols={5} />            placeholder rows inside a table while it loads
import { MorphingSquare } from "@/components/ui/morphing-square";

export function Spinner({ small = false }) {
  return <span className={`spinner${small ? ' spinner-sm' : ''}`} aria-hidden="true" />;
}

export default function Loader({ label = 'Loading…', fullPage = false, color }) {
  return (
    <div className={`loader${fullPage ? ' loader-full' : ''}`}>
      <MorphingSquare message={label} color={color} />
    </div>
  );
}

export function SkeletonRows({ rows = 5, cols = 5 }) {
  return Array.from({ length: rows }, (_, r) => (
    <tr key={r} aria-hidden="true">
      {Array.from({ length: cols }, (_, c) => (
        <td key={c}>
          <span className={`skeleton ${c === 0 ? 'skeleton-wide' : 'skeleton-short'}`} />
        </td>
      ))}
    </tr>
  ));
}
