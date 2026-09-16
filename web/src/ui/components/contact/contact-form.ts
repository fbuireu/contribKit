import { ElementId } from "@ui/utils/dom-contract";

export const CONTACT_ENDPOINT = "/api/contact";

export const ContactStatusTone = {
	Sent: "sent",
	Failed: "failed",
} as const;

export type ContactStatusTone = (typeof ContactStatusTone)[keyof typeof ContactStatusTone];

const SENDING_LABEL = "sending…";
const SEND_LABEL = "send";
const SENT_MESSAGE = "thanks, your message is on its way.";
const FALLBACK_ERROR = "could not send your message, try again in a moment.";

interface ErrorBody {
	error?: unknown;
}

const messageFrom = (body: unknown): string => {
	const named = (body as ErrorBody | null)?.error;
	return typeof named === "string" && named !== "" ? named.toLowerCase() : FALLBACK_ERROR;
};

interface AnnounceParams {
	status: HTMLElement;
	text: string;
	tone: ContactStatusTone;
}

const announce = ({ status, text, tone }: AnnounceParams): void => {
	status.textContent = text;
	status.dataset.tone = tone;
	status.hidden = false;
};

export function initContactForm(): void {
	const form = document.getElementById(ElementId.ContactForm) as HTMLFormElement | null;
	const status = document.getElementById(ElementId.ContactStatus);
	const submit = document.getElementById(ElementId.ContactSubmit) as HTMLButtonElement | null;
	if (!form || !status || !submit) return;

	let inFlight = false;

	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		if (inFlight) return;
		inFlight = true;
		submit.disabled = true;
		submit.textContent = SENDING_LABEL;
		status.hidden = true;

		const fields = new FormData(form);
		try {
			const response = await fetch(CONTACT_ENDPOINT, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: String(fields.get(ElementId.ContactName) ?? ""),
					email: String(fields.get(ElementId.ContactEmail) ?? ""),
					message: String(fields.get(ElementId.ContactMessage) ?? ""),
					website: String(fields.get(ElementId.ContactWebsite) ?? ""),
				}),
			});

			if (response.ok) {
				form.reset();
				announce({ status, text: SENT_MESSAGE, tone: ContactStatusTone.Sent });
			} else {
				const body = await response.json().catch(() => null);
				announce({ status, text: messageFrom(body), tone: ContactStatusTone.Failed });
			}
		} catch {
			announce({ status, text: FALLBACK_ERROR, tone: ContactStatusTone.Failed });
		} finally {
			inFlight = false;
			submit.disabled = false;
			submit.textContent = SEND_LABEL;
		}
	});
}
