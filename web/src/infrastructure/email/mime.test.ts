import { describe, expect, it } from "vitest";
import { buildMimeMessage } from "./mime";

const DATE = new Date(Date.UTC(2026, 8, 16, 9, 30, 0));

const build = (overrides: Partial<Parameters<typeof buildMimeMessage>[0]> = {}): string =>
	buildMimeMessage({
		from: "contact@contribkit.app",
		to: "contact@contribkit.app",
		replyTo: "ada@example.com",
		subject: "ContribKit contact: Ada",
		text: "Name: Ada\nEmail: ada@example.com\n\nhello",
		date: DATE,
		messageId: "<1.2@contribkit.app>",
		...overrides,
	});

const headersOf = (raw: string): string => raw.split("\r\n\r\n")[0];

const bodyOf = (raw: string): string => raw.split("\r\n\r\n").slice(1).join("\r\n\r\n");

const decoded = (raw: string): string =>
	new TextDecoder().decode(
		Uint8Array.from(atob(bodyOf(raw).replaceAll("\r\n", "")), (character) => character.charCodeAt(0)),
	);

describe("buildMimeMessage", () => {
	it("writes the RFC 5322 headers in order, separated by CRLF", () => {
		const lines = headersOf(build()).split("\r\n");

		expect(lines.map((line) => line.split(":")[0])).toEqual([
			"From",
			"To",
			"Reply-To",
			"Subject",
			"Date",
			"Message-ID",
			"MIME-Version",
			"Content-Type",
			"Content-Transfer-Encoding",
		]);
	});

	it("declares utf-8 text encoded as base64", () => {
		const headers = headersOf(build());

		expect(headers).toContain("MIME-Version: 1.0");
		expect(headers).toContain("Content-Type: text/plain; charset=utf-8");
		expect(headers).toContain("Content-Transfer-Encoding: base64");
	});

	it("names the sender, the recipient and the address a reply goes to", () => {
		const headers = headersOf(build());

		expect(headers).toContain("From: contact@contribkit.app");
		expect(headers).toContain("To: contact@contribkit.app");
		expect(headers).toContain("Reply-To: ada@example.com");
	});

	it("dates the message and gives it an id", () => {
		const headers = headersOf(build());

		expect(headers).toContain(`Date: ${DATE.toUTCString()}`);
		expect(headers).toContain("Message-ID: <1.2@contribkit.app>");
	});

	it("encodes the subject as an RFC 2047 word, so a non-ASCII one survives", () => {
		const raw = build({ subject: "ContribKit contact: Ámbar" });
		const encoded = /^Subject: =\?UTF-8\?B\?([A-Za-z0-9+/=]+)\?=$/m.exec(headersOf(raw));

		expect(encoded).not.toBeNull();
		expect(new TextDecoder().decode(Uint8Array.from(atob(encoded?.[1] ?? ""), (c) => c.charCodeAt(0)))).toBe(
			"ContribKit contact: Ámbar",
		);
	});

	it("round-trips the body through base64 over UTF-8 bytes", () => {
		expect(decoded(build({ text: "café ☕\nsecond line" }))).toBe("café ☕\nsecond line");
	});

	it("wraps the encoded body at 76 characters, which is what a mail transfer agent expects", () => {
		const raw = build({ text: "a".repeat(1000) });

		expect(
			bodyOf(raw)
				.trimEnd()
				.split("\r\n")
				.every((line) => line.length <= 76),
		).toBe(true);
		expect(bodyOf(raw).trimEnd().split("\r\n").length).toBeGreaterThan(1);
	});

	it("strips CR and LF out of every header value, so no field can inject a second header", () => {
		const raw = build({
			replyTo: "ada@example.com\r\nBcc: victim@example.com",
			subject: "hi\r\nX-Sneaky: yes",
			messageId: "<1\n2@contribkit.app>",
		});

		const names = headersOf(raw)
			.split("\r\n")
			.map((line) => line.split(":")[0]);

		expect(names).toHaveLength(9);
		expect(names).not.toContain("Bcc");
		expect(names).not.toContain("X-Sneaky");
		expect(headersOf(raw)).toContain("Reply-To: ada@example.com Bcc: victim@example.com");
	});

	it("leaves the body's own line breaks alone, because the body is encoded rather than written out", () => {
		expect(decoded(build({ text: "first\r\nBcc: victim@example.com" }))).toBe("first\r\nBcc: victim@example.com");
	});
});
