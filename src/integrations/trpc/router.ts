import { createTRPCRouter } from "./init";
import { orgRouter } from "./routers/org";
import { profileRouter } from "./routers/profile";
import { qrCodesRouter } from "./routers/qr-codes";

export const trpcRouter = createTRPCRouter({
	qrCodes: qrCodesRouter,
	org: orgRouter,
	profile: profileRouter,
});

export type TRPCRouter = typeof trpcRouter;
