import { EmailMessage } from "cloudflare:email";
import { env } from "cloudflare:workers";
import { delivery } from "@domain/failures/failure";
import type { ContactMessageRepository } from "@domain/repositories/types";
import type { ContactMessage } from "@domain/value-objects/contact-message";
import { errorMessageOf } from "../errors/error-message";
import { buildMimeMessage } from "./mime";

export const CONTACT_SENDER = "contact@contribkit.app";

const MISSING_BINDING = "CONTACT_EMAIL binding is absent";

const subjectFor = (message: ContactMessage): string => `ContribKit contact: ${message.name ?? message.email}`;

const textFor = (message: ContactMessage): string =>
	[`Name: ${message.name ?? "(not given)"}`, `Email: ${message.email}`, "", message.body].join("\n");

const messageIdFor = (date: Date): string => `<${date.getTime()}.${crypto.randomUUID()}@contribkit.app>`;

export const cloudflareContactMessageRepository = (destination: string): ContactMessageRepository => ({
	deliver: async (message) => {
		const binding = env.CONTACT_EMAIL;
		if (!binding) return delivery(MISSING_BINDING);

		const date = new Date();
		const raw = buildMimeMessage({
			from: CONTACT_SENDER,
			to: destination,
			replyTo: message.email,
			subject: subjectFor(message),
			text: textFor(message),
			date,
			messageId: messageIdFor(date),
		});

		try {
			await binding.send(new EmailMessage(CONTACT_SENDER, destination, raw));
			return message;
		} catch (error) {
			return delivery(errorMessageOf(error));
		}
	},
});
