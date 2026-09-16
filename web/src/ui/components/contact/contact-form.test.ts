// @vitest-environment happy-dom

import { ElementId } from "@ui/utils/dom-contract";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONTACT_ENDPOINT, initContactForm } from "./contact-form";

const MARKUP = `
	<form id="${ElementId.ContactForm}">
		<input id="${ElementId.ContactName}" name="${ElementId.ContactName}" />
		<input id="${ElementId.ContactEmail}" name="${ElementId.ContactEmail}" />
		<textarea id="${ElementId.ContactMessage}" name="${ElementId.ContactMessage}"></textarea>
		<input id="${ElementId.ContactWebsite}" name="${ElementId.ContactWebsite}" />
		<button id="${ElementId.ContactSubmit}" type="submit">send</button>
		<p id="${ElementId.ContactStatus}" hidden></p>
	</form>
`;

const byId = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

interface AnswerParams {
	body: unknown;
	status?: number;
}

const answer = ({ body, status = 202 }: AnswerParams): Response =>
	new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const submit = async (): Promise<void> => {
	byId<HTMLFormElement>(ElementId.ContactForm).dispatchEvent(new Event("submit", { cancelable: true }));
	await vi.waitFor(() => expect(byId(ElementId.ContactSubmit).textContent).toBe("send"));
};

beforeEach(() => {
	document.body.innerHTML = MARKUP;
	byId<HTMLInputElement>(ElementId.ContactName).value = "Ada";
	byId<HTMLInputElement>(ElementId.ContactEmail).value = "ada@example.com";
	byId<HTMLTextAreaElement>(ElementId.ContactMessage).value = "a message long enough to send";
	initContactForm();
});

afterEach(() => vi.unstubAllGlobals());

describe("initContactForm", () => {
	it("does nothing at all on a page that carries no form", () => {
		document.body.innerHTML = "";

		expect(() => initContactForm()).not.toThrow();
	});

	it("posts the fields as JSON to the contact endpoint rather than letting the browser navigate", async () => {
		const request = vi.fn(async () => answer({ body: { status: "accepted" } }));
		vi.stubGlobal("fetch", request);

		await submit();

		expect(request).toHaveBeenCalledOnce();
		const [url, init] = request.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe(CONTACT_ENDPOINT);
		expect(init.method).toBe("POST");
		expect(JSON.parse(String(init.body))).toEqual({
			name: "Ada",
			email: "ada@example.com",
			message: "a message long enough to send",
			website: "",
		});
	});

	it("clears the form and says so when the message was accepted", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => answer({ body: { status: "accepted" } })),
		);

		await submit();

		const status = byId(ElementId.ContactStatus);
		expect(status.hidden).toBe(false);
		expect(status.dataset.tone).toBe("sent");
		expect(status.textContent).toContain("on its way");
		expect(byId<HTMLInputElement>(ElementId.ContactEmail).value).toBe("");
	});

	it("writes the server's own error into the status node, which is what names the bad field", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => answer({ body: { error: "Enter a valid email address", field: "email" }, status: 400 })),
		);

		await submit();

		const status = byId(ElementId.ContactStatus);
		expect(status.textContent).toBe("enter a valid email address");
		expect(status.dataset.tone).toBe("failed");
	});

	it("falls back to its own sentence when the answer carries no usable error", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response("<!doctype html>", { status: 502 })),
		);

		await submit();

		expect(byId(ElementId.ContactStatus).textContent).toContain("could not send your message");
	});

	it("says the same thing when the request never reaches the server at all", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(() => Promise.reject(new Error("offline"))),
		);

		await submit();

		const status = byId(ElementId.ContactStatus);
		expect(status.textContent).toContain("could not send your message");
		expect(status.dataset.tone).toBe("failed");
	});

	it("disables the button while in flight and refuses a second submit until the first settles", async () => {
		let release = (): void => undefined;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		const request = vi.fn(async () => {
			await gate;
			return answer({ body: { status: "accepted" } });
		});
		vi.stubGlobal("fetch", request);
		const form = byId<HTMLFormElement>(ElementId.ContactForm);
		const button = byId<HTMLButtonElement>(ElementId.ContactSubmit);

		form.dispatchEvent(new Event("submit", { cancelable: true }));
		await vi.waitFor(() => expect(button.disabled).toBe(true));
		expect(button.textContent).toBe("sending…");

		form.dispatchEvent(new Event("submit", { cancelable: true }));
		release();
		await vi.waitFor(() => expect(button.disabled).toBe(false));

		expect(request).toHaveBeenCalledOnce();
		expect(button.textContent).toBe("send");
	});
});
