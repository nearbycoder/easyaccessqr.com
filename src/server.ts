import { wrapFetchWithSentry } from "@sentry/tanstackstart-react";
import handler from "@tanstack/react-start/server-entry";

export default wrapFetchWithSentry({
	fetch(request: Request) {
		return handler.fetch(request);
	},
});
