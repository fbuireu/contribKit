import { delivery, isFailure } from "@domain/failures/failure";
import type { ContactMessageRepository } from "@domain/repositories/types";
import { isContactMessage } from "@domain/value-objects/contact-message";
import { describe, expect, it, vi } from "vitest";
import { sendContactMessage } from "./send-contact-message";

const VALID = { name: "Ada", email: "ada@example.com", body: "a message long enough to send" };

const echoing = (): ContactMessageRepository["deliver"] => vi.fn(async (message) => message);

describe("sendContactMessage", () => {
	it("delivers a parsed message and echoes it back, the way fetchCalendar returns the calendar", async () => {
		const deliver = echoing();

		const result = await sendContactMessage(deliver)(VALID);

		expect(isContactMessage(result)).toBe(true);
		expect(deliver).toHaveBeenCalledWith({
			_tag: "ContactMessage",
			name: "Ada",
			email: "ada@example.com",
			body: VALID.body,
		});
	});

	it("short-circuits an invalid address before the repository is called, so a junk submission costs no send", async () => {
		const deliver = echoing();

		const result = await sendContactMessage(deliver)({ ...VALID, email: "not-an-address" });

		expect(isFailure(result)).toBe(true);
		expect(deliver).not.toHaveBeenCalled();
	});

	it("short-circuits a message under the floor too", async () => {
		const deliver = echoing();

		const result = await sendContactMessage(deliver)({ ...VALID, body: "hi" });

		expect(isFailure(result)).toBe(true);
		expect(deliver).not.toHaveBeenCalled();
	});

	it("passes a Delivery failure straight back, without dressing it as anything else", async () => {
		const deliver = vi.fn(async () => delivery("no such destination address"));

		const result = await sendContactMessage(deliver)(VALID);

		expect(result).toEqual({ kind: "Delivery", message: "no such destination address" });
	});

	it("treats an omitted name as a message with no name rather than as a rejection", async () => {
		const deliver = echoing();

		await sendContactMessage(deliver)({ email: VALID.email, body: VALID.body });

		expect(deliver).toHaveBeenCalledWith(expect.objectContaining({ name: null }));
	});
});
