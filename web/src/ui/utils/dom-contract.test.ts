// @vitest-environment happy-dom

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ClassName, ElementId, Selector, ThemeClass } from "./dom-contract";

const ID_IN_SELECTOR = /#([a-z][a-z0-9-]*)/g;
const CLASS_IN_SELECTOR = /\.([a-z][a-z0-9-]*)/g;

const COMPONENTS = join(dirname(fileURLToPath(import.meta.url)), "../components");
const ID_ATTRIBUTE = /\b(?:id|for|aria-labelledby|aria-controls|aria-describedby)="([^"{}]*)"/g;
const ANCHOR_ATTRIBUTE = /\bhref=(?:"#([^"{}]*)"|\{`[^`]*#([a-z][a-z0-9-]*)`\})/g;
const CLASS_ATTRIBUTE = /\bclass=(?:"([^"{}]*)"|\{`([^`]*)`\})/g;
const CLASS_LIST = /\bclass:list=\{((?:[^{}]|\{[^{}]*\})*)\}/g;
const QUOTED = /["'`]([^"'`]*)["'`]/g;
const INTERPOLATION = /\$\{[^}]*\}/g;

const astroFiles = (dir: string): string[] =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		if (entry.isDirectory()) return astroFiles(join(dir, entry.name));
		return entry.name.endsWith(".astro") ? [join(dir, entry.name)] : [];
	});

const tokensOf = (values: (string | undefined)[]): string[] =>
	values.flatMap((value) => (value ?? "").replace(INTERPOLATION, " ").split(/\s+/)).filter(Boolean);

describe("ElementId", () => {
	it("declares every id unique, so two components cannot claim the same node", () => {
		const ids = Object.values(ElementId);

		expect(new Set(ids).size).toBe(ids.length);
	});

	it("uses kebab-case throughout, which is what the CSS and the markup expect", () => {
		for (const id of Object.values(ElementId)) {
			expect(id).toMatch(/^[a-z][a-z0-9-]*$/);
		}
	});
});

describe("Selector", () => {
	it("builds every compound selector from the declared id and class names", () => {
		const ids = new Set<string>(Object.values(ElementId));
		const classes = new Set<string>(Object.values(ClassName));

		const undeclared = Object.entries(Selector).flatMap(([name, selector]) => [
			...[...selector.matchAll(ID_IN_SELECTOR)]
				.filter(([, id]) => !ids.has(id))
				.map(([token]) => `${name} -> ${token}`),
			...[...selector.matchAll(CLASS_IN_SELECTOR)]
				.filter(([, className]) => !classes.has(className))
				.map(([token]) => `${name} -> ${token}`),
		]);

		expect(undeclared).toEqual([]);
	});

	it("is parseable by the DOM, so a typo cannot slip through as a silent no-match", () => {
		const scope = document.createDocumentFragment();

		for (const selector of Object.values(Selector)) {
			expect(() => scope.querySelector(selector)).not.toThrow();
		}
	});
});

describe("the markup", () => {
	it("reads every id and class the contract declares through it, never spelling one", () => {
		const ids = new Set<string>(Object.values(ElementId));
		const classes = new Set<string>([...Object.values(ClassName), ...Object.values(ThemeClass)]);
		const files = astroFiles(COMPONENTS);

		const spelled = files.flatMap((file) => {
			const markup = readFileSync(file, "utf8");
			const component = relative(COMPONENTS, file);
			const idTokens = tokensOf([
				...[...markup.matchAll(ID_ATTRIBUTE)].map(([, value]) => value),
				...[...markup.matchAll(ANCHOR_ATTRIBUTE)].flatMap(([, quoted, templated]) => [quoted, templated]),
			]);
			const classTokens = tokensOf([
				...[...markup.matchAll(CLASS_ATTRIBUTE)].flatMap(([, quoted, templated]) => [quoted, templated]),
				...[...markup.matchAll(CLASS_LIST)].flatMap(([, list]) => [...list.matchAll(QUOTED)].map(([, value]) => value)),
			]);
			return [
				...idTokens.filter((token) => ids.has(token)).map((token) => `${component} -> #${token}`),
				...classTokens.filter((token) => classes.has(token)).map((token) => `${component} -> .${token}`),
			];
		});

		expect(files.length).toBeGreaterThan(0);
		expect(spelled).toEqual([]);
	});
});
