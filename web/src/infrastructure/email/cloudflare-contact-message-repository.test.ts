import { beforeEach, describe, expect, it, vi } from "vitest";

const { env, sent, template } = vi.hoisted(() => ({
	env: {} as { CONTACT_EMAIL?: { send: (message: unknown) => Promise<void> } },
	sent: [] as { from: string; to: string; raw: string }[],
	template: { defect: false },
}));

vi.mock("cloudflare:workers", () => ({ env }));
vi.mock("@react-email/render", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@react-email/render")>();
	return {
		...actual,
		render: (...params: Parameters<typeof actual.render>) => {
			if (template.defect) throw new Error("the template exploded");
			return actual.render(...params);
		},
	};
});
vi.mock("cloudflare:email", () => ({
	EmailMessage: class {
		constructor(from: string, to: string, raw: string) {
			sent.push({ from, to, raw });
		}
	},
}));

import type { ContactMessage } from "@domain/value-objects/contact-message";
import { CONTACT_SENDER, cloudflareContactMessageRepository } from "./cloudflare-contact-message-repository";

const DESTINATION = "maintainer@example.com";

const repository = cloudflareContactMessageRepository(DESTINATION);

const message = (overrides: Partial<ContactMessage> = {}): ContactMessage => ({
	_tag: "ContactMessage",
	name: "Ada",
	email: "ada@example.com",
	body: "a message long enough to send",
	...overrides,
});

const headersOf = (raw: string): string => raw.split("\r\n\r\n")[0];

const decodedParts = (raw: string): string[] => {
	const boundary = /boundary="([^"]+)"/.exec(headersOf(raw))?.[1] ?? "";
	return raw
		.split("\r\n\r\n")
		.slice(1)
		.join("\r\n\r\n")
		.split(`--${boundary}`)
		.slice(1, -1)
		.map((part) =>
			new TextDecoder().decode(
				Uint8Array.from(atob(part.trim().split("\r\n\r\n").slice(1).join("").replaceAll("\r\n", "")), (character) =>
					character.charCodeAt(0),
				),
			),
		);
};

const subjectOf = (raw: string): string => {
	const encoded = /^Subject: =\?UTF-8\?B\?([A-Za-z0-9+/=]+)\?=$/m.exec(headersOf(raw))?.[1] ?? "";
	return new TextDecoder().decode(Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0)));
};

describe("cloudflareContactMessageRepository", () => {
	beforeEach(() => {
		sent.length = 0;
		template.defect = false;
		env.CONTACT_EMAIL = { send: vi.fn(async () => undefined) };
	});

	it("sends from the zone's own address to the destination it was built with", async () => {
		await repository.deliver(message());

		expect(sent).toHaveLength(1);
		expect(sent[0].from).toBe(CONTACT_SENDER);
		expect(sent[0].to).toBe(DESTINATION);
		expect(CONTACT_SENDER).toBe("contact@contribkit.app");
	});

	it("points Reply-To at the visitor, which is the only way an answer reaches them", async () => {
		await repository.deliver(message());

		expect(headersOf(sent[0].raw)).toContain("Reply-To: ada@example.com");
	});

	it("carries the rendered email twice, as plain text and as HTML, each naming the sender and the message", async () => {
		await repository.deliver(message({ body: "please add a palette" }));

		const [text, html] = decodedParts(sent[0].raw);
		expect(headersOf(sent[0].raw)).toContain("Content-Type: multipart/alternative");
		expect(text).toContain("Ada");
		expect(text).toContain("ada@example.com");
		expect(text).toContain("please add a palette");
		expect(html).toContain("<html");
		expect(html).toContain("please add a palette");
		expect(html).toContain("mailto:ada@example.com");
	});

	it("says so rather than inventing a name when none was given, and subjects it by the address", async () => {
		await repository.deliver(message({ name: null }));

		expect(decodedParts(sent[0].raw)[0]).toContain("(not given)");
		expect(subjectOf(sent[0].raw)).toBe("ContribKit contact: ada@example.com");
	});

	it("subjects a named message by the name", async () => {
		await repository.deliver(message());

		expect(subjectOf(sent[0].raw)).toBe("ContribKit contact: Ada");
	});

	it("cannot have a name add a header, because every header value loses its line breaks", async () => {
		await repository.deliver(message({ name: "Ada\r\nBcc: victim@example.com" }));

		expect(headersOf(sent[0].raw)).not.toContain("Bcc:");
		expect(headersOf(sent[0].raw).split("\r\n")).toHaveLength(8);
	});

	it("echoes the message back on success, the way fetchCalendar returns the calendar", async () => {
		const sending = message();

		expect(await repository.deliver(sending)).toBe(sending);
	});

	it("throws when the binding is absent, because that is configuration and not a refused send", async () => {
		env.CONTACT_EMAIL = undefined;

		await expect(repository.deliver(message())).rejects.toThrow("CONTACT_EMAIL binding is absent");
		expect(sent).toHaveLength(0);
	});

	it("throws when the template fails to render, because that is a defect and not a refused send", async () => {
		template.defect = true;

		await expect(repository.deliver(message())).rejects.toThrow("the template exploded");
		expect(sent).toHaveLength(0);
	});

	it("answers Delivery carrying the platform's own reason when send rejects", async () => {
		env.CONTACT_EMAIL = {
			send: vi.fn(async () => {
				throw new Error("destination address not verified");
			}),
		};

		const result = await repository.deliver(message());

		expect(result).toEqual({ kind: "Delivery", message: "destination address not verified" });
	});

	it("describes a thrown non-Error rather than dropping the reason", async () => {
		env.CONTACT_EMAIL = {
			send: vi.fn(async () => {
				throw "refused";
			}),
		};

		expect(await repository.deliver(message())).toEqual({
			kind: "Delivery",
			message: "refused",
		});
	});
});
