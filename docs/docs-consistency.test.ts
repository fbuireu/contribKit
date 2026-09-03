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

interface WalkParams {
	dir: string;
	match: (path: string) => boolean;
}

const walk = ({ dir, match }: WalkParams): string[] => {
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

const read = (path: string): string => readFileSync(path, "utf8").replaceAll("\r\n", "\n");

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
const EXACT_VERSION = /^\d+\.\d+\.\d+$/;
const VERSIONS_SECTION = /^## Versions$([\s\S]*?)^## /m;
const QUOTED_VERSION = /\d+\.\d+/;
const REPINNED_RUNTIME = /^\s*(?:node-version|version|ruby-version|wranglerVersion):\s*["']?\d/m;
const PUBSPEC_FLUTTER_PIN = /^ {2}flutter: (\S+)$/m;
const PUBSPEC_DART_CONSTRAINT = /^ {2}sdk: "?([^"\n]+)"?$/m;
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

const markdownFiles = (): string[] => walk({ dir: REPO, match: (path) => path.endsWith(".md") });

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
		expect(rows.length, "the index table stopped matching, and reformatting it would make this vacuous").toBe(
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
			expect(normalise(read(mirrored)), `${name} is out of sync, run pnpm sync:assets`).toBe(
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
			...walk({ dir: join(REPO, "web/src"), match: (path) => path.endsWith("CLAUDE.md") }),
			...walk({ dir: join(REPO, "app/lib"), match: (path) => path.endsWith("CLAUDE.md") }),
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
		const strays = walk({ dir: REPO, match: (path) => path.endsWith("CONTEXT.md") }).filter(
			(path) => relative(path) !== "CONTEXT.md",
		);
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
		{ label: "Ruby", expected: read(join(REPO, "app/android/.ruby-version")).trim() },
	];

	it("reads a version for every pin it claims to check", () => {
		expect(pinned().filter(({ expected }) => !expected)).toEqual([]);
	});

	it("pins pnpm once, through packageManager", () => {
		const pinning = [
			["package.json", rootPackage.packageManager],
			["web/package.json", webPackage.packageManager],
			["app/package.json", appPackage.packageManager],
		].filter(([, pin]) => pin !== undefined);

		expect(pinning.map(([manifest]) => manifest)).toEqual(["package.json"]);
	});

	const RUNTIMES = ["pnpm", "Node", "Flutter", "Dart", "Ruby"];

	it("names every runtime it pins", () => {
		const unnamed = RUNTIMES.flatMap((runtime) =>
			[
				["CLAUDE.md", guide],
				["CONTRIBUTING.md", contributing],
			]
				.filter(([, body]) => !body.includes(runtime))
				.map(([doc]) => `${doc} does not name ${runtime}`),
		);

		expect(unnamed).toEqual([]);
	});

	it("pins Node once: both engines and .nvmrc are one fact, so they say the same thing", () => {
		const node = rootPackage.engines.node;

		expect(webPackage.engines.node).toBe(node);
		expect(read(join(REPO, ".nvmrc")).trim()).toBe(node);
	});

	it("quotes a version for none of them, since nothing here would keep one current", () => {
		const section = guide.match(VERSIONS_SECTION)?.[1] ?? "";
		const quoting = section.split("\n").filter((line) => line.startsWith("- ") && QUOTED_VERSION.test(line));

		expect(section).not.toBe("");
		expect(quoting).toEqual([]);
	});

	it("lets the Dart constraint follow Flutter instead of pinning it a second time", () => {
		const dart = pubspec.match(PUBSPEC_DART_CONSTRAINT)?.[1] ?? "";

		expect(dart).not.toBe("");
		expect(EXACT_VERSION.test(dart)).toBe(false);
	});

	it("pins every runtime to an exact version, never a range", () => {
		expect(pinned().filter(({ expected }) => !EXACT_VERSION.test(expected))).toEqual([]);
	});

	it("lets no workflow or composite action pin a runtime the manifest already pins", () => {
		const workflows = walk({ dir: join(REPO, ".github"), match: (path) => path.endsWith(".yml") });
		const repinned = workflows.filter((file) => REPINNED_RUNTIME.test(read(file)));

		expect(workflows.length).toBeGreaterThan(0);
		expect(repinned).toEqual([]);
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

describe("the Embed contract is spelled in two languages and must agree", () => {
	const DART_EMBED = join(REPO, "app/lib/domain/value_objects/embed.dart");
	const WEB_EMBED = join(REPO, "web/src/domain/value-objects/embed.ts");

	const dartConstant = (name: string): string | undefined =>
		new RegExp(`static const ${name} = '([^']+)'`).exec(read(DART_EMBED))?.[1];

	const sharedFirstKey = (file: string): string =>
		(JSON.parse(read(join(REPO, "shared", file))) as { key: string }[])[0].key;

	it("reads both spellings", () => {
		expect(existsSync(DART_EMBED)).toBe(true);
		expect(existsSync(WEB_EMBED)).toBe(true);
	});

	it("points both clients at the same origin, segment and extension", () => {
		const web = read(WEB_EMBED);

		expect(web).toContain(`const EMBED_ORIGIN = "${dartConstant("origin")}"`);
		expect(web).toContain(`const EMBED_SEGMENT = "${dartConstant("segment")}"`);
		expect(web).toContain(`const EMBED_EXTENSION = "${dartConstant("extension")}"`);
	});

	it("omits the same default Cell Shape, which shared/shapes.json decides", () => {
		const dartDefault = /static const defaultShape = CellShape\.(\w+);/.exec(read(DART_EMBED))?.[1];

		expect(dartDefault).toBe(sharedFirstKey("shapes.json"));
	});

	it("omits the same default Palette", () => {
		expect(dartConstant("defaultPaletteKey")).toBe("github");
		expect(read(WEB_EMBED)).toContain("DEFAULT_PALETTE_KEY");
	});
});

describe("the dark palette is written twice and must agree", () => {
	const VARIABLES = join(REPO, "web/src/ui/styles/global/variables.css");

	interface DeclarationsAfterParams {
		body: string;
		selector: string;
	}

	const declarationsAfter = ({ body, selector }: DeclarationsAfterParams): string[] => {
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
			{
				label: ":root:not(.theme-light)",
				declarations: declarationsAfter({ body: css, selector: ":root:not(.theme-light)" }),
			},
			{ label: ":root.theme-dark", declarations: declarationsAfter({ body: css, selector: ":root.theme-dark" }) },
		];
	};

	it("finds both blocks", () => {
		expect(
			blocks()
				.filter(({ declarations }) => declarations.length === 0)
				.map(({ label }) => label),
		).toEqual([]);
	});

	it("keeps the system-dark and the pinned-dark palettes identical", () => {
		const [system, pinned] = blocks();

		expect(pinned.declarations).toEqual(system.declarations);
	});
});

describe("the tail consumer names a Worker that declares that name", () => {
	const SITE = join(REPO, "web/wrangler.toml");
	const TAIL = join(REPO, "web/workers/tail/wrangler.toml");

	const declaredName = (): string | undefined => /^name\s*=\s*"([^"]+)"/m.exec(read(TAIL))?.[1];

	const consumers = (): string[] =>
		[...read(SITE).matchAll(/tail_consumers\]\]\s*service\s*=\s*"([^"]+)"/g)].map((match) => match[1]);

	it("finds a tail Worker and at least one consumer pointing somewhere", () => {
		expect(declaredName()).toBeTruthy();
		expect(consumers().length).toBeGreaterThan(0);
	});

	it("points every consumer at that Worker, or log forwarding stops with no error", () => {
		expect([...new Set(consumers())]).toEqual([declaredName()]);
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
		...walk({ dir: join(REPO, "web/src"), match: (path) => WEB_SOURCE_FILE.test(path) }),
		...walk({ dir: join(REPO, "app/lib"), match: (path) => path.endsWith(".dart") }),
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
		"density",
		"intensity",
		"zoom",
	];

	const avoidedTerms = (): Set<string> =>
		new Set(
			[...read(join(REPO, "CONTEXT.md")).matchAll(GLOSSARY_AVOID_LINE)].flatMap(([, list]) =>
				list.split(",").map((term) => term.trim().toLowerCase()),
			),
		);

	const SDK_SEAMS: readonly string[] = [
		"app/lib/infrastructure/tip/revenuecat_tip_repository.dart",
		"app/lib/infrastructure/tip/store_error.dart",
	];

	const identifierFiles = (): string[] =>
		[
			...walk({ dir: join(REPO, "web/src"), match: (path) => path.endsWith(".ts") }),
			...walk({
				dir: join(REPO, "app/lib"),
				match: (path) => path.endsWith(".dart") && !GENERATED_DART_FILE.test(path),
			}),
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
				new RegExp(`(?:(?<![A-Za-z0-9])|(?<=[a-z0-9_]))${word}(?![a-z0-9])`, "i").test(body),
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
		...walk({ dir: join(REPO, "web/src"), match: (path) => path.endsWith("CLAUDE.md") }),
		...walk({ dir: join(REPO, "app/lib"), match: (path) => path.endsWith("CLAUDE.md") }),
	];

	const citedFilenames = (body: string): string[] => [
		...new Set(
			[...body.matchAll(BARE_FILENAME_IN_BACKTICKS)].map(([, name]) => name).filter((name) => !name.startsWith(".")),
		),
	];

	const sourceFilenames = (): Set<string> =>
		new Set(
			[
				...walk({ dir: join(REPO, "web/src"), match: () => true }),
				...walk({ dir: join(REPO, "web/e2e"), match: () => true }),
				...walk({ dir: join(REPO, "web/workers"), match: () => true }),
				...walk({ dir: join(REPO, "app/lib"), match: () => true }),
				...walk({ dir: join(REPO, "app/test"), match: () => true }),
			].map((path) => path.split(PATH_SEPARATOR).at(-1) ?? path),
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
			...walk({ dir: join(REPO, "app/lib"), match: (path) => path.endsWith(".dart") }),
			...walk({ dir: join(REPO, "app/test"), match: (path) => path.endsWith(".dart") }),
		]
			.filter((path) => !GENERATED_DART_FILE.test(path))
			.flatMap(commentLines);
		expect(offenders).toEqual([]);
	});

	it("has no // or /* comment in the hand-written Kotlin either", () => {
		const offenders = walk({
			dir: join(REPO, "app/android/app/src/main/kotlin"),
			match: (path) => path.endsWith(".kt"),
		}).flatMap(commentLines);
		expect(offenders).toEqual([]);
	});

	it("has no // or /* comment in web TypeScript or Astro either", () => {
		const configs = ["web/astro.config.ts", "web/playwright.config.ts", "web/vitest.config.ts"].map((path) =>
			join(REPO, path),
		);
		const offenders = [
			...walk({ dir: join(REPO, "web/src"), match: (path) => WEB_SOURCE_FILE.test(path) }),
			...walk({ dir: join(REPO, "web/e2e"), match: (path) => path.endsWith(".ts") }),
			...walk({ dir: join(REPO, "web/workers"), match: (path) => path.endsWith(".ts") }),
			...walk({ dir: join(REPO, "docs"), match: (path) => path.endsWith(".ts") }),
			...configs,
		].flatMap(commentLines);
		expect(offenders).toEqual([]);
	});

	it("has no // comment in the repository scripts either", () => {
		const offenders = walk({ dir: join(REPO, "scripts"), match: (path) => path.endsWith(".mjs") }).flatMap(
			commentLines,
		);
		expect(offenders).toEqual([]);
	});
});

describe("nothing under web/src/pages becomes a route by accident", () => {
	const IGNORED_BY_ASTRO = (path: string): boolean =>
		relative(path)
			.split("/")
			.some((part) => part.startsWith("_"));

	it("colocates no test file inside the route namespace", () => {
		const offenders = walk({ dir: join(REPO, "web/src/pages"), match: (path) => COLOCATED_TEST_FILE.test(path) })
			.filter((path) => !IGNORED_BY_ASTRO(path))
			.map(relative);
		expect(offenders).toEqual([]);
	});

	it("carries no markdown route other than the agent guide the middleware blocks", () => {
		const markdown = walk({ dir: join(REPO, "web/src/pages"), match: (path) => path.endsWith(".md") })
			.filter((path) => !IGNORED_BY_ASTRO(path))
			.map(relative);
		expect(markdown).toEqual(["web/src/pages/CLAUDE.md"]);
		expect(read(join(REPO, "web/src/middleware.ts"))).toContain('const AGENT_GUIDE_ROUTE = "/CLAUDE"');
	});
});

describe("the app's feature widgets go through the wrappers", () => {
	it("keeps every shadcn_ui import inside widgets/, theme/ and the composition root", () => {
		const allowed = ["app/lib/main.dart", "app/lib/ui/theme/app_colors.dart"];
		const offenders = walk({ dir: join(REPO, "app/lib"), match: (path) => path.endsWith(".dart") })
			.filter((path) => !GENERATED_DART_FILE.test(path))
			.filter((path) => read(path).includes("package:shadcn_ui/shadcn_ui.dart"))
			.map(relative)
			.filter((path) => !path.startsWith("app/lib/ui/widgets/"))
			.filter((path) => !allowed.includes(path));
		expect(offenders).toEqual([]);
	});

	it("lets shadcn_ui out of widgets/ only through the one re-export, narrowed to LucideIcons", () => {
		const ICONS = "app/lib/ui/widgets/app_icons.dart";
		const reExporters = walk({ dir: join(REPO, "app/lib"), match: (path) => path.endsWith(".dart") })
			.filter((path) => !GENERATED_DART_FILE.test(path))
			.filter((path) => /^\s*export\s+['"]package:shadcn_ui\//m.test(read(path)))
			.map(relative);

		expect(reExporters).toEqual([ICONS]);
		expect(
			read(join(REPO, ICONS)),
			"the show clause is the whole confinement: without it every importer of app_icons gets all of shadcn_ui, and the import guard above cannot see a re-export",
		).toContain("show LucideIcons");
	});
});

describe("the web layers only import inwards", () => {
	interface ReachesParams {
		readonly file: string;
		readonly specifier: string;
	}

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
			const reaches = ({ file, specifier }: ReachesParams): boolean => {
				if (forbidden.some((prefix) => specifier.startsWith(prefix))) return true;
				if (!specifier.startsWith(".")) return false;
				const landed = relative(resolve(dirname(file), specifier));
				return (
					forbidden.some((prefix) => landed.startsWith(`web/src/${prefix.slice(1)}`)) ||
					landed.startsWith("web/src/pages/")
				);
			};

			const offenders = walk({ dir: join(REPO, "web/src", layer), match: (path) => WEB_SOURCE_FILE.test(path) })
				.flatMap((path) =>
					importsOf(read(path))
						.filter((specifier) => reaches({ file: path, specifier }))
						.map((specifier) => `${relative(path)} imports ${specifier}`),
				)
				.sort();
			expect(offenders).toEqual([]);
		});
	}
});

describe("the app layers only import inwards", () => {
	const FORBIDDEN_BY_LAYER: Record<string, readonly string[]> = {
		domain: ["application/", "infrastructure/", "ui/"],
		application: ["infrastructure/", "ui/"],
		infrastructure: ["application/", "ui/"],
	};

	const DART_IMPORT = /(?:import|export)\s+'package:contribkit\/([^']+)'/g;

	const layerImportsOf = (source: string): string[] => [...source.matchAll(DART_IMPORT)].map((match) => match[1]);

	const dartFiles = (layer: string): string[] =>
		walk({
			dir: join(REPO, "app/lib", layer),
			match: (path) => path.endsWith(".dart") && !GENERATED_DART_FILE.test(path),
		});

	for (const [layer, forbidden] of Object.entries(FORBIDDEN_BY_LAYER)) {
		it(`keeps ${layer} clear of ${forbidden.join(", ")}`, () => {
			const offenders = dartFiles(layer)
				.flatMap((path) =>
					layerImportsOf(read(path))
						.filter((specifier) => forbidden.some((prefix) => specifier.startsWith(prefix)))
						.map((specifier) => `${relative(path)} imports ${specifier}`),
				)
				.sort();
			expect(offenders).toEqual([]);
		});
	}

	it("keeps the pure core free of Flutter, Riverpod and the platform", () => {
		const BANNED = ["package:flutter", "package:riverpod", "dart:ui", "dart:io", "package:hive", "package:http"];
		const offenders = ["domain", "application"]
			.flatMap(dartFiles)
			.flatMap((path) => {
				const body = read(path);
				return BANNED.filter((banned) => body.includes(`import '${banned}`) || body.includes(`export '${banned}`)).map(
					(banned) => `${relative(path)} imports ${banned}`,
				);
			})
			.sort();
		expect(
			offenders,
			"app/lib/domain/CLAUDE.md promises zero external dependencies, and nothing was checking it",
		).toEqual([]);
	});
});

describe("two or more arguments are one object typed after the function", () => {
	const FUNCTION_SIGNATURE = /(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*(?:<[^>]*>)?\s*\(([^)]*)\)/g;
	const ARROW_SIGNATURE =
		/(?:export\s+)?const\s+([A-Za-z0-9_]+)\s*(?::[^=]*)?=\s*(?:async\s*)?\(([^)]*)\)\s*(?::[^=]*)?=>/g;
	const TRAILING_COMMA = /,\s*$/;

	interface TopLevelArityParams {
		parameters: string;
	}

	const topLevelArity = ({ parameters }: TopLevelArityParams): number => {
		let depth = 0;
		let arity = 1;

		for (const character of parameters) {
			if ("<([{".includes(character)) depth += 1;
			else if (">)]}".includes(character)) depth -= 1;
			else if (character === "," && depth === 0) arity += 1;
		}

		return arity;
	};

	const sources = [
		...walk({ dir: join(REPO, "web/src"), match: (path) => path.endsWith(".ts") }),
		...walk({ dir: join(REPO, "web/e2e"), match: (path) => path.endsWith(".ts") }),
		...walk({ dir: join(REPO, "docs"), match: (path) => path.endsWith(".ts") }),
	];

	it("is the rule the guide states", () => {
		expect(read(join(REPO, "CLAUDE.md"))).toContain("One argument is positional; two or more are one object");
	});

	it("holds everywhere, tests included", () => {
		const positional = sources.flatMap((file) =>
			[...read(file).matchAll(FUNCTION_SIGNATURE), ...read(file).matchAll(ARROW_SIGNATURE)]
				.map(([, name, parameters]) => ({ name, parameters: (parameters ?? "").trim().replace(TRAILING_COMMA, "") }))
				.filter(({ parameters }) => parameters.length > 0 && !parameters.startsWith("{"))
				.filter(({ parameters }) => topLevelArity({ parameters }) > 1)
				.map(({ name }) => `${file.replace(`${REPO}/`, "")}: ${name}`),
		);

		expect(positional).toEqual([]);
	});
});

describe("the workflows", () => {
	const WORKFLOWS = join(REPO, ".github/workflows");
	const workflows = readdirSync(WORKFLOWS)
		.filter((file) => file.endsWith(".yml"))
		.map((file) => join(WORKFLOWS, file));
	const steps = workflows.flatMap((file) =>
		read(file)
			.split("- name:")
			.map((step) => ({ file, step })),
	);
	const RETRY_WRAPPER = "nick-fields/retry";
	const DEPLOY_COMMAND = /\bwrangler deploy\b/;
	const BUILD_COMMAND = /\b(?:astro build|pnpm build)\b/;
	const SECRET_COMMAND = /\bwrangler secret\b/;
	const CLEANUP_GROUP = /group: CI-refs\/pull\/\$\{\{ github\.event\.pull_request\.number \}\}\/merge/;
	const AGGREGATE_NEEDS = /name: Check\n\s+needs: \[([^\]]+)\]\n\s+if: \$\{\{ always\(\) \}\}/;

	it("runs every deploy, build and secret write without a retry wrapper", () => {
		const wrapped = steps
			.filter(({ step }) => DEPLOY_COMMAND.test(step) || BUILD_COMMAND.test(step) || SECRET_COMMAND.test(step))
			.filter(({ step }) => step.includes(RETRY_WRAPPER))
			.map(({ file, step }) => `${relative(file)} ->${step.split("\n")[0]}`);
		const deploying = steps.filter(({ step }) => DEPLOY_COMMAND.test(step)).length;

		expect(deploying).toBeGreaterThan(0);
		expect(wrapped).toEqual([]);
	});

	it("queues the preview Worker cleanup behind the pull request's own CI run", () => {
		expect(read(join(WORKFLOWS, "ci.yml"))).toMatch(/^name: CI$/m);
		expect(read(join(WORKFLOWS, "cleanup-development.yml"))).toMatch(CLEANUP_GROUP);
	});

	it("aggregates every gated job under Check, so the preview E2E run gates a merge", () => {
		const needs = (read(join(WORKFLOWS, "ci.yml")).match(AGGREGATE_NEEDS)?.[1] ?? "")
			.split(",")
			.map((job) => job.trim());

		expect(needs).toEqual(
			expect.arrayContaining([
				"docs-contract",
				"app-ci",
				"verify-web",
				"deploy-development",
				"e2e",
				"deploy-production",
				"smoke",
				"release",
			]),
		);
	});
});

const VERSIONED_DEPENDENCIES: Record<string, string[]> = {
	astro: ["Astro"],
	"@astrojs/starlight": ["Starlight"],
	effect: ["Effect"],
	next: ["Next", "Next.js"],
	react: ["React"],
	tailwindcss: ["Tailwind", "Tailwind CSS"],
	typescript: ["TypeScript"],
	wrangler: ["wrangler", "Wrangler"],
};
const escapeForRegExp = (name: string): string => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const statedVersionPattern = (names: string[]): RegExp =>
	new RegExp(`\\b(?:${names.map(escapeForRegExp).join("|")})\\s+(?:v|@)?\\d+(?:\\.\\d+)*\\b`, "g");
interface PolicedNamesParams {
	readonly declared: Set<string>;
	readonly runtimes: string[];
}
const policedNames = ({ declared, runtimes }: PolicedNamesParams): string[] => [
	...runtimes,
	...Object.entries(VERSIONED_DEPENDENCIES)
		.filter(([dependency]) => declared.has(dependency))
		.flatMap(([, names]) => names),
];
const declaredIn = (manifests: { dependencies?: object; devDependencies?: object }[]): Set<string> =>
	new Set(manifests.flatMap((manifest) => Object.keys({ ...manifest.dependencies, ...manifest.devDependencies })));
const POLICED_NAMES = policedNames({
	declared: declaredIn([
		JSON.parse(read(join(REPO, "package.json"))),
		JSON.parse(read(join(REPO, "web/package.json"))),
	]),
	runtimes: [
		"Node",
		"Node.js",
		"pnpm",
		...(existsSync(join(REPO, "app/pubspec.yaml")) ? ["Flutter", "Dart"] : []),
		...(existsSync(join(REPO, "app/android/.ruby-version")) ? ["Ruby"] : []),
	],
});
const STATED_VERSION = statedVersionPattern(POLICED_NAMES);
const NARRATED_VERSIONS: Record<string, string[]> = { "CLAUDE.md": ["Flutter 3.47.2", "Dart 3.13.2"] };

describe("stated versions", () => {
	it("polices the runtimes and every versioned dependency the manifests declare, and nothing else", () => {
		expect(POLICED_NAMES).toEqual(expect.arrayContaining(["Node", "pnpm"]));
		expect(POLICED_NAMES.length).toBeGreaterThan(2);
	});

	it("states the current version of nothing a bot moves, outside the ADRs", () => {
		const documents = markdownFiles()
			.map(relative)
			.filter((file) => !file.startsWith("docs/adr/") && !file.endsWith("CHANGELOG.md"));
		const stated = documents.flatMap((file) =>
			[...read(join(REPO, file)).matchAll(STATED_VERSION)]
				.map(([match]) => match)
				.filter((match) => !(NARRATED_VERSIONS[file] ?? []).includes(match))
				.map((match) => `${file}: ${match}`),
		);

		expect(documents.length).toBeGreaterThan(0);
		expect(stated).toEqual([]);
	});
});
