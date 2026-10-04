import { NOT_CACHEABLE } from "@application/http/cache-control";
import { fieldFor, messageFor, reasonFor, statusFor } from "@application/http/failure-http";
import {
	logContactFailure,
	logServerError,
	SERVER_ERROR_MESSAGE,
	SERVER_ERROR_STATUS,
} from "@application/http/failure-log";
import { isFailure } from "@domain/failures/failure";
import { logger } from "@infrastructure/logging/logger";
import type { APIRoute } from "astro";
import { z } from "astro/zod";
import { sendContact } from "../_contact";

export const prerender = false;

const ACCEPTED_STATUS = 202;
const INVALID_BODY_STATUS = 400;

const contactMessageSchema = z.object({
	name: z.string().optional(),
	email: z.string(),
	message: z.string(),
	website: z.string().optional(),
});

const uncacheable = { "Cache-Control": NOT_CACHEABLE };

const accepted = (): Response =>
	Response.json({ status: "accepted" }, { status: ACCEPTED_STATUS, headers: uncacheable });

const handle: APIRoute = async ({ request }) => {
	const payload: unknown = await request.json().catch(() => null);
	if (!contactMessageSchema.validate(payload)) {
		return Response.json({ error: "Invalid request body" }, { status: INVALID_BODY_STATUS, headers: uncacheable });
	}

	if ((payload.website ?? "").trim() !== "") return accepted();

	const result = await sendContact({ name: payload.name, email: payload.email, body: payload.message });
	if (isFailure(result)) {
		const status = statusFor(result);
		logContactFailure({
			logger,
			kind: result.kind,
			status,
			reason: reasonFor(result),
		});
		return Response.json({ error: messageFor(result), ...fieldFor(result) }, { status, headers: uncacheable });
	}

	return accepted();
};

export const POST: APIRoute = async (context) => {
	try {
		return await handle(context);
	} catch (error) {
		logServerError({ logger, error, path: context.url.pathname });
		return Response.json({ error: SERVER_ERROR_MESSAGE }, { status: SERVER_ERROR_STATUS, headers: uncacheable });
	}
};
