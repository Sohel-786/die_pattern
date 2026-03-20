import InwardDetailClient from "./InwardDetailClient";

// Required for `output: 'export'` builds when using a dynamic route segment (`[id]`).
// We keep it empty because the page content is client-driven and production relies on
// the backend SPA fallback (`index.html`) for the route bootstrap.
export function generateStaticParams() {
  // Pre-render a single placeholder route so static export validation passes.
  // The actual inward id page data is loaded client-side via API.
  return [{ id: "0" }];
}

export default function InwardDetailPage() {
  return <InwardDetailClient />;
}

