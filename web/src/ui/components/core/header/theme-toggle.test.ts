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
