import type { ContactMessage } from "@domain/value-objects/contact-message";
import { PALETTES } from "@domain/value-objects/palette";
import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";
import { ContactMessageEmail } from "./ContactMessageEmail";

const message = (overrides: Partial<ContactMessage> = {}): ContactMessage => ({
	_tag: "ContactMessage",
	name: "Ada",
	email: "ada@example.com",
	body: "please add a palette",
	...overrides,
});

const html = (overrides: Partial<ContactMessage> = {}): Promise<string> =>
	render(
		ContactMessageEmail({
			message: message(overrides),
			sentAt: "Wed, 16 Sep 2026 09:30:00 GMT",
			site: "contribkit.app",
		}),
	);

const text = (overrides: Partial<ContactMessage> = {}): Promise<string> =>
	render(
		ContactMessageEmail({
			message: message(overrides),
			sentAt: "Wed, 16 Sep 2026 09:30:00 GMT",
			site: "contribkit.app",
		}),
		{
			plainText: true,
		},
	);

describe("ContactMessageEmail", () => {
	it("carries the name, the address, the date and the message, and a mailto link back to the sender", async () => {
		const document = await html();

		expect(document).toContain("Ada");
		expect(document).toContain("ada@example.com");
		expect(document).toContain("Wed, 16 Sep 2026 09:30:00 GMT");
		expect(document).toContain("please add a palette");
		expect(document).toContain('href="mailto:ada@example.com');
		expect(document).toContain("Reply to Ada");
	});

	it("says so rather than inventing a name when none was given, and addresses the reply to the email", async () => {
		const document = await html({ name: null });

		expect(document).toContain("(not given)");
		expect(document).toContain("Reply to ada@example.com");
	});

	it("escapes what the visitor typed, so a message cannot add markup to the maintainer's inbox", async () => {
		const document = await html({ body: '<script>alert("x")</script>', name: "<b>Ada</b>" });

		expect(document).not.toContain("<script>");
		expect(document).not.toContain("<b>Ada</b>");
		expect(document).toContain("&lt;script&gt;");
	});

	it("keeps the line breaks a message is written with, through pre-wrap", async () => {
		const document = await html({ body: "first line\nsecond line" });

		expect(document).toContain("white-space:pre-wrap");
		expect(document).toContain("first line\nsecond line");
	});

	it("draws the header strip and the button from the GitHub palette rather than from literals", async () => {
		const document = await html();

		for (const color of PALETTES.github.colors.slice(1)) {
			expect(document.toLowerCase()).toContain(color.hex.toLowerCase());
		}
	});

	it("carries a dark-mode block for the clients that honour one, and the Outlook selectors for the one that does not", async () => {
		const document = await html();

		expect(document).toContain("@media (prefers-color-scheme: dark)");
		expect(document).toContain("[data-ogsc] .email-card");
		expect(document).toContain('name="color-scheme" content="light dark"');
	});

	it("points at the site the form lives on", async () => {
		const document = await html();

		expect(document).toContain('href="https://contribkit.app/contact"');
		expect(document).toContain("New contact message from Ada");
	});

	it("renders a plain-text twin that carries the same facts, for the clients that show no HTML", async () => {
		const plain = await text({ body: "first line\nsecond line" });

		expect(plain).toContain("Ada");
		expect(plain).toContain("ada@example.com");
		expect(plain).toContain("first line");
		expect(plain).toContain("second line");
		expect(plain).not.toContain("<");
	});
});
