import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 60_000 });

const REPO = resolve(import.meta.dirname, "..");

const SKIP_DIRECTORIES = new Set([
	"node_modules",
	".git",
	"dist",
	"build",
	".dart_tool",
	".astro",
	".idea",
	".claude",
	".github",
]);

const walk = (dir: string, match: (path: string) => boolean): string[] => {
	const out: string[] = [];
	const visit = (current: string): void => {
		for (const entry of readdirSync(current, { withFileTypes: true })) {
			if (SKIP_DIRECTORIES.has(entry.name)) continue;
			const full = join(current, entry.name);
			if (entry.isDirectory()) visit(full);
			else if (match(full)) out.push(full);
		}
	};
	visit(dir);
	return out;
};

const read = (path: string): string => readFileSync(path, "utf8");

const FENCED_CODE_BLOCK = /```[\s\S]*?```/g;
const INLINE_CODE_SPAN = /`[^`\n]*`/g;
const MARKDOWN_LINK_TARGET = /\]\(([^)\s]+)\)/g;
const NON_RELATIVE_LINK = /^(https?:|mailto:|#)/;
const WIKI_SHORTHAND_TARGET = /\]\(\.\.\/\.\.\/wiki\/([^)\s#]+)/g;
const LINE_NUMBER_CITATION = /`[\w/.-]+\.(?:ts|dart|astro|mjs|yml):\d+/g;
const ADR_FILENAME = /^\d{4}(-[a-z\d]+)+\.md$/;
const ADR_INDEX_ROW = /\]\(\.\/docs\/adr\/(\d{4}-[a-z\d-]+\.md)\) \| ([^|]+?) \|/g;
const WEB_SOURCE_FILE = /\.(ts|astro)$/;
const GENERATED_DART_FILE = /\.(g|freezed)\.dart$/;
const BARE_FILENAME_IN_BACKTICKS = /`([a-z0-9_.-]+\.(?:ts|dart|astro))`/g;
const SOURCE_PATH_IN_BACKTICKS =
	/`((?:web\/src|app\/lib|shared|scripts)\/[A-Za-z0-9_\-./[\]]+\.(?:ts|dart|astro|json|mjs|yml))`/g;
const PATH_SEPARATOR = /[\\/]/;
const DART_RAW_STRING = /\br(['"])(?:(?!\1).)*\1/g;
const ESCAPE_SEQUENCE = /\\./g;
const DOUBLE_QUOTED_STRING = /"[^"]*"/g;
const SINGLE_QUOTED_STRING = /'[^']*'/g;
const TEMPLATE_LITERAL = /`[^`]*`/g;
const LINE_COMMENT = /(^|[^:/])\/\//;
const BLOCK_COMMENT_OPENER = /[/]\*/;
const COLOCATED_TEST_FILE = /\.test\.ts$/;
const ADR_STATUS_LINE = /\n## Status\n\n(\w+)/;
const SHORT_ADR_REFERENCE = /\bADR \d{1,3}\b/g;
const ADR_HEADING_PREFIX = /^# \d+\. /;
const NON_LETTER = /[^a-z]/gi;
const GLOSSARY_TERM = /^\*\*(.+?)\*\*:/gm;
const PUBSPEC_FLUTTER_PIN = /^ {2}flutter: (\S+)$/m;
const PUBSPEC_DART_PIN = /^ {2}sdk: (\S+)$/m;
const DOCUMENTED_PNPM_SCRIPT = /\bpnpm ([a-z][a-z\d:._-]*)/g;
const GLOSSARY_AVOID_LINE = /^_Avoid_: (.+)$/gm;
const adrHeadingFor = (number: number): RegExp => new RegExp(`^# ${number}\\. \\S`);
const withoutStringLiteralsOnOneLine = (line: string): string =>
	line
		.replaceAll(DART_RAW_STRING, "''")
		.replaceAll(ESCAPE_SEQUENCE, "")
		.replaceAll(DOUBLE_QUOTED_STRING, '""')
		.replaceAll(SINGLE_QUOTED_STRING, "''")
		.replaceAll(TEMPLATE_LITERAL, "``");

const withoutStringLiterals = (source: string): string =>
	source.split("\n").map(withoutStringLiteralsOnOneLine).join("\n");

const identifierNamed = (term: string): RegExp => new RegExp(`(?<![A-Za-z0-9])${term}(?![A-Za-z0-9])`);

const codeOnly = (text: string): string =>
	[...text.matchAll(FENCED_CODE_BLOCK), ...text.matchAll(INLINE_CODE_SPAN)].map(([span]) => span).join(" ");

const withoutCode = (text: string): string => text.replace(FENCED_CODE_BLOCK, "").replace(INLINE_CODE_SPAN, "");

const relative = (path: string): string => path.slice(REPO.length + 1).replaceAll("\\", "/");

const markdownFiles = (): string[] => walk(REPO, (path) => path.endsWith(".md"));

const isWiki = (path: string): boolean => relative(path).startsWith("docs/wiki/");

const GITHUB_SHORTHAND = /^\.\.\/\.\.\/(wiki|issues|pulls|discussions|releases|blob|tree)\//;

const wikiPages = (): Set<string> =>
	new Set(
		readdirSync(join(REPO, "docs/wiki"))
			.filter((name) => name.endsWith(".md"))
			.map((name) => name.slice(0, -3)),
	);

const directoriesIn = (dir: string): string[] =>
	readdirSync(join(REPO, dir), { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort();

const json = <T>(path: string): T => JSON.parse(read(join(REPO, path))) as T;

const ADR_DIR = join(REPO, "docs/adr");
const ADR_TEMPLATE = "0000-adr-template.md";
const ADR_INDEX = "ARCHITECTURE.md";

const adrs = (): string[] =>
	readdirSync(ADR_DIR)
		.filter((name) => name.endsWith(".md"))
		.sort();

const adrNumber = (name: string): string => name.slice(0, 4);

const ADR_REFERENCE_PATTERNS = [/ADR (\d{4})/g, /docs\/adr\/(\d{4})-/g, /\]\((\d{4})-[a-z\d-]+\.md\)/g];

const adrReferencesIn = (path: string): string[] => {
	const body = read(path);
	return ADR_REFERENCE_PATTERNS.flatMap((pattern) => [...body.matchAll(pattern)].map(([, number]) => number));
};

describe("markdown links", () => {
	it("every relative link points at a file that exists", () => {
		const broken: string[] = [];
		for (const file of markdownFiles()) {
			if (isWiki(file)) continue;
			for (const [, target] of withoutCode(read(file)).matchAll(MARKDOWN_LINK_TARGET)) {
				if (NON_RELATIVE_LINK.test(target) || target.includes("?")) continue;
				if (GITHUB_SHORTHAND.test(target)) continue;
				const [path] = target.split("#");
				if (!path) continue;
				if (!existsSync(join(dirname(file), path))) broken.push(`${relative(file)} -> ${target}`);
			}
		}
		expect(broken).toEqual([]);
	});

	it("every ../../wiki/ shorthand names a page the wiki actually publishes", () => {
		const pages = wikiPages();
		const broken = markdownFiles()
			.filter((file) => !isWiki(file))
			.flatMap((file) =>
				[...withoutCode(read(file)).matchAll(WIKI_SHORTHAND_TARGET)]
					.map(([, page]) => page)
					.filter((page) => !pages.has(page))
					.map((page) => `${relative(file)} -> ${page}`),
			);
		expect(broken).toEqual([]);
	});

	it("every wiki page link points at a wiki page that exists", () => {
		const pages = wikiPages();
		const broken: string[] = [];
		for (const file of markdownFiles().filter(isWiki)) {
			for (const [, target] of withoutCode(read(file)).matchAll(MARKDOWN_LINK_TARGET)) {
				if (NON_RELATIVE_LINK.test(target)) continue;
				const [path] = target.split("#");
				if (!path) continue;
				if (path.includes("/") || path.endsWith(".md")) {
					if (!existsSync(join(dirname(file), path))) broken.push(`${relative(file)} -> ${target}`);
					continue;
				}
				if (!pages.has(path)) broken.push(`${relative(file)} -> ${target}`);
			}
		}
		expect(broken).toEqual([]);
	});
});

describe("source paths named in documentation", () => {
	it("every referenced source file exists", () => {
		const missing: string[] = [];
		for (const file of markdownFiles()) {
			for (const [, path] of read(file).matchAll(SOURCE_PATH_IN_BACKTICKS)) {
				const resolved = join(REPO, path);
				if (!existsSync(resolved) || !statSync(resolved).isFile()) missing.push(`${relative(file)} -> ${path}`);
			}
		}
		expect(missing).toEqual([]);
	});

	it("cites symbols, never a line number that will rot", () => {
		const allowed = new Set(["CLAUDE.md", "docs/adr/0000-adr-template.md"]);
		const cited: string[] = [];
		for (const file of markdownFiles()) {
			if (allowed.has(relative(file))) continue;
			for (const [match] of read(file).matchAll(LINE_NUMBER_CITATION)) {
				cited.push(`${relative(file)} -> ${match}`);
			}
		}
		expect(cited).toEqual([]);
	});
});

describe("architecture decision records", () => {
	it("are numbered sequentially from 0000 with no gaps or duplicates", () => {
		const numbers = adrs().map((name) => Number.parseInt(adrNumber(name), 10));
		expect(numbers).toEqual(Array.from({ length: numbers.length }, (_, index) => index));
	});

	it("are all named NNNN-kebab-title.md", () => {
		expect(adrs().filter((name) => !ADR_FILENAME.test(name))).toEqual([]);
	});

	it("each follows the template shape, with a heading that carries its own number", () => {
		const statuses = new Set(["Accepted", "Proposed", "Superseded", "Deprecated", "Template"]);
		const malformed: string[] = [];
		for (const name of adrs()) {
			const body = read(join(ADR_DIR, name));
			const headings = body.split("\n").filter((line) => line.startsWith("# "));
			const expected = Number.parseInt(adrNumber(name), 10);
			const status = body.match(ADR_STATUS_LINE)?.[1] ?? "";

			if (headings.length !== 1) malformed.push(`${name}: ${headings.length} top-level headings`);
			else if (!adrHeadingFor(expected).test(headings[0])) {
				malformed.push(`${name}: heading is not "# ${expected}. Title"`);
			}
			if (!/\nDate: \d{4}-\d{2}-\d{2}\n/.test(body)) malformed.push(`${name}: no "Date: YYYY-MM-DD" line`);
			if (!statuses.has(status)) malformed.push(`${name}: status is "${status}"`);
			for (const section of ["Status", "Context", "Decision", "Consequences"]) {
				if (!body.includes(`\n## ${section}\n`)) malformed.push(`${name}: no "## ${section}" section`);
			}
		}
		expect(malformed).toEqual([]);
	});

	it("references only decisions that exist", () => {
		const existing = new Set(adrs().map(adrNumber));
		const dangling = markdownFiles().flatMap((file) =>
			adrReferencesIn(file)
				.filter((number) => !existing.has(number))
				.map((number) => `${relative(file)} -> ADR ${number}`),
		);
		expect(dangling).toEqual([]);
	});

	it("is referred to in the four-digit form a guard can see", () => {
		const short = markdownFiles().flatMap((file) =>
			[...withoutCode(read(file)).matchAll(SHORT_ADR_REFERENCE)].map(([match]) => `${relative(file)} -> ${match}`),
		);
		expect(short).toEqual([]);
	});

	it("indexes every decision in ARCHITECTURE.md", () => {
		const index = read(join(REPO, ADR_INDEX));
		const unindexed = adrs()
			.filter((name) => name !== ADR_TEMPLATE)
			.filter((name) => !index.includes(name));
		expect(unindexed).toEqual([]);
	});

	it("titles each indexed decision exactly as the decision titles itself", () => {
		const index = read(join(REPO, ADR_INDEX));
		const mismatched: string[] = [];
		const rows = [...index.matchAll(ADR_INDEX_ROW)];
		for (const [, file, title] of rows) {
			const heading = read(join(ADR_DIR, file)).split("\n")[0].replace(ADR_HEADING_PREFIX, "");
			if (heading !== title.trim()) mismatched.push(`${file}: index says "${title.trim()}", ADR says "${heading}"`);
		}
		expect(mismatched).toEqual([]);
		expect(rows.length, "the index table stopped matching — reformatting it would make this vacuous").toBe(
			adrs().filter((name) => name !== ADR_TEMPLATE).length,
		);
	});

	it("gives every decision a home outside the index", () => {
		const contextual = markdownFiles().filter(
			(file) => relative(file) !== ADR_INDEX && !relative(file).startsWith("docs/adr/"),
		);
		const linked = new Set(contextual.flatMap(adrReferencesIn));
		const orphans = adrs()
			.filter((name) => name !== ADR_TEMPLATE)
			.map(adrNumber)
			.filter((number) => !linked.has(number));
		expect(orphans).toEqual([]);
	});
});

describe("the glossary is ubiquitous language, not decoration", () => {
	it("uses every term it defines somewhere outside itself", () => {
		const flatten = (text: string): string => text.replace(NON_LETTER, "").toLowerCase();
		const terms = [...read(join(REPO, "CONTEXT.md")).matchAll(GLOSSARY_TERM)].map(([, term]) => term);
		const corpus = markdownFiles()
			.filter((file) => relative(file) !== "CONTEXT.md")
			.map(read)
			.join("\n");
		const flattened = flatten(corpus);

		expect(terms.length).toBeGreaterThan(0);
		expect(terms.filter((term) => !corpus.includes(term) && !flattened.includes(flatten(term)))).toEqual([]);
	});
});

describe("shared design tokens", () => {
	const sharedDir = join(REPO, "shared");
	const assetsDir = join(REPO, "app/assets");

	const tokenFiles = (): string[] => readdirSync(sharedDir).filter((name) => name.endsWith(".json"));

	it("are mirrored into the Flutter bundle", () => {
		const normalise = (text: string): string => text.replaceAll("\r\n", "\n").trimEnd();
		for (const name of tokenFiles()) {
			const mirrored = join(assetsDir, name);
			expect(existsSync(mirrored), `${name} is missing from app/assets`).toBe(true);
			expect(normalise(read(mirrored)), `${name} is out of sync — run pnpm sync:assets`).toBe(
				normalise(read(join(sharedDir, name))),
			);
		}
	});

	const featureLine = (heading: string): string => {
		const line = read(join(REPO, "README.md"))
			.split("\n")
			.find((candidate) => candidate.includes(heading));
		expect(line, `README has no "${heading}" feature bullet`).toBeDefined();
		return line ?? "";
	};

	it("lists every palette the app ships in the README's own feature line", () => {
		const palettes = JSON.parse(read(join(sharedDir, "palettes.json"))) as { name: string }[];
		const line = featureLine("color palettes:");

		expect(palettes.map(({ name }) => name).filter((name) => !line.includes(name))).toEqual([]);
		expect(line).toContain(`${palettes.length} color palettes`);
	});

	it("lists every cell shape the app ships in the README's own feature line", () => {
		const shapes = JSON.parse(read(join(sharedDir, "shapes.json"))) as { key: string }[];
		const line = featureLine("cell shapes:");

		expect(shapes.map(({ key }) => key).filter((key) => !line.includes(key))).toEqual([]);
		expect(line).toContain(`${shapes.length} cell shapes`);
	});
});

describe("layer documentation", () => {
	const layerGuides = (): string[] =>
		[
			...walk(join(REPO, "web/src"), (path) => path.endsWith("CLAUDE.md")),
			...walk(join(REPO, "app/lib"), (path) => path.endsWith("CLAUDE.md")),
		]
			.map(relative)
			.sort();

	it("gives every layer under web/src and app/lib its own guide", () => {
		const missing = [
			...directoriesIn("web/src").map((layer) => `web/src/${layer}/CLAUDE.md`),
			...directoriesIn("app/lib").map((layer) => `app/lib/${layer}/CLAUDE.md`),
		].filter((path) => !existsSync(join(REPO, path)));
		expect(missing).toEqual([]);
	});

	it("lists every guide that exists in the root guide's table", () => {
		const guide = read(join(REPO, "CLAUDE.md"));
		expect(layerGuides().filter((path) => !guide.includes(path))).toEqual([]);
	});

	it("lists every guide that exists in the ARCHITECTURE.md document map", () => {
		const index = read(join(REPO, ADR_INDEX));
		expect(layerGuides().filter((path) => !index.includes(path))).toEqual([]);
	});

	it("no stray CONTEXT.md survives outside the repo root", () => {
		const strays = walk(REPO, (path) => path.endsWith("CONTEXT.md")).filter((path) => relative(path) !== "CONTEXT.md");
		expect(strays.map(relative)).toEqual([]);
	});
});

describe("the guides match the manifests", () => {
	const guide = read(join(REPO, "CLAUDE.md"));
	const contributing = read(join(REPO, "CONTRIBUTING.md"));
	const rootPackage = json<{ packageManager: string; engines: { node: string }; scripts: Record<string, string> }>(
		"package.json",
	);
	const webPackage = json<{ packageManager?: string; engines: { node: string }; scripts: Record<string, string> }>(
		"web/package.json",
	);
	const appPackage = json<{ packageManager?: string }>("app/package.json");
	const pubspec = read(join(REPO, "app/pubspec.yaml"));

	const pinned = (): { label: string; expected: string }[] => [
		{ label: "root pnpm", expected: rootPackage.packageManager.replace("pnpm@", "") },
		{ label: "root Node", expected: rootPackage.engines.node },
		{ label: "web Node", expected: webPackage.engines.node },
		{ label: "Flutter", expected: pubspec.match(PUBSPEC_FLUTTER_PIN)?.[1] ?? "" },
		{ label: "Dart", expected: pubspec.match(PUBSPEC_DART_PIN)?.[1] ?? "" },
	];

	it("reads a version for every pin it claims to check", () => {
		expect(pinned().filter(({ expected }) => !expected)).toEqual([]);
	});

	it("pins the package manager in exactly one manifest", () => {
		const pinning = [
			["package.json", rootPackage.packageManager],
			["web/package.json", webPackage.packageManager],
			["app/package.json", appPackage.packageManager],
		].filter(([, pin]) => pin !== undefined);

		expect(pinning.map(([manifest]) => manifest)).toEqual(["package.json"]);
	});

	it("states the same pinned versions the manifests declare", () => {
		const wrong = pinned().flatMap(({ label, expected }) =>
			[
				["CLAUDE.md", guide],
				["CONTRIBUTING.md", contributing],
			]
				.filter(([, body]) => !body.includes(expected))
				.map(([doc]) => `${doc} does not state ${label} ${expected}`),
		);
		expect(wrong).toEqual([]);
	});

	it("mentions only pnpm scripts that a package.json declares, reading commands rather than prose", () => {
		const builtins = new Set(["install", "exec", "dlx", "add", "remove", "run", "why", "workspaces"]);
		const declared = new Set([...Object.keys(rootPackage.scripts), ...Object.keys(webPackage.scripts)]);
		const invented = [
			["CLAUDE.md", guide],
			["CONTRIBUTING.md", contributing],
		].flatMap(([doc, body]) =>
			[...codeOnly(body).matchAll(DOCUMENTED_PNPM_SCRIPT)]
				.map(([, script]) => script)
				.filter((script) => !builtins.has(script) && !declared.has(script))
				.map((script) => `${doc} -> pnpm ${script}`),
		);
		expect(invented).toEqual([]);
	});
});

describe("the dark palette is written twice and must agree", () => {
	const VARIABLES = join(REPO, "web/src/ui/styles/global/variables.css");

	const declarationsAfter = (body: string, selector: string): string[] => {
		const start = body.indexOf(selector);
		if (start === -1) return [];
		const open = body.indexOf("{", start);
		const close = body.indexOf("}", open);
		return body
			.slice(open + 1, close)
			.split(";")
			.map((declaration) => declaration.trim())
			.filter(Boolean);
	};

	const blocks = (): { label: string; declarations: string[] }[] => {
		const css = read(VARIABLES);
		return [
			{ label: ":root:not(.theme-light)", declarations: declarationsAfter(css, ":root:not(.theme-light)") },
			{ label: ":root.theme-dark", declarations: declarationsAfter(css, ":root.theme-dark") },
		];
	};

	it("finds both blocks", () => {
		expect(blocks().filter(({ declarations }) => declarations.length === 0).map(({ label }) => label)).toEqual([]);
	});

	it("keeps the system-dark and the pinned-dark palettes identical", () => {
		const [system, pinned] = blocks();

		expect(pinned.declarations).toEqual(system.declarations);
	});
});

describe("the web path filter is written three times and must agree", () => {
	const WORKFLOWS = join(REPO, ".github/workflows");

	const pathListAfter = (body: string, heading: string): string[] => {
		const start = body.indexOf(heading);
		if (start === -1) return [];
		const lines = body.slice(start + heading.length).split("\n").slice(1);
		const paths: string[] = [];
		for (const line of lines) {
			const entry = /^\s+- "([^"]+)"\s*$/.exec(line);
			if (!entry) break;
			paths.push(entry[1]);
		}
		return paths;
	};

	const triggers = (): { label: string; paths: string[] }[] => [
		{
			label: "ci-web.yml pull_request paths",
			paths: pathListAfter(read(join(WORKFLOWS, "ci-web.yml")).split("pull_request:")[1] ?? "", "paths:"),
		},
		{
			label: "ci-web-noop.yml paths-ignore",
			paths: pathListAfter(read(join(WORKFLOWS, "ci-web-noop.yml")), "paths-ignore:"),
		},
		{
			label: "cleanup-web-development.yml paths",
			paths: pathListAfter(read(join(WORKFLOWS, "cleanup-web-development.yml")), "paths:"),
		},
	];

	it("finds a list in each of the three workflows", () => {
		expect(triggers().filter(({ paths }) => paths.length === 0).map(({ label }) => label)).toEqual([]);
	});

	it("keeps all three identical, or a preview Worker outlives its pull request", () => {
		const [first, ...rest] = triggers();
		const disagreeing = rest
			.filter(({ paths }) => paths.join("|") !== first.paths.join("|"))
			.map(({ label, paths }) => `${label} has ${paths.join(", ")}`);

		expect(disagreeing).toEqual([]);
	});
});

describe("the glossary's forbidden names stay out of the code", () => {
	const codeShaped = (term: string): boolean => /^[A-Za-z]+$/.test(term) && /[A-Z]/.test(term.slice(1));

	const forbiddenIdentifiers = (): string[] => [
		...new Set(
			[...read(join(REPO, "CONTEXT.md")).matchAll(GLOSSARY_AVOID_LINE)]
				.flatMap(([, list]) => list.split(",").map((term) => term.trim()))
				.filter(codeShaped),
		),
	];

	const sourceFiles = (): string[] => [
		...walk(join(REPO, "web/src"), (path) => WEB_SOURCE_FILE.test(path)),
		...walk(join(REPO, "app/lib"), (path) => path.endsWith(".dart")),
	];

	it("finds a term to police", () => {
		expect(forbiddenIdentifiers().length).toBeGreaterThan(0);
	});

	const PLAIN_WORDS_POLICED_IN_IDENTIFIERS: readonly string[] = [
		"heatmap",
		"colorway",
		"skin",
		"hotlink",
		"applet",
		"glance",
		"backdrop",
		"paywall",
		"donation",
		"purchase",
		"shop",
		"offering",
		"timeframe",
		"bucket",
	];

	const avoidedTerms = (): Set<string> =>
		new Set(
			[...read(join(REPO, "CONTEXT.md")).matchAll(GLOSSARY_AVOID_LINE)].flatMap(([, list]) =>
				list.split(",").map((term) => term.trim().toLowerCase()),
			),
		);

	const SDK_SEAMS: readonly string[] = ["app/lib/infrastructure/tip/revenuecat_tip_repository.dart"];

	const identifierFiles = (): string[] =>
		[
			...walk(join(REPO, "web/src"), (path) => path.endsWith(".ts")),
			...walk(join(REPO, "app/lib"), (path) => path.endsWith(".dart") && !GENERATED_DART_FILE.test(path)),
		].filter((path) => !SDK_SEAMS.includes(relative(path)));

	it("polices only words the glossary actually rejects, so the list cannot invent a rule", () => {
		const rejected = avoidedTerms();
		expect(PLAIN_WORDS_POLICED_IN_IDENTIFIERS.filter((word) => !rejected.has(word))).toEqual([]);
	});

	it("exempts only files that exist, and only a handful of them", () => {
		expect(SDK_SEAMS.filter((path) => !existsSync(join(REPO, path)))).toEqual([]);
		expect(SDK_SEAMS.length).toBeLessThanOrEqual(2);
	});

	it("names no identifier after a plain word the glossary rejects", () => {
		const offenders = identifierFiles().flatMap((file) => {
			const body = withoutStringLiterals(read(file));
			return PLAIN_WORDS_POLICED_IN_IDENTIFIERS.filter((word) =>
				new RegExp(`(?<![A-Za-z0-9])${word}(?![A-Za-z0-9])`, "i").test(body),
			).map((word) => `${relative(file)} uses ${word}`);
		});
		expect(offenders).toEqual([]);
	});

	it("names nothing in web/src or app/lib after a word the glossary rejects", () => {
		const forbidden = forbiddenIdentifiers();
		const offenders = sourceFiles().flatMap((file) => {
			const body = read(file);
			return forbidden
				.filter((term) => identifierNamed(term).test(body))
				.map((term) => `${relative(file)} uses ${term}`);
		});
		expect(offenders).toEqual([]);
	});
});

describe("nested guides name real files", () => {
	const nestedGuides = (): string[] => [
		...walk(join(REPO, "web/src"), (path) => path.endsWith("CLAUDE.md")),
		...walk(join(REPO, "app/lib"), (path) => path.endsWith("CLAUDE.md")),
	];

	const citedFilenames = (body: string): string[] => [
		...new Set(
			[...body.matchAll(BARE_FILENAME_IN_BACKTICKS)].map(([, name]) => name).filter((name) => !name.startsWith(".")),
		),
	];

	const sourceFilenames = (): Set<string> =>
		new Set(
			[...walk(join(REPO, "web/src"), () => true), ...walk(join(REPO, "app/lib"), () => true)].map(
				(path) => path.split(PATH_SEPARATOR).at(-1) ?? path,
			),
		);

	it("every bare filename a guide cites still exists somewhere in the source", () => {
		const names = sourceFilenames();
		const missing = nestedGuides().flatMap((guidePath) =>
			citedFilenames(read(guidePath))
				.filter((name) => !names.has(name))
				.map((name) => `${relative(guidePath)} cites ${name}`),
		);
		expect(missing).toEqual([]);
	});
});

describe("the source carries no code comments", () => {
	const TOOLING_DIRECTIVES = [/^\s*\/\/\/\s*<reference\b/, /^\s*\/\/\s*@vitest-environment\b/];

	const commentLines = (path: string): string[] =>
		read(path)
			.split("\n")
			.map((line, index) => ({ line, index }))
			.filter(({ line }) => !TOOLING_DIRECTIVES.some((directive) => directive.test(line)))
			.filter(({ line }) => {
				const bare = withoutStringLiterals(line);
				return LINE_COMMENT.test(bare) || BLOCK_COMMENT_OPENER.test(bare);
			})
			.map(({ index }) => `${relative(path)}:${index + 1}`);

	it("has no // or /* comment in hand-written Dart", () => {
		const offenders = [
			...walk(join(REPO, "app/lib"), (path) => path.endsWith(".dart")),
			...walk(join(REPO, "app/test"), (path) => path.endsWith(".dart")),
		]
			.filter((path) => !GENERATED_DART_FILE.test(path))
			.flatMap(commentLines);
		expect(offenders).toEqual([]);
	});

	it("has no // or /* comment in web TypeScript or Astro either", () => {
		const configs = ["web/astro.config.ts", "web/playwright.config.ts", "web/vitest.config.ts"].map((path) =>
			join(REPO, path),
		);
		const offenders = [
			...walk(join(REPO, "web/src"), (path) => WEB_SOURCE_FILE.test(path)),
			...walk(join(REPO, "web/e2e"), (path) => path.endsWith(".ts")),
			...walk(join(REPO, "web/workers"), (path) => path.endsWith(".ts")),
			...walk(join(REPO, "docs"), (path) => path.endsWith(".ts")),
			...configs,
		].flatMap(commentLines);
		expect(offenders).toEqual([]);
	});

	it("has no // comment in the repository scripts either", () => {
		const offenders = walk(join(REPO, "scripts"), (path) => path.endsWith(".mjs")).flatMap(commentLines);
		expect(offenders).toEqual([]);
	});
});

describe("nothing under web/src/pages becomes a route by accident", () => {
	const IGNORED_BY_ASTRO = (path: string): boolean =>
		relative(path)
			.split("/")
			.some((part) => part.startsWith("_"));

	it("colocates no test file inside the route namespace", () => {
		const offenders = walk(join(REPO, "web/src/pages"), (path) => COLOCATED_TEST_FILE.test(path))
			.filter((path) => !IGNORED_BY_ASTRO(path))
			.map(relative);
		expect(offenders).toEqual([]);
	});

	it("carries no markdown route other than the agent guide the middleware blocks", () => {
		const markdown = walk(join(REPO, "web/src/pages"), (path) => path.endsWith(".md"))
			.filter((path) => !IGNORED_BY_ASTRO(path))
			.map(relative);
		expect(markdown).toEqual(["web/src/pages/CLAUDE.md"]);
		expect(read(join(REPO, "web/src/middleware.ts"))).toContain('const AGENT_GUIDE_ROUTE = "/CLAUDE"');
	});
});

describe("the app's feature widgets go through the wrappers", () => {
	it("keeps every shadcn_ui import inside widgets/, theme/ and the composition root", () => {
		const allowed = ["app/lib/main.dart", "app/lib/ui/theme/app_colors.dart"];
		const offenders = walk(join(REPO, "app/lib"), (path) => path.endsWith(".dart"))
			.filter((path) => !GENERATED_DART_FILE.test(path))
			.filter((path) => read(path).includes("package:shadcn_ui/shadcn_ui.dart"))
			.map(relative)
			.filter((path) => !path.startsWith("app/lib/ui/widgets/"))
			.filter((path) => !allowed.includes(path));
		expect(offenders).toEqual([]);
	});
});

describe("the web layers only import inwards", () => {
	const FORBIDDEN_BY_LAYER: Record<string, readonly string[]> = {
		domain: ["@application/", "@infrastructure/", "@ui/"],
		application: ["@infrastructure/", "@ui/"],
		infrastructure: ["@application/", "@ui/"],
		ui: ["@infrastructure/"],
	};

	const IMPORT_SPECIFIER = /(?:from\s*|\bimport\s*\(?\s*)["']([^"']+)["']/g;

	const importsOf = (source: string): string[] => [...source.matchAll(IMPORT_SPECIFIER)].map((match) => match[1]);

	for (const [layer, forbidden] of Object.entries(FORBIDDEN_BY_LAYER)) {
		it(`keeps ${layer} clear of ${forbidden.join(", ")}`, () => {
			const offenders = walk(join(REPO, "web/src", layer), (path) => WEB_SOURCE_FILE.test(path))
				.flatMap((path) =>
					importsOf(read(path))
						.filter((specifier) => forbidden.some((prefix) => specifier.startsWith(prefix)))
						.map((specifier) => `${relative(path)} imports ${specifier}`),
				)
				.sort();
			expect(offenders).toEqual([]);
		});
	}
});
