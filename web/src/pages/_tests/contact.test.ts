import { beforeEach, describe, expect, it, vi } from "vitest";

const { env, send } = vi.hoisted(() => ({
	env: {} as { CONTACT_EMAIL?: { send: (message: unknown) => Promise<void> } },
	send: vi.fn(async () => undefined),
}));

vi.mock("cloudflare:workers", () => ({ env }));
vi.mock("cloudflare:email", () => ({ EmailMessage: class {} }));

import { POST } from "../api/contact";

const VALID = { name: "Ada", email: "ada@example.com", message: "a message long enough to send" };

const post = (body: unknown): Promise<Response> =>
	POST({
		request: new Request("https://contribkit.app/api/contact", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: typeof body === "string" ? body : JSON.stringify(body),
		}),
		url: new URL("https://contribkit.app/api/contact"),
		locals: {},
	} as never) as Promise<Response>;

beforeEach(() => {
	send.mockClear();
	send.mockImplementation(async () => undefined);
	env.CONTACT_EMAIL = { send };
});

describe("POST /api/contact", () => {
	it("400s a body that fails the shape check, which is the one hand-written status here", async () => {
		for (const body of ["not json", {}, { email: "ada@example.com" }, { email: 1, message: 2 }]) {
			const response = await post(body);

			expect(response.status, JSON.stringify(body)).toBe(400);
			expect(await response.json()).toEqual({ error: "Invalid request body" });
		}
	});

	it("names the field a value object rejected, so the form can point at it", async () => {
		const badEmail = await post({ ...VALID, email: "nope" });
		const shortMessage = await post({ ...VALID, message: "hi" });

		expect(badEmail.status).toBe(400);
		expect(await badEmail.json()).toMatchObject({ field: "email" });
		expect(shortMessage.status).toBe(400);
		expect(await shortMessage.json()).toMatchObject({ field: "message" });
	});

	it("accepts a submission that filled the honeypot and sends nothing at all", async () => {
		const response = await post({ ...VALID, website: "https://spam.example" });

		expect(response.status).toBe(202);
		expect(await response.json()).toEqual({ status: "accepted" });
		expect(send).not.toHaveBeenCalled();
	});

	it("treats a blank honeypot as a real submission, because a browser posts empty fields", async () => {
		const response = await post({ ...VALID, website: "  " });

		expect(response.status).toBe(202);
		expect(send).toHaveBeenCalledOnce();
	});

	it("202s a delivered message", async () => {
		const response = await post(VALID);

		expect(response.status).toBe(202);
		expect(await response.json()).toEqual({ status: "accepted" });
		expect(send).toHaveBeenCalledOnce();
	});

	it("502s a Delivery failure without repeating the platform's reason to the visitor", async () => {
		send.mockImplementation(async () => {
			throw new Error("destination address not verified");
		});

		const response = await post(VALID);

		expect(response.status).toBe(502);
		expect(await response.json()).toEqual({ error: "Could not send your message" });
	});

	it("502s when the binding is absent, which is every local run", async () => {
		env.CONTACT_EMAIL = undefined;

		expect((await post(VALID)).status).toBe(502);
	});

	it("stores no answer it ever gives, whichever one it is", async () => {
		const answers = [await post(VALID), await post("not json"), await post({ ...VALID, email: "nope" })];

		send.mockImplementation(async () => {
			throw new Error("refused");
		});
		answers.push(await post(VALID));

		for (const answer of answers) {
			expect(answer.headers.get("Cache-Control"), String(answer.status)).toBe("no-store");
		}
	});

	it("answers 500 through the boundary rather than letting a throw reach the platform", async () => {
		const response = (await POST({
			request: {
				json: () => {
					throw new Error("kaboom");
				},
			},
			url: new URL("https://contribkit.app/api/contact"),
			locals: {},
		} as never)) as Response;

		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({ error: "Something went wrong. Please try again." });
		expect(response.headers.get("Cache-Control")).toBe("no-store");
	});
});
