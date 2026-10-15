import { MAINTAINER_EMAIL } from "astro:env/server";
import { sendContactMessage } from "@application/use-cases/send-contact-message";
import type { Failure } from "@domain/failures/failure";
import type { ContactMessageRepository } from "@domain/repositories/types";
import type { ContactMessage } from "@domain/value-objects/contact-message";
import { cloudflareContactMessageRepository } from "@infrastructure/email/cloudflare-contact-message-repository";

const repository = cloudflareContactMessageRepository(MAINTAINER_EMAIL);

export const deliverContactMessage: ContactMessageRepository["deliver"] = (
	message,
): Promise<ContactMessage | Failure> => repository.deliver(message);

export const sendContact = sendContactMessage(deliverContactMessage);
