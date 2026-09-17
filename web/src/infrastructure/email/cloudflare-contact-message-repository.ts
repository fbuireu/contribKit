import { EmailMessage } from "cloudflare:email";
import { env } from "cloudflare:workers";
import { delivery } from "@domain/failures/failure";
import type { ContactMessageRepository } from "@domain/repositories/types";
import type { ContactMessage } from "@domain/value-objects/contact-message";
import { render } from "@react-email/render";
import { errorMessageOf } from "../errors/error-message";
import { ContactMessageEmail } from "./ContactMessageEmail";
import { buildMimeMessage } from "./mime";

export const CONTACT_SENDER = "contact@contribkit.app";

const SITE = CONTACT_SENDER.slice(CONTACT_SENDER.indexOf("@") + 1);

const MISSING_BINDING = "CONTACT_EMAIL binding is absent";

const subjectFor = (message: ContactMessage): string => `ContribKit contact: ${message.name ?? message.email}`;

const messageIdFor = (date: Date): string => `<${date.getTime()}.${crypto.randomUUID()}@${SITE}>`;

interface RenderedEmail {
	text: string;
	html: string;
}

interface RenderEmailParams {
	message: ContactMessage;
	date: Date;
}

const renderEmail = async ({ message, date }: RenderEmailParams): Promise<RenderedEmail> => {
	const element = ContactMessageEmail({ message, sentAt: date.toUTCString(), site: SITE });
	const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
	return { html, text };
};

export const cloudflareContactMessageRepository = (destination: string): ContactMessageRepository => ({
	deliver: async (message) => {
		const binding = env.CONTACT_EMAIL;
		if (!binding) return delivery(MISSING_BINDING);

		try {
			const date = new Date();
			const { text, html } = await renderEmail({ message, date });
			const raw = buildMimeMessage({
				from: CONTACT_SENDER,
				to: destination,
				replyTo: message.email,
				subject: subjectFor(message),
				text,
				html,
				date,
				messageId: messageIdFor(date),
				boundary: `=_${crypto.randomUUID()}`,
			});
			await binding.send(new EmailMessage(CONTACT_SENDER, destination, raw));
			return message;
		} catch (error) {
			return delivery(errorMessageOf(error));
		}
	},
});
