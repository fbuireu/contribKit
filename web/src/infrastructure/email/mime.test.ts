import { describe, expect, it } from "vitest";
import { buildMimeMessage } from "./mime";

const DATE = new Date(Date.UTC(2026, 8, 16, 9, 30, 0));
const BOUNDARY = "=_boundary";

const build = (overrides: Partial<Parameters<typeof buildMimeMessage>[0]> = {}): string =>
	buildMimeMessage({
		from: "contact@contribkit.app",
		to: "maintainer@example.com",
		replyTo: "ada@example.com",
		subject: "ContribKit contact: Ada",
		text: "Name: Ada\nEmail: ada@example.com\n\nhello",
		html: "<p>hello</p>",
		date: DATE,
		messageId: "<1.2@contribkit.app>",
		boundary: BOUNDARY,
		...overrides,
	});

const headersOf = (raw: string): string => raw.split("\r\n\r\n")[0];

const bodyOf = (raw: string): string => raw.split("\r\n\r\n").slice(1).join("\r\n\r\n");

const partsOf = (raw: string): string[] =>
	bodyOf(raw)
		.split(`--${BOUNDARY}`)
		.slice(1, -1)
		.map((part) => part.replace(/^\r\n/, "").replace(/\r\n$/, ""));

const partHeadersOf = (part: string): string => part.split("\r\n\r\n")[0];

const decodedPart = (part: string): string =>
	new TextDecoder().decode(
		Uint8Array.from(atob(part.split("\r\n\r\n").slice(1).join("").replaceAll("\r\n", "")), (character) =>
			character.charCodeAt(0),
		),
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
		]);
	});

	it("declares a multipart/alternative document whose parts are utf-8 text encoded as base64", () => {
		const raw = build();
		const parts = partsOf(raw);

		expect(headersOf(raw)).toContain("MIME-Version: 1.0");
		expect(headersOf(raw)).toContain(`Content-Type: multipart/alternative; boundary="${BOUNDARY}"`);
		expect(parts).toHaveLength(2);
		expect(partHeadersOf(parts[0])).toBe(
			"Content-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: base64",
		);
		expect(partHeadersOf(parts[1])).toBe("Content-Type: text/html; charset=utf-8\r\nContent-Transfer-Encoding: base64");
		expect(bodyOf(raw).trimEnd().endsWith(`--${BOUNDARY}--`)).toBe(true);
	});

	it("puts the plain text first and the HTML second, which is the order a client prefers the last of", () => {
		const parts = partsOf(build({ text: "plain", html: "<b>rich</b>" }));

		expect(decodedPart(parts[0])).toBe("plain");
		expect(decodedPart(parts[1])).toBe("<b>rich</b>");
	});

	it("names the sender, the recipient and the address a reply goes to", () => {
		const headers = headersOf(build());

		expect(headers).toContain("From: contact@contribkit.app");
		expect(headers).toContain("To: maintainer@example.com");
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

	it("round-trips each part through base64 over UTF-8 bytes", () => {
		const parts = partsOf(build({ text: "café ☕\nsecond line", html: "<p>café ☕</p>" }));

		expect(decodedPart(parts[0])).toBe("café ☕\nsecond line");
		expect(decodedPart(parts[1])).toBe("<p>café ☕</p>");
	});

	it("still writes a complete document for an empty text, with an empty part after the blank line", () => {
		const parts = partsOf(build({ text: "" }));

		expect(parts).toHaveLength(2);
		expect(decodedPart(parts[0])).toBe("");
	});

	it("wraps each encoded part at 76 characters, which is what a mail transfer agent expects", () => {
		const parts = partsOf(build({ text: "a".repeat(1000), html: "b".repeat(1000) }));

		for (const part of parts) {
			const lines = part.split("\r\n\r\n").slice(1).join("").split("\r\n");
			expect(lines.every((line) => line.length <= 76)).toBe(true);
			expect(lines.length).toBeGreaterThan(1);
		}
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

		expect(names).toHaveLength(8);
		expect(names).not.toContain("Bcc");
		expect(names).not.toContain("X-Sneaky");
		expect(headersOf(raw)).toContain("Reply-To: ada@example.com Bcc: victim@example.com");
	});

	it("keeps the boundary to the characters RFC 2046 allows, whatever it was handed", () => {
		const raw = build({ boundary: '=_ab"c d\r\n--' });

		expect(headersOf(raw)).toContain('boundary="=_abcd--"');
		expect(raw).toContain("\r\n--=_abcd--\r\n");
	});

	it("leaves a part's own line breaks alone, because the part is encoded rather than written out", () => {
		const parts = partsOf(build({ text: "first\r\nBcc: victim@example.com" }));

		expect(decodedPart(parts[0])).toBe("first\r\nBcc: victim@example.com");
	});
});
