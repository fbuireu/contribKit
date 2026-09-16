import { type Failure, isFailure } from "@domain/failures/failure";
import type { ContactMessageRepository } from "@domain/repositories/types";
import { type ContactMessage, parseContactMessage } from "@domain/value-objects/contact-message";

type DeliverContactMessage = ContactMessageRepository["deliver"];

export interface SendContactMessageParams {
	name?: string | null;
	email: string;
	body: string;
}

export const sendContactMessage =
	(deliver: DeliverContactMessage) =>
	async ({ name, email, body }: SendContactMessageParams): Promise<ContactMessage | Failure> => {
		const message = parseContactMessage({ name, email, body });
		if (isFailure(message)) return message;

		return deliver(message);
	};
