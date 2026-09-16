import { beforeEach, describe, expect, it, vi } from "vitest";

const { env, sent } = vi.hoisted(() => ({
	env: {} as { CONTACT_EMAIL?: { send: (message: unknown) => Promise<void> } },
	sent: [] as { from: string; to: string; raw: string }[],
}));

vi.mock("cloudflare:workers", () => ({ env }));
vi.mock("cloudflare:email", () => ({
	EmailMessage: class {
		constructor(from: string, to: string, raw: string) {
			sent.push({ from, to, raw });
		}
	},
}));

import { isFailure } from "@domain/failures/failure";
import type { ContactMessage } from "@domain/value-objects/contact-message";
import { CONTACT_ADDRESS, cloudflareContactMessageRepository } from "./cloudflare-contact-message-repository";

const message = (overrides: Partial<ContactMessage> = {}): ContactMessage => ({
	_tag: "ContactMessage",
	name: "Ada",
	email: "ada@example.com",
	body: "a message long enough to send",
	...overrides,
});

const headersOf = (raw: string): string => raw.split("\r\n\r\n")[0];

const decodedBody = (raw: string): string =>
	new TextDecoder().decode(
		Uint8Array.from(atob(raw.split("\r\n\r\n").slice(1).join("").replaceAll("\r\n", "")), (character) =>
			character.charCodeAt(0),
		),
	);

const kindOf = (value: unknown): string => {
	expect(isFailure(value)).toBe(true);
	return (value as { kind: string }).kind;
};

describe("cloudflareContactMessageRepository", () => {
	beforeEach(() => {
		sent.length = 0;
		env.CONTACT_EMAIL = { send: vi.fn(async () => undefined) };
	});

	it("constructs the EmailMessage from and to the one address the binding may reach", async () => {
		await cloudflareContactMessageRepository.deliver(message());

		expect(sent).toHaveLength(1);
		expect(sent[0].from).toBe(CONTACT_ADDRESS);
		expect(sent[0].to).toBe(CONTACT_ADDRESS);
		expect(CONTACT_ADDRESS).toBe("contact@contribkit.app");
	});

	it("points Reply-To at the visitor, which is the only way an answer reaches them", async () => {
		await cloudflareContactMessageRepository.deliver(message());

		expect(headersOf(sent[0].raw)).toContain("Reply-To: ada@example.com");
	});

	it("carries the name, the address and then the message itself in the body", async () => {
		await cloudflareContactMessageRepository.deliver(message({ body: "please add a palette" }));

		expect(decodedBody(sent[0].raw)).toBe("Name: Ada\nEmail: ada@example.com\n\nplease add a palette");
	});

	it("says so rather than inventing a name when none was given", async () => {
		await cloudflareContactMessageRepository.deliver(message({ name: null }));

		expect(decodedBody(sent[0].raw)).toContain("Name: (not given)");
		expect(headersOf(sent[0].raw)).toContain("=?UTF-8?B?");
	});

	it("cannot have a name add a header, because every header value loses its line breaks", async () => {
		await cloudflareContactMessageRepository.deliver(message({ name: "Ada\r\nBcc: victim@example.com" }));

		expect(headersOf(sent[0].raw)).not.toContain("Bcc:");
		expect(headersOf(sent[0].raw).split("\r\n")).toHaveLength(9);
	});

	it("echoes the message back on success, the way fetchCalendar returns the calendar", async () => {
		const sending = message();

		expect(await cloudflareContactMessageRepository.deliver(sending)).toBe(sending);
	});

	it("answers Delivery when the binding is absent, which is every local run", async () => {
		env.CONTACT_EMAIL = undefined;

		const result = await cloudflareContactMessageRepository.deliver(message());

		expect(kindOf(result)).toBe("Delivery");
		expect(sent).toHaveLength(0);
	});

	it("answers Delivery carrying the platform's own reason when send rejects", async () => {
		env.CONTACT_EMAIL = {
			send: vi.fn(async () => {
				throw new Error("destination address not verified");
			}),
		};

		const result = await cloudflareContactMessageRepository.deliver(message());

		expect(result).toEqual({ kind: "Delivery", message: "destination address not verified" });
	});

	it("describes a thrown non-Error rather than dropping the reason", async () => {
		env.CONTACT_EMAIL = {
			send: vi.fn(async () => {
				throw "refused";
			}),
		};

		expect(await cloudflareContactMessageRepository.deliver(message())).toEqual({
			kind: "Delivery",
			message: "refused",
		});
	});
});
