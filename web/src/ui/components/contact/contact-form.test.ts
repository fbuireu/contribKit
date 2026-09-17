// @vitest-environment happy-dom

import { CONTACT_ROUTE } from "@domain/value-objects/contact-message";
import { ElementId } from "@ui/utils/dom-contract";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initContactForm } from "./contact-form";

const MARKUP = `
	<form id="${ElementId.ContactForm}">
		<input id="${ElementId.ContactName}" name="${ElementId.ContactName}" />
		<p id="${ElementId.ContactNameError}" hidden></p>
		<input id="${ElementId.ContactEmail}" name="${ElementId.ContactEmail}" />
		<p id="${ElementId.ContactEmailError}" hidden></p>
		<textarea id="${ElementId.ContactMessage}" name="${ElementId.ContactMessage}"></textarea>
		<p id="${ElementId.ContactMessageError}" hidden></p>
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

interface TypeParams {
	id: string;
	value: string;
}

const type = ({ id, value }: TypeParams): void => {
	const control = byId<HTMLInputElement>(id);
	control.value = value;
	control.dispatchEvent(new Event("input", { bubbles: true }));
};

const leave = (id: string): void => {
	byId(id).dispatchEvent(new Event("blur"));
};

const fill = (): void => {
	byId<HTMLInputElement>(ElementId.ContactName).value = "Ada";
	byId<HTMLInputElement>(ElementId.ContactEmail).value = "ada@example.com";
	byId<HTMLTextAreaElement>(ElementId.ContactMessage).value = "a message long enough to send";
};

beforeEach(() => {
	document.body.innerHTML = MARKUP;
	initContactForm();
});

afterEach(() => vi.unstubAllGlobals());

describe("initContactForm", () => {
	it("does nothing at all on a page that carries no form", () => {
		document.body.innerHTML = "";

		expect(() => initContactForm()).not.toThrow();
	});

	it("switches the browser's own validation off, so the inline sentences are the ones a person sees", () => {
		expect(byId<HTMLFormElement>(ElementId.ContactForm).noValidate).toBe(true);
	});

	it("posts the fields as JSON to the contact endpoint rather than letting the browser navigate", async () => {
		fill();
		const request = vi.fn(async () => answer({ body: { status: "accepted" } }));
		vi.stubGlobal("fetch", request);

		await submit();

		expect(request).toHaveBeenCalledOnce();
		const [url, init] = request.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe(CONTACT_ROUTE);
		expect(init.method).toBe("POST");
		expect(JSON.parse(String(init.body))).toEqual({
			name: "Ada",
			email: "ada@example.com",
			message: "a message long enough to send",
			website: "",
		});
	});

	it("clears the form and says so when the message was accepted", async () => {
		fill();
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

	it("puts the server's own sentence on the field it names, and moves focus there", async () => {
		fill();
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => answer({ body: { error: "Enter a valid email address", field: "email" }, status: 400 })),
		);

		await submit();

		expect(byId(ElementId.ContactEmailError).textContent).toBe("enter a valid email address");
		expect(byId(ElementId.ContactEmailError).hidden).toBe(false);
		expect(byId(ElementId.ContactEmail).getAttribute("aria-invalid")).toBe("true");
		expect(document.activeElement).toBe(byId(ElementId.ContactEmail));
		expect(byId(ElementId.ContactStatus).hidden).toBe(true);
	});

	it("writes a server error that names no field into the status node instead", async () => {
		fill();
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => answer({ body: { error: "Invalid request body" }, status: 400 })),
		);

		await submit();

		const status = byId(ElementId.ContactStatus);
		expect(status.textContent).toBe("invalid request body");
		expect(status.dataset.tone).toBe("failed");
	});

	it("falls back to its own sentence when the answer carries no usable error", async () => {
		fill();
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response("<!doctype html>", { status: 502 })),
		);

		await submit();

		expect(byId(ElementId.ContactStatus).textContent).toContain("could not send your message");
	});

	it("says the same thing when the request never reaches the server at all", async () => {
		fill();
		vi.stubGlobal(
			"fetch",
			vi.fn(() => Promise.reject(new Error("offline"))),
		);

		await submit();

		const status = byId(ElementId.ContactStatus);
		expect(status.textContent).toContain("could not send your message");
		expect(status.dataset.tone).toBe("failed");
	});

	it("posts an empty string for any field the form does not carry, rather than the word undefined", async () => {
		document.body.innerHTML = `
			<form id="${ElementId.ContactForm}">
				<button id="${ElementId.ContactSubmit}" type="submit">send</button>
				<p id="${ElementId.ContactStatus}" hidden></p>
			</form>
		`;
		initContactForm();
		const request = vi.fn(async () => answer({ body: { status: "accepted" } }));
		vi.stubGlobal("fetch", request);

		await submit();

		const [, init] = request.mock.calls[0] as unknown as [string, RequestInit];
		expect(JSON.parse(String(init.body))).toEqual({ name: "", email: "", message: "", website: "" });
	});

	it("disables the button while in flight and refuses a second submit until the first settles", async () => {
		fill();
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

describe("validation", () => {
	it("says nothing while a field is being typed into for the first time", () => {
		type({ id: ElementId.ContactEmail, value: "ada@" });

		expect(byId(ElementId.ContactEmailError).hidden).toBe(true);
		expect(byId(ElementId.ContactEmail).hasAttribute("aria-invalid")).toBe(false);
	});

	it("checks a field when it is left, and from then on as it changes", () => {
		type({ id: ElementId.ContactEmail, value: "ada@" });
		leave(ElementId.ContactEmail);

		const error = byId(ElementId.ContactEmailError);
		expect(error.hidden).toBe(false);
		expect(error.textContent).toBe("enter a valid email address");
		expect(byId(ElementId.ContactEmail).getAttribute("aria-invalid")).toBe("true");

		type({ id: ElementId.ContactEmail, value: "ada@example.com" });

		expect(error.hidden).toBe(true);
		expect(error.textContent).toBe("");
		expect(byId(ElementId.ContactEmail).hasAttribute("aria-invalid")).toBe(false);
	});

	it("tells an empty required field apart from a malformed one", () => {
		leave(ElementId.ContactEmail);
		leave(ElementId.ContactMessage);

		expect(byId(ElementId.ContactEmailError).textContent).toBe("enter your email address");
		expect(byId(ElementId.ContactMessageError).textContent).toBe("write a message");
	});

	it("never complains about a blank name, which is optional", () => {
		leave(ElementId.ContactName);

		expect(byId(ElementId.ContactNameError).hidden).toBe(true);
	});

	it("refuses to submit an invalid form, marks every field, and focuses the first wrong one", async () => {
		const request = vi.fn(async () => answer({ body: { status: "accepted" } }));
		vi.stubGlobal("fetch", request);
		byId<HTMLInputElement>(ElementId.ContactName).value = "Ada";

		await submit();

		expect(request).not.toHaveBeenCalled();
		expect(byId(ElementId.ContactSubmit).textContent).toBe("send");
		expect(byId(ElementId.ContactNameError).hidden).toBe(true);
		expect(byId(ElementId.ContactEmailError).hidden).toBe(false);
		expect(byId(ElementId.ContactMessageError).hidden).toBe(false);
		expect(document.activeElement).toBe(byId(ElementId.ContactEmail));
	});

	it("re-checks every field as it changes once a submit was attempted, even one never left", async () => {
		vi.stubGlobal("fetch", vi.fn());

		await submit();
		type({ id: ElementId.ContactMessage, value: "a message long enough to send" });

		expect(byId(ElementId.ContactMessageError).hidden).toBe(true);
		expect(byId(ElementId.ContactEmailError).hidden).toBe(false);
	});

	it("forgets every error and every touch once a message was accepted", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => answer({ body: { status: "accepted" } })),
		);
		leave(ElementId.ContactEmail);
		expect(byId(ElementId.ContactEmailError).hidden).toBe(false);
		fill();

		await submit();
		type({ id: ElementId.ContactEmail, value: "ada@" });

		expect(byId(ElementId.ContactEmailError).hidden).toBe(true);
		expect(byId(ElementId.ContactEmail).hasAttribute("aria-invalid")).toBe(false);
	});
});
