import { FailureField, type InvalidInputFailure } from "@domain/failures/failure";
import {
	CONTACT_ROUTE,
	validateContactBody,
	validateContactEmail,
	validateContactName,
} from "@domain/value-objects/contact-message";
import { ElementId } from "@ui/utils/dom-contract";

export const ContactStatusTone = {
	Sent: "sent",
	Failed: "failed",
} as const;

export type ContactStatusTone = (typeof ContactStatusTone)[keyof typeof ContactStatusTone];

const SENDING_LABEL = "sending…";
const SEND_LABEL = "send";
const SENT_MESSAGE = "thanks, your message is on its way.";
const FALLBACK_ERROR = "could not send your message, try again in a moment.";

type Control = HTMLInputElement | HTMLTextAreaElement;

type Rule = (value: string) => InvalidInputFailure | null;

interface Field {
	readonly name: FailureField;
	readonly control: Control;
	readonly error: HTMLElement;
	readonly rule: Rule;
	touched: boolean;
}

interface FieldSpec {
	readonly name: FailureField;
	readonly controlId: ElementId;
	readonly errorId: ElementId;
	readonly rule: Rule;
}

const FIELD_SPECS: readonly FieldSpec[] = [
	{
		name: FailureField.Name,
		controlId: ElementId.ContactName,
		errorId: ElementId.ContactNameError,
		rule: validateContactName,
	},
	{
		name: FailureField.Email,
		controlId: ElementId.ContactEmail,
		errorId: ElementId.ContactEmailError,
		rule: validateContactEmail,
	},
	{
		name: FailureField.Message,
		controlId: ElementId.ContactMessage,
		errorId: ElementId.ContactMessageError,
		rule: validateContactBody,
	},
];

interface ErrorBody {
	error?: unknown;
	field?: unknown;
}

const messageFrom = (body: unknown): string => {
	const named = (body as ErrorBody | null)?.error;
	return typeof named === "string" && named !== "" ? named.toLowerCase() : FALLBACK_ERROR;
};

const fieldFrom = (body: unknown): string | null => {
	const named = (body as ErrorBody | null)?.field;
	return typeof named === "string" ? named : null;
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

interface ShowFieldErrorParams {
	field: Field;
	sentence: string | null;
}

const showFieldError = ({ field, sentence }: ShowFieldErrorParams): void => {
	if (sentence === null) {
		field.error.textContent = "";
		field.error.hidden = true;
		field.control.removeAttribute("aria-invalid");
		return;
	}
	field.error.textContent = sentence.toLowerCase();
	field.error.hidden = false;
	field.control.setAttribute("aria-invalid", "true");
};

const validate = (field: Field): boolean => {
	const failure = field.rule(field.control.value);
	showFieldError({ field, sentence: failure?.message ?? null });
	return failure === null;
};

const collectFields = (): Field[] =>
	FIELD_SPECS.flatMap(({ name, controlId, errorId, rule }) => {
		const control = document.getElementById(controlId) as Control | null;
		const error = document.getElementById(errorId);
		return control && error ? [{ name, control, error, rule, touched: false }] : [];
	});

export function initContactForm(): void {
	const form = document.getElementById(ElementId.ContactForm) as HTMLFormElement | null;
	const status = document.getElementById(ElementId.ContactStatus);
	const submit = document.getElementById(ElementId.ContactSubmit) as HTMLButtonElement | null;
	if (!form || !status || !submit) return;

	form.noValidate = true;
	const fields = collectFields();
	let submitted = false;
	let inFlight = false;

	for (const field of fields) {
		field.control.addEventListener("blur", () => {
			field.touched = true;
			validate(field);
		});
		field.control.addEventListener("input", () => {
			if (field.touched || submitted) validate(field);
		});
	}

	const reset = (): void => {
		form.reset();
		submitted = false;
		for (const field of fields) {
			field.touched = false;
			showFieldError({ field, sentence: null });
		}
	};

	const pointAt = (body: unknown): boolean => {
		const field = fields.find((candidate) => candidate.name === fieldFrom(body));
		if (!field) return false;
		showFieldError({ field, sentence: messageFrom(body) });
		field.control.focus();
		return true;
	};

	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		if (inFlight) return;

		submitted = true;
		status.hidden = true;
		const invalid = fields.filter((field) => {
			field.touched = true;
			return !validate(field);
		});
		if (invalid.length > 0) {
			invalid[0]?.control.focus();
			return;
		}

		inFlight = true;
		submit.disabled = true;
		submit.textContent = SENDING_LABEL;

		const values = new FormData(form);
		try {
			const response = await fetch(CONTACT_ROUTE, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: String(values.get(ElementId.ContactName) ?? ""),
					email: String(values.get(ElementId.ContactEmail) ?? ""),
					message: String(values.get(ElementId.ContactMessage) ?? ""),
					website: String(values.get(ElementId.ContactWebsite) ?? ""),
				}),
			});

			if (response.ok) {
				reset();
				announce({ status, text: SENT_MESSAGE, tone: ContactStatusTone.Sent });
			} else {
				const body = await response.json().catch(() => null);
				if (!pointAt(body)) announce({ status, text: messageFrom(body), tone: ContactStatusTone.Failed });
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
