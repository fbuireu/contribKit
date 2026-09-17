import { type Failure, FailureField, type InvalidInputFailure, invalidInput } from "../failures/failure";

export const CONTACT_ROUTE = "/api/contact";

export const MAX_CONTACT_NAME_LENGTH = 80;
export const MAX_CONTACT_EMAIL_LENGTH = 254;
export const MIN_CONTACT_BODY_LENGTH = 10;
export const MAX_CONTACT_BODY_LENGTH = 4000;

const CONTACT_EMAIL_REGEX = /^[^\s<>"@]+@[^\s<>"@.]+(?:\.[^\s<>"@.]+)+$/;

export interface ContactMessage {
	readonly _tag: "ContactMessage";
	readonly name: string | null;
	readonly email: string;
	readonly body: string;
}

export const validateContactName = (name: string | null | undefined): InvalidInputFailure | null => {
	if ((name ?? "").trim().length > MAX_CONTACT_NAME_LENGTH) {
		return invalidInput({
			field: FailureField.Name,
			message: `Name must be ${MAX_CONTACT_NAME_LENGTH} characters or fewer`,
		});
	}
	return null;
};

export const validateContactEmail = (email: string): InvalidInputFailure | null => {
	const trimmed = email.trim();
	if (trimmed === "") {
		return invalidInput({ field: FailureField.Email, message: "Enter your email address" });
	}
	if (trimmed.length > MAX_CONTACT_EMAIL_LENGTH || !CONTACT_EMAIL_REGEX.test(trimmed)) {
		return invalidInput({ field: FailureField.Email, message: "Enter a valid email address" });
	}
	return null;
};

export const validateContactBody = (body: string): InvalidInputFailure | null => {
	const trimmed = body.trim();
	if (trimmed === "") {
		return invalidInput({ field: FailureField.Message, message: "Write a message" });
	}
	if (trimmed.length < MIN_CONTACT_BODY_LENGTH) {
		return invalidInput({
			field: FailureField.Message,
			message: `Message must be at least ${MIN_CONTACT_BODY_LENGTH} characters`,
		});
	}
	if (trimmed.length > MAX_CONTACT_BODY_LENGTH) {
		return invalidInput({
			field: FailureField.Message,
			message: `Message must be ${MAX_CONTACT_BODY_LENGTH} characters or fewer`,
		});
	}
	return null;
};

export interface ParseContactMessageParams {
	name?: string | null;
	email: string;
	body: string;
}

export const parseContactMessage = ({ name, email, body }: ParseContactMessageParams): ContactMessage | Failure => {
	const rejected = validateContactName(name) ?? validateContactEmail(email) ?? validateContactBody(body);
	if (rejected) return rejected;

	const trimmedName = (name ?? "").trim();
	return {
		_tag: "ContactMessage",
		name: trimmedName === "" ? null : trimmedName,
		email: email.trim(),
		body: body.trim(),
	};
};

export const isContactMessage = (value: unknown): value is ContactMessage =>
	typeof value === "object" && value !== null && (value as { _tag?: unknown })._tag === "ContactMessage";
