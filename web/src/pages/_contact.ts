import { MAINTAINER_EMAIL } from "astro:env/server";
import { sendContactMessage } from "@application/use-cases/send-contact-message";
import type { ContactMessageRepository } from "@domain/repositories/types";
import { cloudflareContactMessageRepository } from "@infrastructure/email/cloudflare-contact-message-repository";

const repository = cloudflareContactMessageRepository(MAINTAINER_EMAIL);

export const deliverContactMessage: ContactMessageRepository["deliver"] = (message) => repository.deliver(message);

export const sendContact = sendContactMessage(deliverContactMessage);
