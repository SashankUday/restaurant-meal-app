import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <main className="status-card not-found">
      <p className="eyebrow">404</p>
      <p className="empty-title">That table is not on our floor plan.</p>
      <Link className="btn-primary link-button" to="/">Find a dish</Link>
    </main>
  );
}
