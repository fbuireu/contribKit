import { type Failure, FailureField, invalidInput } from "../failures/failure";

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

export interface ParseContactMessageParams {
	name?: string | null;
	email: string;
	body: string;
}

export const parseContactMessage = ({ name, email, body }: ParseContactMessageParams): ContactMessage | Failure => {
	const trimmedName = (name ?? "").trim();
	const trimmedEmail = email.trim();
	const trimmedBody = body.trim();

	if (trimmedName.length > MAX_CONTACT_NAME_LENGTH) {
		return invalidInput({
			field: FailureField.Name,
			message: `Name must be ${MAX_CONTACT_NAME_LENGTH} characters or fewer`,
		});
	}
	if (trimmedEmail.length > MAX_CONTACT_EMAIL_LENGTH || !CONTACT_EMAIL_REGEX.test(trimmedEmail)) {
		return invalidInput({ field: FailureField.Email, message: "Enter a valid email address" });
	}
	if (trimmedBody.length < MIN_CONTACT_BODY_LENGTH) {
		return invalidInput({
			field: FailureField.Message,
			message: `Message must be at least ${MIN_CONTACT_BODY_LENGTH} characters`,
		});
	}
	if (trimmedBody.length > MAX_CONTACT_BODY_LENGTH) {
		return invalidInput({
			field: FailureField.Message,
			message: `Message must be ${MAX_CONTACT_BODY_LENGTH} characters or fewer`,
		});
	}

	return {
		_tag: "ContactMessage",
		name: trimmedName === "" ? null : trimmedName,
		email: trimmedEmail,
		body: trimmedBody,
	};
};

export const isContactMessage = (value: unknown): value is ContactMessage =>
	typeof value === "object" && value !== null && (value as { _tag?: unknown })._tag === "ContactMessage";
