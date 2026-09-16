import { sendContactMessage } from "@application/use-cases/send-contact-message";
import type { ContactMessageRepository } from "@domain/repositories/types";
import { cloudflareContactMessageRepository } from "@infrastructure/email/cloudflare-contact-message-repository";

export const deliverContactMessage: ContactMessageRepository["deliver"] = (message) =>
	cloudflareContactMessageRepository.deliver(message);

export const sendContact = sendContactMessage(deliverContactMessage);
