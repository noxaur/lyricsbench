import { isRouteErrorResponse, Link, useRouteError } from "react-router";

/**
 * Single error/404 page. Loader-thrown 404 Responses surface their message
 * here (invalid video ID, bad /watch link); unknown routes get the generic
 * copy. One component owns every dead-end state.
 */
export function NotFound() {
  const error = useRouteError() as unknown;
  let title = "Not found";
  let message = "That page doesn't exist. Check the link and try again.";

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = "Not found";
      const data = typeof error.data === "string" ? error.data : "";
      if (data) message = data;
    } else {
      title = `Something went wrong (${error.status})`;
      message = typeof error.data === "string" && error.data ? error.data : "Try again in a moment.";
    }
  }

  return (
    <section className="center-page">
      <h1>{title}</h1>
      <p>{message}</p>
      <Link to="/" className="btn btn-primary">
        Back home
      </Link>
    </section>
  );
}
