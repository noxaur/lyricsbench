import { Link, useRouteError, isRouteErrorResponse } from "react-router";

/** Rendered for unknown routes AND loader-thrown 404s (e.g. bad videoId). */
export function NotFound() {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : 404;
  const detail =
    isRouteErrorResponse(error) && typeof error.data === "string"
      ? error.data
      : "This page doesn't exist.";

  return (
    <section className="center-page">
      <h1>{status === 404 ? "Nothing here" : `Error ${status}`}</h1>
      <p>{detail}</p>
      <Link to="/" className="btn btn-primary" style={{ textDecoration: "none" }}>
        Back home
      </Link>
    </section>
  );
}
