import { EmailMessage } from "cloudflare:email";
import { env } from "cloudflare:workers";
import { delivery } from "@domain/failures/failure";
import type { ContactMessageRepository } from "@domain/repositories/types";
import type { ContactMessage } from "@domain/value-objects/contact-message";
import { buildMimeMessage } from "./mime";

export const CONTACT_ADDRESS = "contact@contribkit.app";

const MISSING_BINDING = "CONTACT_EMAIL binding is absent";

const subjectFor = (message: ContactMessage): string => `ContribKit contact: ${message.name ?? message.email}`;

const textFor = (message: ContactMessage): string =>
	[`Name: ${message.name ?? "(not given)"}`, `Email: ${message.email}`, "", message.body].join("\n");

const messageIdFor = (date: Date): string => `<${date.getTime()}.${crypto.randomUUID()}@contribkit.app>`;

const reasonFor = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export const cloudflareContactMessageRepository: ContactMessageRepository = {
	deliver: async (message) => {
		const binding = env.CONTACT_EMAIL;
		if (!binding) return delivery(MISSING_BINDING);

		const date = new Date();
		const raw = buildMimeMessage({
			from: CONTACT_ADDRESS,
			to: CONTACT_ADDRESS,
			replyTo: message.email,
			subject: subjectFor(message),
			text: textFor(message),
			date,
			messageId: messageIdFor(date),
		});

		try {
			await binding.send(new EmailMessage(CONTACT_ADDRESS, CONTACT_ADDRESS, raw));
			return message;
		} catch (error) {
			return delivery(reasonFor(error));
		}
	},
};
