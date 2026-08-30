// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initThemeToggle } from "./theme-toggle";

const createMemoryStorage = (): Storage => {
	const store = new Map<string, string>();
	return {
		get length() {
			return store.size;
		},
		clear: () => store.clear(),
		getItem: (key: string) => store.get(key) ?? null,
		key: (index: number) => [...store.keys()][index] ?? null,
		removeItem: (key: string) => {
			store.delete(key);
		},
		setItem: (key: string, value: string) => {
			store.set(key, value);
		},
	};
};

const setupDom = (): HTMLButtonElement => {
	document.head.innerHTML = '<meta name="color-scheme" content="light dark" />';
	document.body.innerHTML = '<button id="theme-toggle"></button>';
	return document.getElementById("theme-toggle") as HTMLButtonElement;
};

describe("initThemeToggle", () => {
	beforeEach(() => {
		vi.stubGlobal("localStorage", createMemoryStorage());
		document.documentElement.className = "";
	});

	afterEach(() => vi.unstubAllGlobals());

	it("does nothing without the toggle button", () => {
		document.body.innerHTML = "";
		expect(() => initThemeToggle()).not.toThrow();
	});

	it("starts unpinned following the system scheme", () => {
		const button = setupDom();
		initThemeToggle();
		expect(button.getAttribute("aria-pressed")).toBe("false");
		expect(document.documentElement.classList.contains("theme-dark")).toBe(false);
		expect(document.querySelector("meta")?.getAttribute("content")).toBe("light dark");
	});

	it("pins the opposite scheme on click and unpins on a second click", () => {
		const button = setupDom();
		initThemeToggle();

		button.click();
		expect(localStorage.getItem("color-scheme")).toBe("dark");
		expect(document.documentElement.classList.contains("theme-dark")).toBe(true);
		expect(button.getAttribute("aria-pressed")).toBe("true");

		button.click();
		expect(localStorage.getItem("color-scheme")).toBeNull();
		expect(document.documentElement.classList.contains("theme-dark")).toBe(false);
	});

	it("applies a previously pinned scheme on init", () => {
		const button = setupDom();
		localStorage.setItem("color-scheme", "light");
		initThemeToggle();
		expect(document.documentElement.classList.contains("theme-light")).toBe(true);
		expect(button.dataset.effective).toBe("light");
	});
});

interface StubMediaQueryParams {
	matches: boolean;
}

const stubMediaQuery = ({ matches }: StubMediaQueryParams) => {
	const listeners: (() => void)[] = [];
	const query = {
		matches,
		addEventListener: (_type: string, listener: () => void) => listeners.push(listener),
	};

	vi.stubGlobal("matchMedia", () => query);

	return {
		switchTo: (nextMatches: boolean) => {
			query.matches = nextMatches;
			for (const listener of listeners) listener();
		},
	};
};

describe("initThemeToggle against a dark system scheme", () => {
	beforeEach(() => {
		vi.stubGlobal("localStorage", createMemoryStorage());
		document.documentElement.className = "";
	});

	afterEach(() => vi.unstubAllGlobals());

	it("reports dark while pinning nothing, so the OS still owns the choice", () => {
		stubMediaQuery({ matches: true });
		const button = setupDom();

		initThemeToggle();

		expect(button.dataset.effective).toBe("dark");
		expect(button.getAttribute("aria-pressed")).toBe("true");
		expect(button.getAttribute("aria-label")).toBe("Switch to light mode");
		expect(localStorage.getItem("color-scheme")).toBeNull();
		expect(document.documentElement.classList.contains("theme-dark")).toBe(false);
	});

	it("pins light on a click, which is the opposite of what the OS says", () => {
		stubMediaQuery({ matches: true });
		const button = setupDom();
		initThemeToggle();

		button.click();

		expect(localStorage.getItem("color-scheme")).toBe("light");
		expect(document.documentElement.classList.contains("theme-light")).toBe(true);
		expect(document.querySelector("meta")?.getAttribute("content")).toBe("light");
	});

	it("follows the OS scheme as it changes under an unpinned reader", () => {
		const { switchTo } = stubMediaQuery({ matches: false });
		const button = setupDom();
		initThemeToggle();
		expect(button.dataset.effective).toBe("light");

		switchTo(true);

		expect(button.dataset.effective).toBe("dark");
		expect(button.getAttribute("aria-pressed")).toBe("true");
		expect(localStorage.getItem("color-scheme")).toBeNull();
	});

	it("leaves a pinned reader alone when the OS scheme changes", () => {
		const { switchTo } = stubMediaQuery({ matches: false });
		const button = setupDom();
		localStorage.setItem("color-scheme", "light");
		initThemeToggle();

		switchTo(true);

		expect(localStorage.getItem("color-scheme")).toBe("light");
		expect(button.dataset.effective).toBe("light");
	});
});

describe("initThemeToggle on a page without the colour-scheme meta", () => {
	beforeEach(() => {
		vi.stubGlobal("localStorage", createMemoryStorage());
		document.documentElement.className = "";
	});

	afterEach(() => vi.unstubAllGlobals());

	it("still pins the theme rather than throwing on the missing tag", () => {
		document.head.innerHTML = "";
		document.body.innerHTML = '<button id="theme-toggle"></button>';
		const button = document.getElementById("theme-toggle") as HTMLButtonElement;

		initThemeToggle();
		button.click();

		expect(document.documentElement.classList.contains("theme-dark")).toBe(true);
	});
});

describe("a stored value that names no scheme", () => {
	beforeEach(() => {
		vi.stubGlobal("localStorage", createMemoryStorage());
		document.documentElement.className = "";
	});

	afterEach(() => vi.unstubAllGlobals());

	it("reads as unpinned rather than being applied", () => {
		const button = setupDom();
		localStorage.setItem("color-scheme", "sepia");

		initThemeToggle();

		expect(document.documentElement.classList.contains("theme-light")).toBe(false);
		expect(document.documentElement.classList.contains("theme-dark")).toBe(false);
		expect(document.querySelector("meta")?.getAttribute("content")).toBe("light dark");
		expect(button.dataset.effective).toBe("light");
	});
});
