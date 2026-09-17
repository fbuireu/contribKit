import { describe, expect, it } from "vitest";
import { isFailure } from "../failures/failure";
import {
	type ContactMessage,
	isContactMessage,
	MAX_CONTACT_BODY_LENGTH,
	MAX_CONTACT_EMAIL_LENGTH,
	MAX_CONTACT_NAME_LENGTH,
	MIN_CONTACT_BODY_LENGTH,
	parseContactMessage,
	validateContactBody,
	validateContactEmail,
	validateContactName,
} from "./contact-message";

const BODY = "a".repeat(MIN_CONTACT_BODY_LENGTH);

type Parsed = ReturnType<typeof parseContactMessage>;

const parsed = (message: Parsed): ContactMessage => {
	expect(isContactMessage(message)).toBe(true);
	return message as ContactMessage;
};

const fieldOf = (value: Parsed | null): string => {
	expect(isFailure(value)).toBe(true);
	return (value as { field: string }).field;
};

describe("parseContactMessage", () => {
	it("trims every field and keeps what is left", () => {
		const message = parsed(parseContactMessage({ name: "  Ada  ", email: "  ada@example.com ", body: `  ${BODY}  ` }));

		expect(message).toEqual({ _tag: "ContactMessage", name: "Ada", email: "ada@example.com", body: BODY });
	});

	it("reads an absent or blank name as null rather than as an empty string", () => {
		expect(parsed(parseContactMessage({ email: "ada@example.com", body: BODY })).name).toBeNull();
		expect(parsed(parseContactMessage({ name: "   ", email: "ada@example.com", body: BODY })).name).toBeNull();
		expect(parsed(parseContactMessage({ name: null, email: "ada@example.com", body: BODY })).name).toBeNull();
	});

	it("keeps the line breaks a message is written with", () => {
		const body = `first line\r\nsecond line\nthird`;

		expect(parsed(parseContactMessage({ email: "ada@example.com", body })).body).toBe(body);
	});

	it("rejects a name longer than the limit, naming the field", () => {
		const failure = parseContactMessage({
			name: "a".repeat(MAX_CONTACT_NAME_LENGTH + 1),
			email: "ada@example.com",
			body: BODY,
		});

		expect(fieldOf(failure)).toBe("name");
	});

	it("accepts a name exactly at the limit", () => {
		const name = "a".repeat(MAX_CONTACT_NAME_LENGTH);

		expect(parsed(parseContactMessage({ name, email: "ada@example.com", body: BODY })).name).toBe(name);
	});

	it("rejects an email with no dot in its domain, more than one @, or none at all", () => {
		for (const email of ["ada@example", "ada@@example.com", "a@b@example.com", "example.com", "ada"]) {
			expect(fieldOf(parseContactMessage({ email, body: BODY })), email).toBe("email");
		}
	});

	it("rejects an email carrying whitespace, angle brackets or a quote, which is the header-injection guard", () => {
		for (const email of [
			"ada@example.com\r\nBcc: victim@example.com",
			"ada@example.com\nBcc: victim@example.com",
			"ada <ada@example.com>",
			'"ada"@example.com',
			"ada @example.com",
		]) {
			expect(fieldOf(parseContactMessage({ email, body: BODY })), email).toBe("email");
		}
	});

	it("rejects an email longer than the limit even when it is otherwise well formed", () => {
		const local = "a".repeat(MAX_CONTACT_EMAIL_LENGTH);

		expect(fieldOf(parseContactMessage({ email: `${local}@example.com`, body: BODY }))).toBe("email");
	});

	it("accepts the ordinary shapes a real address takes", () => {
		for (const email of ["ada+tag@example.co.uk", "ada.lovelace@sub.example.com", "a@b.co"]) {
			expect(parsed(parseContactMessage({ email, body: BODY })).email, email).toBe(email);
		}
	});

	it("rejects a message shorter than the floor, so an empty one never leaves", () => {
		expect(fieldOf(parseContactMessage({ email: "ada@example.com", body: "hi" }))).toBe("message");
		expect(fieldOf(parseContactMessage({ email: "ada@example.com", body: "   " }))).toBe("message");
	});

	it("rejects a message longer than the ceiling, and accepts one exactly at it", () => {
		const atLimit = "a".repeat(MAX_CONTACT_BODY_LENGTH);

		expect(parsed(parseContactMessage({ email: "ada@example.com", body: atLimit })).body).toBe(atLimit);
		expect(fieldOf(parseContactMessage({ email: "ada@example.com", body: `${atLimit}a` }))).toBe("message");
	});
});

describe("the per-field rules", () => {
	it("are the same rules the parser applies, one field at a time, so a form can run them on blur", () => {
		expect(validateContactName("Ada")).toBeNull();
		expect(validateContactName(null)).toBeNull();
		expect(fieldOf(validateContactName("a".repeat(MAX_CONTACT_NAME_LENGTH + 1)))).toBe("name");
		expect(validateContactEmail("ada@example.com")).toBeNull();
		expect(fieldOf(validateContactEmail("ada@example"))).toBe("email");
		expect(validateContactBody(BODY)).toBeNull();
		expect(fieldOf(validateContactBody("hi"))).toBe("message");
	});

	it("tell an empty required field apart from a malformed one, in the sentence rather than the field", () => {
		const empty = validateContactEmail("   ");
		const malformed = validateContactEmail("ada");
		const blank = validateContactBody("");
		const short = validateContactBody("hi");

		expect(fieldOf(empty)).toBe("email");
		expect(fieldOf(malformed)).toBe("email");
		expect((empty as { message: string }).message).not.toBe((malformed as { message: string }).message);
		expect(fieldOf(blank)).toBe("message");
		expect(fieldOf(short)).toBe("message");
		expect((blank as { message: string }).message).not.toBe((short as { message: string }).message);
	});

	it("reject in the parser's order: name, then email, then body", () => {
		const everythingWrong = parseContactMessage({ name: "a".repeat(MAX_CONTACT_NAME_LENGTH + 1), email: "", body: "" });
		const nameFine = parseContactMessage({ name: "Ada", email: "", body: "" });

		expect(fieldOf(everythingWrong)).toBe("name");
		expect(fieldOf(nameFine)).toBe("email");
	});
});

describe("isContactMessage", () => {
	it("recognises what the parser builds and nothing else", () => {
		expect(isContactMessage(parseContactMessage({ email: "ada@example.com", body: BODY }))).toBe(true);
		expect(isContactMessage({ email: "ada@example.com", body: BODY })).toBe(false);
		expect(isContactMessage(null)).toBe(false);
		expect(isContactMessage("ContactMessage")).toBe(false);
	});
});
