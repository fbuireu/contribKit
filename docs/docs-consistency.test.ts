import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
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
const WEB_SOURCE_FILE = /\.(tsx?|astro)$/;
const GENERATED_DART_FILE = /\.(g|freezed)\.dart$/;
const BARE_FILENAME_IN_BACKTICKS = /`([A-Za-z0-9_.[\]-]+\.(?:ts|dart|astro))`/g;
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
const COLOCATED_TEST_FILE = /\.test\.tsx?$/;
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
const DART_CLOCK_READ = /\bDateTime\.(?:now|timestamp)\b/;
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

const IMPORT_SPECIFIER = /(?:from\s*|\bimport\s*\(?\s*)["']([^"']+)["']/g;

const importsOf = (source: string): string[] => [...source.matchAll(IMPORT_SPECIFIER)].map((match) => match[1]);

interface BracedBodyFromParams {
	source: string;
	open: number;
}

const bracedBodyFrom = ({ source, open }: BracedBodyFromParams): string => {
	let depth = 0;

	for (let index = open; index < source.length; index += 1) {
		if (source[index] === "{") depth += 1;
		else if (source[index] === "}") {
			depth -= 1;
			if (depth === 0) return source.slice(open + 1, index);
		}
	}

	return source.slice(open + 1);
};

interface LinesMatchingParams {
	files: readonly string[];
	pattern: RegExp;
}

const linesMatching = ({ files, pattern }: LinesMatchingParams): string[] =>
	files.flatMap((path) =>
		withoutStringLiterals(read(path))
			.split("\n")
			.map((line, index) => ({ line, index }))
			.filter(({ line }) => pattern.test(line))
			.map(({ index }) => `${relative(path)}:${index + 1}`),
	);

interface EmptyRootsParams {
	paths: readonly string[];
	roots: readonly string[];
}

const emptyRoots = ({ paths, roots }: EmptyRootsParams): string[] =>
	roots.filter((root) => !paths.some((path) => path.startsWith(`${root}/`)));

const CONTRIBUTOR_GUIDE = ".github/CONTRIBUTING.md";
const CODING_STANDARDS = "CODING_STANDARDS.md";

const markdownFiles = (): string[] => walk({ dir: REPO, match: (path) => path.endsWith(".md") });

const githubDocuments = (): string[] =>
	readdirSync(join(REPO, ".github"))
		.filter((name) => name.endsWith(".md"))
		.map((name) => join(REPO, ".github", name));

const checkedDocuments = (): string[] => [...markdownFiles(), ...githubDocuments()];

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

describe("the corpus the contract reads", () => {
	it("finds the documents, the wiki pages and the decisions the rules below walk", () => {
		const documents = markdownFiles();

		expect(documents.filter((file) => !isWiki(file)).length).toBeGreaterThan(0);
		expect(documents.filter(isWiki).length).toBeGreaterThan(0);
		expect(githubDocuments().map(relative)).toContain(CONTRIBUTOR_GUIDE);
		expect(adrs().filter((name) => name !== ADR_TEMPLATE).length).toBeGreaterThan(0);
	});
});

describe("markdown links", () => {
	it("every relative link points at a file that exists", () => {
		const checked: string[] = [];
		const broken: string[] = [];
		for (const file of checkedDocuments()) {
			if (isWiki(file)) continue;
			for (const [, target] of withoutCode(read(file)).matchAll(MARKDOWN_LINK_TARGET)) {
				if (NON_RELATIVE_LINK.test(target) || target.includes("?")) continue;
				if (GITHUB_SHORTHAND.test(target)) continue;
				const [path] = target.split("#");
				if (!path) continue;
				checked.push(target);
				if (!existsSync(join(dirname(file), path))) broken.push(`${relative(file)} -> ${target}`);
			}
		}
		expect(checked.length).toBeGreaterThan(0);
		expect(broken).toEqual([]);
	});

	it("every ../../wiki/ shorthand names a page the wiki actually publishes", () => {
		const pages = wikiPages();
		const shorthands = checkedDocuments()
			.filter((file) => !isWiki(file))
			.flatMap((file) =>
				[...withoutCode(read(file)).matchAll(WIKI_SHORTHAND_TARGET)].map(([, page]) => ({ file, page })),
			);
		const broken = shorthands
			.filter(({ page }) => !pages.has(page))
			.map(({ file, page }) => `${relative(file)} -> ${page}`);

		expect(shorthands.length).toBeGreaterThan(0);
		expect(broken).toEqual([]);
	});

	it("every wiki page link points at a wiki page that exists", () => {
		const pages = wikiPages();
		const checked: string[] = [];
		const broken: string[] = [];
		for (const file of markdownFiles().filter(isWiki)) {
			for (const [, target] of withoutCode(read(file)).matchAll(MARKDOWN_LINK_TARGET)) {
				if (NON_RELATIVE_LINK.test(target)) continue;
				const [path] = target.split("#");
				if (!path) continue;
				checked.push(target);
				if (path.includes("/") || path.endsWith(".md")) {
					if (!existsSync(join(dirname(file), path))) broken.push(`${relative(file)} -> ${target}`);
					continue;
				}
				if (!pages.has(path)) broken.push(`${relative(file)} -> ${target}`);
			}
		}
		expect(checked.length).toBeGreaterThan(0);
		expect(broken).toEqual([]);
	});
});

describe("every Mermaid diagram keeps the layout it was drawn for", () => {
	const MERMAID_BLOCK = /```mermaid\n([\s\S]*?)```/g;
	const DAGRE_FRONT_MATTER = /^---\nconfig:\n(?: {2}[^\n]*\n)*? {2}layout: dagre\n(?: {2}[^\n]*\n)*?---\n/;

	it("pins each one to dagre in its front matter, so a renderer upgrade cannot re-lay it out", () => {
		const diagrams = checkedDocuments().flatMap((path) =>
			[...read(path).matchAll(MERMAID_BLOCK)].map((match) => ({
				at: `${relative(path)}:${read(path).slice(0, match.index).split("\n").length}`,
				body: match[1],
			})),
		);
		const unpinned = diagrams.filter(({ body }) => !DAGRE_FRONT_MATTER.test(body)).map(({ at }) => at);

		expect(diagrams.length).toBeGreaterThan(0);
		expect(unpinned).toEqual([]);
	});
});

describe("source paths named in documentation", () => {
	it("every referenced source file exists", () => {
		const cited: string[] = [];
		const missing: string[] = [];
		for (const file of checkedDocuments()) {
			for (const [, path] of read(file).matchAll(SOURCE_PATH_IN_BACKTICKS)) {
				cited.push(path);
				const resolved = join(REPO, path);
				if (!existsSync(resolved) || !statSync(resolved).isFile()) missing.push(`${relative(file)} -> ${path}`);
			}
		}
		expect(cited.length).toBeGreaterThan(0);
		expect(missing).toEqual([]);
	});

	it("cites symbols, never a line number that will rot", () => {
		const allowed = new Set(["docs/adr/0000-adr-template.md"]);
		const cited: string[] = [];
		for (const file of checkedDocuments()) {
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
		const references = checkedDocuments().flatMap((file) => adrReferencesIn(file).map((number) => ({ file, number })));
		const dangling = references
			.filter(({ number }) => !existing.has(number))
			.map(({ file, number }) => `${relative(file)} -> ADR ${number}`);

		expect(references.length).toBeGreaterThan(0);
		expect(dangling).toEqual([]);
	});

	it("is referred to in the four-digit form a guard can see", () => {
		const short = checkedDocuments().flatMap((file) =>
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
		const terms = [...read(join(REPO, "GLOSSARY.md")).matchAll(GLOSSARY_TERM)].map(([, term]) => term);
		const corpus = markdownFiles()
			.filter((file) => relative(file) !== "GLOSSARY.md")
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
		const names = tokenFiles();
		const drifted = names.flatMap((name) => {
			const mirrored = join(assetsDir, name);
			if (!existsSync(mirrored)) return [`${name} is missing from app/assets`];
			return normalise(read(mirrored)) === normalise(read(join(sharedDir, name)))
				? []
				: [`${name} is out of sync, run pnpm sync:assets`];
		});

		expect(names.length).toBeGreaterThan(0);
		expect(drifted).toEqual([]);
	});

	it("mirrors nothing shared/ does not hold", () => {
		const mirrored = readdirSync(assetsDir)
			.filter((name) => name.endsWith(".json"))
			.sort();

		expect(mirrored.length).toBeGreaterThan(0);
		expect(mirrored).toEqual(tokenFiles().sort());
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
			...walk({ dir: join(REPO, "web/src"), match: (path) => path.endsWith("AGENTS.md") }),
			...walk({ dir: join(REPO, "app/lib"), match: (path) => path.endsWith("AGENTS.md") }),
		]
			.map(relative)
			.sort();

	const LAYER_ROOTS = ["web/src", "app/lib"];

	it("gives every layer under web/src and app/lib its own guide", () => {
		const guides = LAYER_ROOTS.flatMap((root) => directoriesIn(root).map((layer) => `${root}/${layer}/AGENTS.md`));

		expect(emptyRoots({ paths: guides, roots: LAYER_ROOTS })).toEqual([]);
		expect(guides.filter((path) => !existsSync(join(REPO, path)))).toEqual([]);
	});

	it("lists every guide that exists in the root guide's table", () => {
		const guide = read(join(REPO, "AGENTS.md"));
		const guides = layerGuides();

		expect(emptyRoots({ paths: guides, roots: LAYER_ROOTS })).toEqual([]);
		expect(guides.filter((path) => !guide.includes(path))).toEqual([]);
	});

	it("lists every guide that exists in the ARCHITECTURE.md document map", () => {
		const index = read(join(REPO, ADR_INDEX));
		const guides = layerGuides();

		expect(emptyRoots({ paths: guides, roots: LAYER_ROOTS })).toEqual([]);
		expect(guides.filter((path) => !index.includes(path))).toEqual([]);
	});

	it("no stray GLOSSARY.md survives outside the repo root", () => {
		const glossaries = walk({ dir: REPO, match: (path) => path.endsWith("GLOSSARY.md") }).map(relative);

		expect(glossaries).toContain("GLOSSARY.md");
		expect(glossaries.filter((path) => path !== "GLOSSARY.md")).toEqual([]);
	});
});

describe("the guides keep no list of known breaches", () => {
	const BACKLOG_FILE = /^backlog\.md$/i;
	const KNOWN_BREACHES_HEADING = /^#{1,6}[ \t]+(?:\d+\.[ \t]+)?Known (?:inconsistencies|defects|breaches)\b/im;

	const everywhere = (match: (path: string) => boolean): string[] =>
		[...walk({ dir: REPO, match }), ...walk({ dir: join(REPO, ".github"), match })].map(relative);

	const isBacklogFile = (path: string): boolean => BACKLOG_FILE.test(basename(path));

	const listsKnownBreaches = (body: string): boolean =>
		KNOWN_BREACHES_HEADING.test(body.replace(FENCED_CODE_BLOCK, ""));

	it("tells a list of known breaches from prose that names one, and a backlog file from a file that mentions one", () => {
		const listing = ["## 9. Known inconsistencies\n\n- an entry\n", "intro\n### Known defects\n", "# Known breaches"];
		const prose = [
			"a breach is not a known inconsistencies list",
			"- **hard**: no guide keeps a list of known inconsistencies",
			"an entry under *Known inconsistencies*",
			"```md\n## Known defects\n```",
			"## Known issues",
		];

		expect(listing.filter((body) => !listsKnownBreaches(body))).toEqual([]);
		expect(prose.filter(listsKnownBreaches)).toEqual([]);
		expect(["BACKLOG.md", "docs/backlog.md", "web/Backlog.md"].filter((path) => !isBacklogFile(path))).toEqual([]);
		expect(["BACKLOG.md.bak", "docs/backlog-notes.md", "backlog.txt"].filter(isBacklogFile)).toEqual([]);
	});

	it("fixes a breach in the change that finds it, so no document holds a claim that nothing keeps true", () => {
		const documents = everywhere((path) => path.endsWith(".md"));
		const listing = documents.filter((path) => listsKnownBreaches(read(join(REPO, path))));

		expect(documents).toEqual(
			expect.arrayContaining(["ARCHITECTURE.md", CODING_STANDARDS, CONTRIBUTOR_GUIDE, "docs/wiki/Home.md"]),
		);
		expect(everywhere(isBacklogFile)).toEqual([]);
		expect(listing).toEqual([]);
	});
});

describe("the guides match the manifests", () => {
	const guide = read(join(REPO, "AGENTS.md"));
	const contributing = read(join(REPO, CONTRIBUTOR_GUIDE));
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
				["AGENTS.md", guide],
				[CONTRIBUTOR_GUIDE, contributing],
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

	it("keeps Renovate's release-age wait at least as long as pnpm's, which refuses to resolve a younger version", () => {
		const MINUTES_PER_UNIT: Record<string, number> = { minute: 1, hour: 60, day: 1440, week: 10080 };
		const pnpmWait = /^minimumReleaseAge: (\d+)$/m.exec(read(join(REPO, "pnpm-workspace.yaml")))?.[1];
		const renovateWait = /^(\d+) (minute|hour|day|week)s?$/.exec(
			json<{ minimumReleaseAge?: string }>(".github/renovate.json").minimumReleaseAge ?? "",
		);
		const renovateMinutes = renovateWait ? Number(renovateWait[1]) * MINUTES_PER_UNIT[renovateWait[2]] : Number.NaN;

		expect(pnpmWait).toBeDefined();
		expect(renovateMinutes).not.toBeNaN();
		expect(renovateMinutes).toBeGreaterThanOrEqual(Number(pnpmWait));
	});

	it("mentions only pnpm scripts that a package.json declares, reading commands rather than prose", () => {
		const builtins = new Set(["install", "exec", "dlx", "add", "remove", "run", "why", "workspaces"]);
		const declared = new Set([...Object.keys(rootPackage.scripts), ...Object.keys(webPackage.scripts)]);
		const documented = [
			["AGENTS.md", guide],
			[CONTRIBUTOR_GUIDE, contributing],
		].flatMap(([doc, body]) =>
			[...codeOnly(body).matchAll(DOCUMENTED_PNPM_SCRIPT)].map(([, script]) => ({ doc, script })),
		);
		const invented = documented
			.filter(({ script }) => !builtins.has(script) && !declared.has(script))
			.map(({ doc, script }) => `${doc} -> pnpm ${script}`);

		expect(documented.length).toBeGreaterThan(0);
		expect(invented).toEqual([]);
	});

	it("substitutes nothing in a package script, since cmd would pass it through as text", () => {
		const SHELL_SUBSTITUTION = /\$\(|\$\{|`/;
		const scripts = [
			["package.json", rootPackage.scripts],
			["web/package.json", webPackage.scripts],
			["app/package.json", json<{ scripts?: Record<string, string> }>("app/package.json").scripts ?? {}],
		].flatMap(([manifest, declared]) =>
			Object.entries(declared as Record<string, string>).map(([name, command]) => ({ manifest, name, command })),
		);
		const substituting = scripts
			.filter(({ command }) => SHELL_SUBSTITUTION.test(command))
			.map(({ manifest, name }) => `${manifest} -> ${name}`);

		expect(scripts.length).toBeGreaterThan(0);
		expect(substituting).toEqual([]);
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
		expect([DART_EMBED, WEB_EMBED].filter((path) => !existsSync(path)).map(relative)).toEqual([]);
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
		const webDefault = /export const DEFAULT_PALETTE_KEY = PALETTES\.(\w+)\.key;/.exec(
			read(join(REPO, "web/src/domain/value-objects/palette.ts")),
		)?.[1];

		expect(webDefault, "palette.ts names its default as PALETTES.<key>.key").toBeDefined();
		expect(dartConstant("defaultPaletteKey")).toBe(webDefault);
		expect(read(WEB_EMBED)).toContain("DEFAULT_PALETTE_KEY");
	});
});

describe("the Contact Message limits are written twice and must agree", () => {
	const DART = join(REPO, "app/lib/domain/value_objects/contact_message.dart");
	const WEB = join(REPO, "web/src/domain/value-objects/contact-message.ts");

	const LIMITS: readonly { dart: string; web: string }[] = [
		{ dart: "maxNameLength", web: "MAX_CONTACT_NAME_LENGTH" },
		{ dart: "maxEmailLength", web: "MAX_CONTACT_EMAIL_LENGTH" },
		{ dart: "minBodyLength", web: "MIN_CONTACT_BODY_LENGTH" },
		{ dart: "maxBodyLength", web: "MAX_CONTACT_BODY_LENGTH" },
	];

	interface LimitParams {
		body: string;
		pattern: RegExp;
	}

	const limit = ({ body, pattern }: LimitParams): string | undefined => pattern.exec(body)?.[1];

	const dartLimit = (name: string): RegExp => new RegExp(`static const ${name} = ([0-9]+);`);
	const webLimit = (name: string): RegExp => new RegExp(`export const ${name} = ([0-9]+);`);

	it("reads both spellings", () => {
		expect([DART, WEB].filter((path) => !existsSync(path)).map(relative)).toEqual([]);
	});

	it("declares every limit in both languages", () => {
		const dart = read(DART);
		const web = read(WEB);
		const undeclared = LIMITS.flatMap(({ dart: dartName, web: webName }) => [
			...(limit({ body: dart, pattern: dartLimit(dartName) }) ? [] : [`app: ${dartName}`]),
			...(limit({ body: web, pattern: webLimit(webName) }) ? [] : [`web: ${webName}`]),
		]);

		expect(undeclared).toEqual([]);
	});

	it("bounds a Contact Message by the same numbers on both clients", () => {
		const dart = read(DART);
		const web = read(WEB);
		const disagreeing = LIMITS.filter(({ dart: dartName, web: webName }) => {
			const inDart = limit({ body: dart, pattern: dartLimit(dartName) });
			const inWeb = limit({ body: web, pattern: webLimit(webName) });
			return inDart !== inWeb;
		});

		expect(disagreeing.map(({ dart: dartName }) => dartName)).toEqual([]);
	});

	it("sends from the zone's own address, and names the recipient in no file", () => {
		const repository = read(join(REPO, "web/src/infrastructure/email/cloudflare-contact-message-repository.ts"));
		const sender = /export const CONTACT_SENDER = "([^"]+)"/.exec(repository)?.[1];
		const wrangler = read(join(REPO, "web/wrangler.toml"));
		const bindings = wrangler.match(/^\[\[(?:env\.\w+\.)?send_email\]\]$/gm) ?? [];

		expect(sender?.endsWith("@contribkit.app"), "the sender must be on the zone Email Routing serves").toBe(true);
		expect(bindings.length, "the binding is declared at the top level and in every environment").toBeGreaterThanOrEqual(
			3,
		);
		expect(wrangler).not.toMatch(/destination_address|allowed_destination_addresses/);
	});

	it("reads the recipient from the one variable the deploy passes to the build", () => {
		const deploy = read(join(REPO, ".github/workflows/_deploy.yml"));
		const config = read(join(REPO, "web/astro.config.ts"));
		const root = read(join(REPO, "web/src/pages/_contact.ts"));

		expect(deploy).toMatch(/^\s+MAINTAINER_EMAIL: \$\{\{ vars\.MAINTAINER_EMAIL \}\}$/m);
		expect(config).toMatch(/MAINTAINER_EMAIL: envField\.string\(\{ context: "server", access: "public"/);
		expect(root).toContain('import { MAINTAINER_EMAIL } from "astro:env/server"');
	});

	it("posts to a contact endpoint the web actually routes", () => {
		const spelled = /const contactEndpointPath = '([^']+)'/.exec(
			read(join(REPO, "app/lib/infrastructure/contact/http_contact_message_repository.dart")),
		)?.[1];

		expect(spelled, "the Dart repository no longer spells the endpoint as a constant").toBeDefined();
		expect(spelled?.startsWith("/api/")).toBe(true);
		expect(
			existsSync(join(REPO, "web/src/pages", `${spelled?.slice(1)}.ts`)),
			`no route under web/src/pages answers ${spelled}`,
		).toBe(true);
	});
});

describe("the request timeout is twenty seconds in both languages", () => {
	it("is the same number on the web and in the app", () => {
		const web = /export const REQUEST_TIMEOUT_MS = (\d[\d_]*);/.exec(
			read(join(REPO, "web/src/domain/value-objects/request-timeout.ts")),
		)?.[1];
		const app = /static const duration = Duration\(seconds: (\d+)\);/.exec(
			read(join(REPO, "app/lib/infrastructure/http/request_timeout.dart")),
		)?.[1];

		expect(web).toBeDefined();
		expect(app).toBeDefined();
		expect(Number(web?.replaceAll("_", ""))).toBe(Number(app) * 1000);
	});
});

describe("the rate limit's wait is a duration on the web and an instant in the app", () => {
	const WEB_FAILURE = join(REPO, "web/src/domain/failures/failure.ts");
	const DART_FAILURE = join(REPO, "app/lib/domain/failures/failure.dart");
	const DOMAIN_GUIDES = ["web/src/domain/AGENTS.md", "app/lib/domain/AGENTS.md"];

	it("is declared as each client's guide says, so the stated difference is the real one", () => {
		expect(read(WEB_FAILURE)).toMatch(/\bretryAfterSeconds: number \| null\b/);
		expect(read(DART_FAILURE)).toMatch(/\bfinal DateTime\? resetAt;/);
	});

	it("is named, in both spellings, by both domain guides and by the standards", () => {
		const documents = [...DOMAIN_GUIDES, CODING_STANDARDS];
		const silent = documents.flatMap((document) =>
			["retryAfterSeconds", "resetAt"]
				.filter((name) => !read(join(REPO, document)).includes(name))
				.map((name) => `${document} does not name ${name}`),
		);

		expect(documents.length).toBeGreaterThan(1);
		expect(silent).toEqual([]);
	});
});

describe("a Tip unlocks nothing, down to what the app ships", () => {
	const PUBSPEC = join(REPO, "app/pubspec.yaml");

	it("ships no paywall SDK, which is ADR 0009 stated as a dependency", () => {
		expect(
			read(PUBSPEC),
			"purchases_ui_flutter is RevenueCat's Paywall builder; app/README.md says this app does not use one, and a dependency nobody imports is still a dependency the APK carries",
		).not.toContain("purchases_ui_flutter");
	});
});

describe("the app is analyzed by the command that loads its plugin", () => {
	const OPTIONS = join(REPO, "app/analysis_options.yaml");
	const PUBSPEC = join(REPO, "app/pubspec.yaml");
	const SEARCHED = [".github", "docs", "app/lefthook.yml", "AGENTS.md", "ARCHITECTURE.md", CODING_STANDARDS];

	it("declares riverpod_lint as a plugin, over a range the manifest satisfies", () => {
		const declared = /^\s{2}riverpod_lint:\s*\^(\d+)\.(\d+)\.\d+\s*$/m.exec(read(OPTIONS));
		const pinned = /^\s{2}riverpod_lint:\s*(\d+)\.(\d+)\.\d+\s*$/m.exec(read(PUBSPEC));

		expect(declared, "analysis_options.yaml pins riverpod_lint instead of ranging it").not.toBeNull();
		expect(pinned, "pubspec.yaml does not pin riverpod_lint").not.toBeNull();
		expect(declared?.[1]).toBe(pinned?.[1]);
		expect(Number(pinned?.[2])).toBeGreaterThanOrEqual(Number(declared?.[2]));
	});

	const NARRATES_THE_SWITCH = CONTRIBUTOR_GUIDE;

	it("keeps its one exemption honest, so the allowance cannot become a habit", () => {
		const body = read(join(REPO, NARRATES_THE_SWITCH));

		expect(body).toContain("flutter analyze");
		expect(
			body,
			`${NARRATES_THE_SWITCH} is exempt only because it explains the difference; if it stops explaining it, it stops being exempt`,
		).toContain("does not");
	});

	it("runs dart analyze and never flutter analyze, which loads no plugin", () => {
		const scanned = SEARCHED.flatMap((entry) => {
			const path = join(REPO, entry);
			if (!existsSync(path)) return [];
			return statSync(path).isDirectory() ? walk({ dir: path, match: (file) => /\.(ya?ml|md)$/.test(file) }) : [path];
		});
		const offenders = scanned
			.filter((file) => relative(file) !== NARRATES_THE_SWITCH)
			.filter((file) => read(file).includes("flutter analyze"))
			.map((file) => relative(file));

		expect(scanned.length).toBeGreaterThan(0);
		expect(
			offenders,
			"flutter analyze does not load the analysis_server_plugin riverpod_lint installs, so every one of its rules is silently off",
		).toEqual([]);
	});
});

describe("the Cell geometry is written three times and must agree", () => {
	const DART = join(REPO, "app/lib/domain/services/cell_geometry_service.dart");
	const WEB = join(REPO, "web/src/domain/services/svg-geometry.ts");
	const KOTLIN = join(REPO, "app/android/app/src/main/kotlin/com/fbuireu/contribkit/ContribKitWidgetProvider.kt");

	interface NumberAfterParams {
		body: string;
		pattern: RegExp;
	}

	const numberAfter = ({ body, pattern }: NumberAfterParams): number => {
		const found = pattern.exec(body)?.[1];
		expect(found, String(pattern)).toBeDefined();
		return Number(found);
	};

	it("reads all three spellings", () => {
		expect([DART, WEB, KOTLIN].filter((path) => !existsSync(path)).map(relative)).toEqual([]);
	});

	it("rounds a Cell corner by the same ratio everywhere", () => {
		const dart = numberAfter({ body: read(DART), pattern: /static const cornerRadiusRatio = ([\d.]+);/ });

		expect(numberAfter({ body: read(WEB), pattern: /const CORNER_RADIUS_RATIO = ([\d.]+);/ })).toBe(dart);
		expect(
			numberAfter({
				body: read(KOTLIN),
				pattern: /x \+ size, y \+ size, size \* ([\d.]+)f, size \* [\d.]+f, paint/,
			}),
		).toBe(dart);
	});

	it("grows a Dot from the same base radius, against the same reference Cell", () => {
		const body = read(DART);
		const base = numberAfter({ body, pattern: /static const dotBaseRadius = ([\d.]+);/ });
		const reference = numberAfter({ body, pattern: /static const dotReferenceCellSize = ([\d.]+);/ });
		const web = read(WEB);
		const kotlin = read(KOTLIN);

		expect(numberAfter({ body: web, pattern: /const DOT_BASE_RADIUS = ([\d.]+);/ })).toBe(base);
		expect(numberAfter({ body: web, pattern: /const DOT_REFERENCE_CELL_SIZE = ([\d.]+);/ })).toBe(reference);
		expect(numberAfter({ body: kotlin, pattern: /if \(level == 0\) ([\d.]+)f else [\d.]+f \+ level/ })).toBe(base);
		expect(numberAfter({ body: kotlin, pattern: /\(size \/ ([\d.]+)f\)/ })).toBe(reference);
	});

	it("turns a hexagon the same way, through the same number of vertices", () => {
		const dart = read(DART);
		const vertices = numberAfter({ body: dart, pattern: /static const hexVertexCount = (\d+);/ });

		expect(dart).toContain("math.cos((math.pi / 3) * vertex + math.pi / 6)");
		expect(read(WEB)).toContain("(Math.PI / 3) * vertex + Math.PI / 6");
		expect(read(WEB)).toContain(`vertex < ${vertices};`);
		expect(read(KOTLIN)).toContain("(Math.PI / 3) * i + Math.PI / 6");
		expect(read(KOTLIN)).toContain(`0 until ${vertices}`);
	});

	it("halves the Cell for a circle in all three, so no client draws a different one", () => {
		const WEB_SHAPES = join(REPO, "web/src/domain/services/cell-shapes.ts");

		expect(read(DART)).toContain("CircleFigure(radius: cellSize / 2)");
		expect(read(WEB_SHAPES)).toMatch(/r="\$\{size \/ 2\}"/);
		expect(read(KOTLIN)).toContain("canvas.drawCircle(cx, cy, size / 2, paint)");
	});
});

describe("the dark theme is written twice and must agree", () => {
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

describe("every observability block names where it exports", () => {
	interface DestinationsOfParams {
		readonly stage: string;
		readonly signal: string;
	}

	const SITE = join(REPO, "web/wrangler.toml");

	const stages = (): string[] => [...read(SITE).matchAll(/^\[env\.([a-z]+)\.observability\]$/gm)].map((m) => m[1]);

	const destinationsOf = ({ stage, signal }: DestinationsOfParams): string[] => {
		const block = new RegExp(
			`\\[env\\.${stage}\\.observability\\.${signal}\\][^[]*destinations\\s*=\\s*\\[([^\\]]*)\\]`,
		).exec(read(SITE));
		return [...(block?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((match) => match[1]);
	};

	it("configures observability for every stage the file defines", () => {
		expect(stages().sort()).toEqual(["development", "production"]);
	});

	it("gives logs and traces a destination, or they reach the dashboard and nothing else", () => {
		const missing = stages().flatMap((stage) =>
			["logs", "traces"]
				.filter((signal) => destinationsOf({ stage, signal }).length === 0)
				.map((signal) => `${stage}.${signal}`),
		);
		expect(missing).toEqual([]);
	});

	it("redacts the query string in every block, the top level's included, which is where a Username travels", () => {
		const redacting = [...read(SITE).matchAll(/^redact_query_string\s*=\s*true$/gm)];
		expect(redacting.length).toBe(stages().length + 1);
	});

	it("sends each stage somewhere of its own, so preview traffic stays out of the production source", () => {
		const shared = ["logs", "traces"].filter((signal) => {
			const [production, development] = ["production", "development"].map((stage) =>
				destinationsOf({ stage, signal }).join(),
			);
			return production === development;
		});
		expect(shared).toEqual([]);
	});

	it("keeps no tail consumer, and no Worker for one to name", () => {
		expect(read(SITE)).not.toMatch(/tail_consumers/);
		expect(existsSync(join(REPO, "web/workers"))).toBe(false);
	});

	const topLevelDestinationsOf = (signal: string): string[] => {
		const block = new RegExp(`^\\[observability\\.${signal}\\][^[]*destinations\\s*=\\s*\\[([^\\]]*)\\]`, "m").exec(
			read(SITE),
		);
		return [...(block?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((match) => match[1]);
	};

	it("points the top level at production's destinations, so a bare deploy cannot switch production's export off", () => {
		const signals = ["logs", "traces"];

		expect(signals.map((signal) => topLevelDestinationsOf(signal))).toEqual(
			signals.map((signal) => destinationsOf({ stage: "production", signal })),
		);
	});

	it("restates the same observability settings in every block that carries them, destinations aside", () => {
		const blocks = [
			...read(SITE).matchAll(/^\[(?:env\.[a-z]+\.)?observability(?:\.[a-z]+)?\]\n((?:[a-z_]+ = .*\n)+)/gm),
		].map(([, body]) =>
			body
				.split("\n")
				.filter((line) => line && !line.startsWith("destinations"))
				.join("\n"),
		);
		expect(blocks.length).toBe(3 * (stages().length + 1));
		expect(new Set(blocks).size).toBe(3);
	});

	it("declares [placement] once, at the top level, and lets inheritance carry it", () => {
		expect([...read(SITE).matchAll(/^\[placement\]$/gm)].length).toBe(1);
		expect(read(SITE)).not.toMatch(/^\[env\.[a-z]+\.placement\]$/m);
	});
});

describe("the glossary's forbidden names stay out of the code", () => {
	const codeShaped = (term: string): boolean => /^[A-Za-z]+$/.test(term) && /[A-Z]/.test(term.slice(1));

	const forbiddenIdentifiers = (): string[] => [
		...new Set(
			[...read(join(REPO, "GLOSSARY.md")).matchAll(GLOSSARY_AVOID_LINE)]
				.flatMap(([, list]) => list.split(",").map((term) => term.trim()))
				.filter(codeShaped),
		),
	];

	const SDK_SEAMS: readonly string[] = [
		"app/lib/infrastructure/tip/revenuecat_tip_repository.dart",
		"app/lib/infrastructure/tip/store_error.dart",
	];

	const seamTestFor = (seam: string): string =>
		seam.replace(/^app\/lib\//, "app/test/").replace(/\.dart$/, "_test.dart");

	const EXEMPT: readonly string[] = [...SDK_SEAMS, ...SDK_SEAMS.map(seamTestFor)];

	const GUARDED_ROOTS = ["web/src", "web/e2e", "app/lib", "app/test"];

	const sourceFiles = (): string[] =>
		[
			...walk({ dir: join(REPO, "web/src"), match: (path) => WEB_SOURCE_FILE.test(path) }),
			...walk({ dir: join(REPO, "web/e2e"), match: (path) => path.endsWith(".ts") }),
			...walk({ dir: join(REPO, "app/lib"), match: (path) => path.endsWith(".dart") }),
			...walk({ dir: join(REPO, "app/test"), match: (path) => path.endsWith(".dart") }),
		].filter((path) => !EXEMPT.includes(relative(path)));

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

	const COPY_WORDS_POLICED: readonly string[] = [...PLAIN_WORDS_POLICED_IN_IDENTIFIERS, "monitoring"];

	const avoidedTerms = (): Set<string> =>
		new Set(
			[...read(join(REPO, "GLOSSARY.md")).matchAll(GLOSSARY_AVOID_LINE)].flatMap(([, list]) =>
				list.split(",").map((term) => term.trim().toLowerCase()),
			),
		);

	const identifierFiles = (): string[] =>
		[
			...walk({ dir: join(REPO, "web/src"), match: (path) => /\.tsx?$/.test(path) }),
			...walk({ dir: join(REPO, "web/e2e"), match: (path) => path.endsWith(".ts") }),
			...walk({
				dir: join(REPO, "app/lib"),
				match: (path) => path.endsWith(".dart") && !GENERATED_DART_FILE.test(path),
			}),
			...walk({ dir: join(REPO, "app/test"), match: (path) => path.endsWith(".dart") }),
		].filter((path) => !EXEMPT.includes(relative(path)));

	it("polices only words the glossary actually rejects, so the list cannot invent a rule", () => {
		const rejected = avoidedTerms();
		expect(COPY_WORDS_POLICED.filter((word) => !rejected.has(word))).toEqual([]);
	});

	it("exempts only the SDK seams and their own tests, each a file that exists", () => {
		expect(EXEMPT.filter((path) => !existsSync(join(REPO, path)))).toEqual([]);
		expect(SDK_SEAMS.length).toBeLessThanOrEqual(2);
	});

	const policedWordIn = (word: string): RegExp =>
		new RegExp(`(?:(?<![A-Za-z0-9])|(?-i:(?<=[a-z0-9_])(?=[A-Z])))${word}(?-i:(?![a-z0-9]))`, "i");

	it("tells a policed word that begins an identifier part from one inside a longer word", () => {
		const shop = policedWordIn("shop");
		const reported = ["shop", "const shop = 1", "fooShop", "foo1Shop", "foo_shop", "FOO_SHOP", "get-shop"];
		const spared = ["workshopUrl", "bookshop", "photoshopped", "shopping", "shops", "WORKSHOP"];

		expect(reported.filter((body) => !shop.test(body))).toEqual([]);
		expect(spared.filter((body) => shop.test(body))).toEqual([]);
	});

	it("names no identifier after a plain word the glossary rejects", () => {
		const files = identifierFiles();
		const offenders = files.flatMap((file) => {
			const body = withoutStringLiterals(read(file));
			return PLAIN_WORDS_POLICED_IN_IDENTIFIERS.filter((word) => policedWordIn(word).test(body)).map(
				(word) => `${relative(file)} uses ${word}`,
			);
		});

		expect(emptyRoots({ paths: files.map(relative), roots: GUARDED_ROOTS })).toEqual([]);
		expect(offenders).toEqual([]);
	});

	const copyWordIn = (word: string): RegExp => new RegExp(`(?<![A-Za-z0-9])${word}(?:s|es)?(?![A-Za-z0-9])`, "i");

	const BARE_WIDGET = /(?<![A-Za-z0-9-])(?<!home screen )widget(?![A-Za-z0-9-])/i;

	const withoutExpressions = (template: string): string => {
		const stripped = template.replaceAll(/\{[^{}]*\}/g, "");
		return stripped === template ? template : withoutExpressions(stripped);
	};

	const copyOfAstro = (source: string): string[] => {
		const template = withoutExpressions(
			source.replace(/^---\n[\s\S]*?\n---/, "").replaceAll(/<(style|script)\b[\s\S]*?<\/\1>/g, ""),
		);
		const labels = [...template.matchAll(/\b(?:aria-label|title|alt|placeholder|content)="([^"]*)"/g)].map(
			([, value]) => value,
		);
		const text = template
			.replaceAll(/<[^>]*>/g, "\n")
			.split("\n")
			.map((line) => line.trim())
			.filter(Boolean);
		return [...labels, ...text];
	};

	const literalsIn = (source: string): string[] =>
		[...source.matchAll(/(["'`])((?:\\.|(?!\1)[^\\\n])*)\1/g)].map(([, , body]) => body);

	it("reads a page's text and its labels, and none of its code, its styles or its markup", () => {
		const page = [
			"---",
			'const widget = "purchase";',
			"---",
			'<section aria-label="Export" class="widget-layout" id="widget">',
			"  <p>Tips {widgetCount} <b>pay</b></p>",
			"  {items.map((item) => (<i>{item}</i>))}",
			"</section>",
			"<style>.purchase { color: red; }</style>",
			"<script>const monitoring = 1;</script>",
		].join("\n");

		expect(copyOfAstro(page)).toEqual(["Export", "Tips", "pay"]);
		expect(literalsIn("const a = \"Tips pay\"; const b = 'it\\'s'; const c = `monitoring`;")).toEqual([
			"Tips pay",
			"it\\'s",
			"monitoring",
		]);
	});

	it("tells a policed word in copy from one inside a longer word, and a bare widget from a qualified one", () => {
		const purchase = copyWordIn("purchase");

		expect(
			["purchase", "In-app purchases", "Purchase history", "a purchase."].filter((text) => !purchase.test(text)),
		).toEqual([]);
		expect(["repurchased", "purchased", "purchasers"].filter((text) => purchase.test(text))).toEqual([]);
		expect(["Pin the widget", "widget", "A widget."].filter((text) => !BARE_WIDGET.test(text))).toEqual([]);
		expect(
			["Home screen widget", "the home screen widget", "widget-layout", "HomeScreenWidget"].filter((text) =>
				BARE_WIDGET.test(text),
			),
		).toEqual([]);
	});

	it("names nothing in the web's copy after a plain word the glossary rejects, or calls the Home Screen Widget a widget", () => {
		const pages = walk({ dir: join(REPO, "web/src"), match: (path) => path.endsWith(".astro") });
		const scripts = walk({
			dir: join(REPO, "web/src"),
			match: (path) => /\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path) && !path.endsWith(".d.ts"),
		});
		const copy = [
			...pages.flatMap((file) => copyOfAstro(read(file)).map((text) => ({ file, text, isPage: true }))),
			...scripts.flatMap((file) => literalsIn(read(file)).map((text) => ({ file, text, isPage: false }))),
		];
		const offenders = copy.flatMap(({ file, text, isPage }) => [
			...COPY_WORDS_POLICED.filter((word) => copyWordIn(word).test(text)).map(
				(word) => `${relative(file)} says ${word}: ${text.slice(0, 60)}`,
			),
			...(isPage && BARE_WIDGET.test(text) ? [`${relative(file)} says widget bare: ${text.slice(0, 60)}`] : []),
		]);

		expect(emptyRoots({ paths: [...pages, ...scripts].map(relative), roots: ["web/src"] })).toEqual([]);
		expect(pages.length).toBeGreaterThan(0);
		expect(copy.length).toBeGreaterThan(0);
		expect(offenders).toEqual([]);
	});

	it("names nothing in the source or its tests after a code-shaped word the glossary rejects", () => {
		const forbidden = forbiddenIdentifiers();
		const files = sourceFiles();
		const offenders = files.flatMap((file) => {
			const body = read(file);
			return forbidden
				.filter((term) => identifierNamed(term).test(body))
				.map((term) => `${relative(file)} uses ${term}`);
		});

		expect(emptyRoots({ paths: files.map(relative), roots: GUARDED_ROOTS })).toEqual([]);
		expect(offenders).toEqual([]);
	});
});

describe("the guides and the standards name real files", () => {
	const nestedGuides = (): string[] => [
		...walk({ dir: join(REPO, "web/src"), match: (path) => path.endsWith("AGENTS.md") }),
		...walk({ dir: join(REPO, "app/lib"), match: (path) => path.endsWith("AGENTS.md") }),
	];

	const ROOT_GUIDES = ["AGENTS.md", CODING_STANDARDS].map((path) => join(REPO, path));

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
				...walk({ dir: join(REPO, "app/lib"), match: () => true }),
				...walk({ dir: join(REPO, "app/test"), match: () => true }),
				...walk({ dir: join(REPO, "app/tool"), match: () => true }),
				...readdirSync(join(REPO, "web")).filter((name) => statSync(join(REPO, "web", name)).isFile()),
				...readdirSync(REPO).filter((name) => statSync(join(REPO, name)).isFile()),
			].map((path) => path.split(PATH_SEPARATOR).at(-1) ?? path),
		);

	it("every bare filename a guide or the standards cite still exists somewhere in the source", () => {
		const names = sourceFilenames();
		const guides = [...ROOT_GUIDES, ...nestedGuides()];
		const cited = guides.flatMap((guidePath) => citedFilenames(read(guidePath)).map((name) => ({ guidePath, name })));
		const missing = cited
			.filter(({ name }) => !names.has(name))
			.map(({ guidePath, name }) => `${relative(guidePath)} cites ${name}`);

		expect(emptyRoots({ paths: guides.map(relative), roots: ["web/src", "app/lib"] })).toEqual([]);
		expect(ROOT_GUIDES.filter((path) => !existsSync(path)).map(relative)).toEqual([]);
		expect(cited.length).toBeGreaterThan(0);
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
		const files = [
			...walk({ dir: join(REPO, "app/lib"), match: (path) => path.endsWith(".dart") }),
			...walk({ dir: join(REPO, "app/test"), match: (path) => path.endsWith(".dart") }),
			...walk({ dir: join(REPO, "app/tool"), match: (path) => path.endsWith(".dart") }),
		].filter((path) => !GENERATED_DART_FILE.test(path));

		expect(emptyRoots({ paths: files.map(relative), roots: ["app/lib", "app/test", "app/tool"] })).toEqual([]);
		expect(files.flatMap(commentLines)).toEqual([]);
	});

	it("has no // or /* comment in the hand-written Kotlin either", () => {
		const files = walk({
			dir: join(REPO, "app/android/app/src/main/kotlin"),
			match: (path) => path.endsWith(".kt"),
		});

		expect(files.length).toBeGreaterThan(0);
		expect(files.flatMap(commentLines)).toEqual([]);
	});

	it("has no // or /* comment in web TypeScript or Astro either", () => {
		const configs = ["web/astro.config.ts", "web/playwright.config.ts", "web/vitest.config.ts"].map((path) =>
			join(REPO, path),
		);
		const files = [
			...walk({ dir: join(REPO, "web/src"), match: (path) => WEB_SOURCE_FILE.test(path) }),
			...walk({ dir: join(REPO, "web/e2e"), match: (path) => path.endsWith(".ts") }),
			...walk({ dir: join(REPO, "docs"), match: (path) => path.endsWith(".ts") }),
		];

		expect(emptyRoots({ paths: files.map(relative), roots: ["web/src", "web/e2e", "docs"] })).toEqual([]);
		expect([...files, ...configs].flatMap(commentLines)).toEqual([]);
	});

	it("has no // or /* comment in the repository scripts either", () => {
		const files = walk({ dir: join(REPO, "scripts"), match: (path) => path.endsWith(".mjs") });

		expect(files.length).toBeGreaterThan(0);
		expect(files.flatMap(commentLines)).toEqual([]);
	});

	it("has no <!-- comment in the markup of an .astro file", () => {
		const files = walk({ dir: join(REPO, "web/src"), match: (path) => path.endsWith(".astro") });

		expect(files.length).toBeGreaterThan(0);
		expect(linesMatching({ files, pattern: /<!--/ })).toEqual([]);
	});

	it("has no /* comment in the CSS under web/src", () => {
		const files = walk({ dir: join(REPO, "web/src"), match: (path) => path.endsWith(".css") });

		expect(files.length).toBeGreaterThan(0);
		expect(linesMatching({ files, pattern: BLOCK_COMMENT_OPENER })).toEqual([]);
	});
});

describe("nothing under web/src/pages becomes a route by accident", () => {
	const ignoredByAstro = (path: string): boolean =>
		relative(path)
			.split("/")
			.some((part) => part.startsWith("_"));

	it("colocates no test file inside the route namespace", () => {
		const tests = walk({ dir: join(REPO, "web/src/pages"), match: (path) => COLOCATED_TEST_FILE.test(path) });
		const offenders = tests.filter((path) => !ignoredByAstro(path)).map(relative);

		expect(tests.length).toBeGreaterThan(0);
		expect(offenders).toEqual([]);
	});

	it("carries no markdown route other than the agent guide the middleware blocks", () => {
		const markdown = walk({ dir: join(REPO, "web/src/pages"), match: (path) => path.endsWith(".md") })
			.filter((path) => !ignoredByAstro(path))
			.map(relative);
		expect(markdown).toEqual(["web/src/pages/AGENTS.md"]);
		expect(read(join(REPO, "web/src/middleware.ts"))).toContain('const AGENT_GUIDE_ROUTE = "/AGENTS"');
	});
});

describe("the app's feature widgets go through the wrappers", () => {
	it("keeps every shadcn_ui import inside widgets/, theme/ and the composition root", () => {
		const allowed = ["app/lib/main.dart", "app/lib/ui/theme/app_colors.dart"];
		const importers = walk({ dir: join(REPO, "app/lib"), match: (path) => path.endsWith(".dart") })
			.filter((path) => !GENERATED_DART_FILE.test(path))
			.filter((path) => read(path).includes("package:shadcn_ui/shadcn_ui.dart"))
			.map(relative);
		const offenders = importers
			.filter((path) => !path.startsWith("app/lib/ui/widgets/"))
			.filter((path) => !allowed.includes(path));

		expect(importers.length).toBeGreaterThan(0);
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
		ui: ["@infrastructure/", "@application/"],
	};

	const LAYERS = ["domain", "application", "infrastructure", "ui", "pages"];

	interface LayerImport {
		readonly path: string;
		readonly specifier: string;
	}

	const importsIn = (layer: string): LayerImport[] =>
		walk({ dir: join(REPO, "web/src", layer), match: (path) => WEB_SOURCE_FILE.test(path) }).flatMap((path) =>
			importsOf(read(path)).map((specifier) => ({ path, specifier })),
		);

	const landingOf = ({ path, specifier }: LayerImport): string => relative(resolve(dirname(path), specifier));

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

			const imports = walk({
				dir: join(REPO, "web/src", layer),
				match: (path) => WEB_SOURCE_FILE.test(path),
			}).flatMap((path) => importsOf(read(path)).map((specifier) => ({ path, specifier })));
			const offenders = imports
				.filter(({ path, specifier }) => reaches({ file: path, specifier }))
				.map(({ path, specifier }) => `${relative(path)} imports ${specifier}`)
				.sort();

			expect(imports.length).toBeGreaterThan(0);
			expect(offenders).toEqual([]);
		});
	}

	it("lets domain import only itself and @shared", () => {
		const imports = importsIn("domain").filter(({ path }) => !COLOCATED_TEST_FILE.test(path));
		const offenders = imports
			.filter((entry) =>
				entry.specifier.startsWith(".")
					? !landingOf(entry).startsWith("web/src/domain/")
					: !entry.specifier.startsWith("@domain/") && !entry.specifier.startsWith("@shared/"),
			)
			.map(({ path, specifier }) => `${relative(path)} imports ${specifier}`);

		expect(imports.length).toBeGreaterThan(0);
		expect(offenders).toEqual([]);
	});

	it("writes an import that leaves its layer with the alias, one that stays inside it relative, and none out of web/src", () => {
		const MOCKED_MODULE = /\bvi\.(?:mock|doMock|unmock|importActual|importMock)\(\s*["']([^"']+)["']/g;
		const ALIASED_LAYERS: Record<string, string> = {
			"@domain/": "domain",
			"@application/": "application",
			"@infrastructure/": "infrastructure",
			"@ui/": "ui",
		};
		const imports = LAYERS.flatMap((layer) =>
			walk({ dir: join(REPO, "web/src", layer), match: (path) => WEB_SOURCE_FILE.test(path) }).flatMap((path) => {
				const source = read(path);
				return [...importsOf(source), ...[...source.matchAll(MOCKED_MODULE)].map(([, specifier]) => specifier)].map(
					(specifier) => ({ path, specifier, layer }),
				);
			}),
		);
		const isRelative = ({ specifier }: LayerImport): boolean => specifier.startsWith(".");
		const aliasedLayerOf = ({ specifier }: LayerImport): string | undefined =>
			Object.entries(ALIASED_LAYERS).find(([alias]) => specifier.startsWith(alias))?.[1];
		const crossingRelative = imports.filter((entry) => {
			const landed = landingOf(entry);
			return isRelative(entry) && landed.startsWith("web/src/") && !landed.startsWith(`web/src/${entry.layer}/`);
		});
		const leavingSource = imports.filter((entry) => isRelative(entry) && !landingOf(entry).startsWith("web/src/"));
		const stayingAliased = imports.filter((entry) => aliasedLayerOf(entry) === entry.layer);
		const offenders = [
			...crossingRelative.map(({ path, specifier }) => `${relative(path)} crosses its layer by ${specifier}`),
			...leavingSource.map(({ path, specifier }) => `${relative(path)} leaves web/src by ${specifier}`),
			...stayingAliased.map(({ path, specifier }) => `${relative(path)} stays in its layer by ${specifier}`),
		];

		expect(imports.filter(isRelative).length).toBeGreaterThan(0);
		expect(imports.filter((entry) => aliasedLayerOf(entry) !== undefined).length).toBeGreaterThan(0);
		expect(offenders).toEqual([]);
	});
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
			const imports = dartFiles(layer).flatMap((path) =>
				layerImportsOf(read(path)).map((specifier) => ({ path, specifier })),
			);
			const offenders = imports
				.filter(({ specifier }) => forbidden.some((prefix) => specifier.startsWith(prefix)))
				.map(({ path, specifier }) => `${relative(path)} imports ${specifier}`)
				.sort();

			expect(imports.length).toBeGreaterThan(0);
			expect(offenders).toEqual([]);
		});
	}

	it("keeps the pure core free of Flutter, Riverpod and the platform", () => {
		const BANNED = ["package:flutter", "package:riverpod", "dart:ui", "dart:io", "package:hive", "package:http"];
		const files = ["domain", "application"].flatMap(dartFiles);
		const offenders = files
			.flatMap((path) => {
				const body = read(path);
				return BANNED.filter((banned) => body.includes(`import '${banned}`) || body.includes(`export '${banned}`)).map(
					(banned) => `${relative(path)} imports ${banned}`,
				);
			})
			.sort();

		expect(emptyRoots({ paths: files.map(relative), roots: ["app/lib/domain", "app/lib/application"] })).toEqual([]);
		expect(offenders, "app/lib/domain/AGENTS.md promises zero external dependencies").toEqual([]);
	});

	const DART_DIRECTIVE = /^\s*(?:import|export|part)\s+'([^']+)'/gm;

	it("lets domain import only dart:math and itself", () => {
		const directives = dartFiles("domain").flatMap((path) =>
			[...read(path).matchAll(DART_DIRECTIVE)].map(([, uri]) => ({ path, uri })),
		);
		const offenders = directives
			.filter(({ uri }) => uri !== "dart:math" && !uri.startsWith("package:contribkit/domain/"))
			.map(({ path, uri }) => `${relative(path)} imports ${uri}`);

		expect(directives.length).toBeGreaterThan(0);
		expect(offenders).toEqual([]);
	});

	it("reaches infrastructure/ from ui/ only through ui/di/", () => {
		const files = dartFiles("ui").filter((path) => !relative(path).startsWith("app/lib/ui/di/"));
		const offenders = files
			.filter((path) => layerImportsOf(read(path)).some((specifier) => specifier.startsWith("infrastructure/")))
			.map(relative);

		expect(files.length).toBeGreaterThan(0);
		expect(offenders).toEqual([]);
	});
});

describe("the app's code keeps the shapes the standards hold it to", () => {
	const dartIn = (dir: string): string[] =>
		walk({
			dir: join(REPO, "app/lib", dir),
			match: (path) => path.endsWith(".dart") && !GENERATED_DART_FILE.test(path),
		});

	const CLASS_DECLARATION =
		/^[ \t]*(?:@\w+(?:\([^)\n]*\))?\s+)*((?:(?:abstract|sealed|final|base|interface|mixin)\s+)*)class\s+(\w+)/gm;
	const WHITESPACE_RUN = /\s+/g;
	const ALLOWED_CLASS_MODIFIERS = new Set(["final", "sealed", "abstract final", "abstract interface"]);

	const classesIn = (files: readonly string[]): { path: string; name: string; modifiers: string }[] =>
		files.flatMap((path) =>
			[...withoutStringLiterals(read(path)).matchAll(CLASS_DECLARATION)].map(([, modifiers, name]) => ({
				path,
				name,
				modifiers: modifiers.trim().replaceAll(WHITESPACE_RUN, " "),
			})),
		);

	it("declares every class outside ui/ final, sealed, abstract final or abstract interface", () => {
		const classes = classesIn(["domain", "application", "infrastructure"].flatMap(dartIn));
		const offenders = classes
			.filter(({ modifiers }) => !ALLOWED_CLASS_MODIFIERS.has(modifiers))
			.map(({ path, name, modifiers }) => `${relative(path)}: ${modifiers} class ${name}`);

		expect(classes.length).toBeGreaterThan(0);
		expect(offenders).toEqual([]);
	});

	it("declares every repository an abstract interface class", () => {
		const classes = classesIn(dartIn("domain/repositories")).filter(({ name }) => name.endsWith("Repository"));
		const offenders = classes
			.filter(({ modifiers }) => modifiers !== "abstract interface")
			.map(({ path, name }) => `${relative(path)}: ${name}`);

		expect(classes.length).toBeGreaterThan(0);
		expect(offenders).toEqual([]);
	});

	it("gives every use case its repository as {required this._repository}, and lets it catch nothing", () => {
		const USE_CASE_CONSTRUCTOR = /\bconst\s+\w+\(\{\s*required\s+this\._repository\s*,?\s*\}\);/;
		const CATCHING = /\btry\s*\{|\.catchError\(/;
		const files = dartIn("application/use_cases");
		const offenders = files.flatMap((path) => {
			const body = withoutStringLiterals(read(path));
			return [
				...(USE_CASE_CONSTRUCTOR.test(body) ? [] : [`${relative(path)} takes its repository another way`]),
				...(CATCHING.test(body) ? [`${relative(path)} catches`] : []),
			];
		});

		expect(files.length).toBeGreaterThan(0);
		expect(offenders).toEqual([]);
	});

	it("matches no Failure with a wildcard or a default arm", () => {
		const SWITCH = /\bswitch\s*\(/g;
		const FAILURE_PATTERN = /\b[A-Z]\w*Failure\s*\(/;
		const WILDCARD_ARM = /(?<![\w)])_\s*(?:=>|:)|\bdefault\s*:/;
		const switches = dartIn("").flatMap((path) => {
			const source = withoutStringLiterals(read(path));
			return [...source.matchAll(SWITCH)].map((match) => ({
				path,
				body: bracedBodyFrom({ source, open: source.indexOf("{", match.index) }),
			}));
		});
		const overFailures = switches.filter(({ body }) => FAILURE_PATTERN.test(body));
		const offenders = overFailures.filter(({ body }) => WILDCARD_ARM.test(body)).map(({ path }) => relative(path));

		expect(overFailures.length).toBeGreaterThan(0);
		expect(offenders).toEqual([]);
	});

	it("writes dynamic only in infrastructure/", () => {
		const files = dartIn("").filter((path) => !relative(path).startsWith("app/lib/infrastructure/"));

		expect(files.length).toBeGreaterThan(0);
		expect(linesMatching({ files, pattern: /\bdynamic\b/ })).toEqual([]);
	});

	it("gives every firstWhere an orElse", () => {
		const FIRST_WHERE = /\.firstWhere\(/g;
		const calls = dartIn("").flatMap((path) => {
			const source = withoutStringLiterals(read(path));
			return [...source.matchAll(FIRST_WHERE)].map((match) => {
				const open = match.index + match[0].length - 1;
				const parenthesised = `{${source.slice(open + 1)}`.replaceAll("(", "{").replaceAll(")", "}");
				return { path, argumentList: bracedBodyFrom({ source: parenthesised, open: 0 }) };
			});
		});
		const offenders = calls
			.filter(({ argumentList }) => !argumentList.includes("orElse:"))
			.map(({ path }) => relative(path));

		expect(calls.length).toBeGreaterThan(0);
		expect(offenders).toEqual([]);
	});

	it("reads no clock in the domain, which takes today from its caller", () => {
		const files = dartIn("domain");

		expect(DART_CLOCK_READ.test("static Year get current => Year(DateTime.now().year);")).toBe(true);
		expect(DART_CLOCK_READ.test("factory Year.current({required DateTime today})")).toBe(false);
		expect(files.length).toBeGreaterThan(0);
		expect(linesMatching({ files, pattern: DART_CLOCK_READ })).toEqual([]);
	});

	it("steps no date by a Duration of days, builds no MaterialApp", () => {
		const files = dartIn("");

		expect(files.length).toBeGreaterThan(0);
		expect(linesMatching({ files, pattern: /\bDuration\(\s*days\s*:|\bMaterialApp\b/ })).toEqual([]);
	});

	it("builds no calendar day with a local DateTime anywhere in app/lib, and parses none into one", () => {
		const LOCAL_DAY = /\bDateTime\s*\(|\bDateTime\.(?:parse|tryParse)\s*\(/;
		const INSTANT_READS = [
			"DateTime.parse(raw[''] as String)",
			"DateTime(year.value + 1)",
			"DateTime.tryParse(trimmed)",
		];
		const localDayLines = (source: string): number[] =>
			source
				.split("\n")
				.map((line, index) => ({
					index,
					rest: INSTANT_READS.reduce((left, instant) => left.replace(instant, ""), line),
				}))
				.filter(({ rest }) => LOCAL_DAY.test(rest))
				.map(({ index }) => index + 1);

		const files = ["domain", "infrastructure", "application", "ui"].flatMap(dartIn);
		const sources = files.map((path) => ({ path, code: withoutStringLiterals(read(path)) }));
		const offenders = sources.flatMap(({ path, code }) =>
			localDayLines(code).map((line) => `${relative(path)}:${line}`),
		);
		const occurrences = (instant: string): number =>
			sources.reduce((total, { code }) => total + code.split(instant).length - 1, 0);
		const strayInstantReads = INSTANT_READS.filter((instant) => occurrences(instant) !== 1).map(
			(instant) => `${instant} is one of the three instants this rule lets through, and is not found exactly once`,
		);

		expect(localDayLines("final day = DateTime(2024, 3, 31);")).toEqual([1]);
		expect(localDayLines("final start = DateTime(year, 1, 1 - leadingDaysFor(year));")).toEqual([1]);
		expect(localDayLines("final first = DateTime(year);")).toEqual([1]);
		expect(localDayLines("date: DateTime.parse(dayDto.date),")).toEqual([1]);
		expect(localDayLines("final date = DateTime.tryParse(match);")).toEqual([1]);
		expect(
			localDayLines("final stamp = DateTime.parse(raw[''] as String);\nfinal day = DateTime(2024, 1, 1);"),
		).toEqual([2]);
		expect(localDayLines("cachedAt.isAfter(DateTime(year.value + 1)) || DateTime(2024, 1, 1) == cachedAt")).toEqual([
			1,
		]);
		expect(localDayLines("final day = DateTime.utc(2024, 3, 31);")).toEqual([]);
		expect(localDayLines("static DateTime of(DateTime instant) =>")).toEqual([]);
		expect(localDayLines("final DateTime Function() _now;\nrequired DateTime today,")).toEqual([]);
		expect(localDayLines("date: CalendarDate.parse(dayDto.date),\nfinal date = CalendarDate.tryParse(text);")).toEqual(
			[],
		);
		expect(localDayLines("final stamp = DateTime.parse(raw[''] as String);")).toEqual([]);
		expect(localDayLines("cachedAt.isAfter(DateTime(year.value + 1));")).toEqual([]);
		expect(localDayLines("return DateTime.tryParse(trimmed);")).toEqual([]);
		expect(
			emptyRoots({
				paths: files.map(relative),
				roots: ["app/lib/domain", "app/lib/infrastructure", "app/lib/application", "app/lib/ui"],
			}),
		).toEqual([]);
		expect([...offenders, ...strayInstantReads]).toEqual([]);
	});

	it("takes no colour or Duration literal and reads no colorScheme in ui/ outside theme/", () => {
		const files = dartIn("ui").filter((path) => !relative(path).startsWith("app/lib/ui/theme/"));
		const LITERAL_OR_SCHEME =
			/\bColor\(\s*0x|\bColor\.from(?:ARGB|RGBO)\(|(?<![\w$])Colors\.|\bDuration\(|\.colorScheme\b/;

		expect(files.length).toBeGreaterThan(0);
		expect(linesMatching({ files, pattern: LITERAL_OR_SCHEME })).toEqual([]);
	});
});

describe("the web's code keeps the shapes the standards hold it to", () => {
	const webFiles = (): string[] => walk({ dir: join(REPO, "web/src"), match: (path) => WEB_SOURCE_FILE.test(path) });
	const productionFiles = (): string[] => webFiles().filter((path) => !COLOCATED_TEST_FILE.test(path));
	const outside = (prefixes: readonly string[]): string[] =>
		productionFiles().filter((path) => !prefixes.some((prefix) => relative(path).startsWith(prefix)));

	const TOP_LEVEL_STATEMENT = /\n(?=[A-Za-z])/;
	const SCHEMA_DECLARATION = /^(?:export\s+)?const\s+(\w+)\s*=\s*z\b/;

	interface SchemaDeclaration {
		readonly name: string;
		readonly statement: string;
	}

	const schemasIn = (path: string): SchemaDeclaration[] =>
		read(path)
			.split(TOP_LEVEL_STATEMENT)
			.flatMap((statement) => {
				const name = SCHEMA_DECLARATION.exec(statement)?.[1];
				return name ? [{ name, statement }] : [];
			});

	it("declares no class, draws no Math.random and slices no ISO string for a date", () => {
		const files = webFiles();
		const FORBIDDEN =
			/^\s*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+[A-Za-z_$]|\bMath\.random\b|\.toISOString\(\)\s*\.slice\(\s*0\s*,\s*10\s*\)/;

		expect(files.length).toBeGreaterThan(0);
		expect(linesMatching({ files, pattern: FORBIDDEN })).toEqual([]);
	});

	it("reads no clock in the domain, which takes today or this year from its caller", () => {
		const CLOCK_READ = /\bnew Date\(\s*\)|\bDate\.now\(\s*\)/;
		const files = productionFiles().filter((path) => relative(path).startsWith("web/src/domain/"));

		expect(CLOCK_READ.test("const current = new Date().getFullYear();")).toBe(true);
		expect(CLOCK_READ.test('new Date("2024-03-15T12:00:00")')).toBe(false);
		expect(files.length).toBeGreaterThan(0);
		expect(linesMatching({ files, pattern: CLOCK_READ })).toEqual([]);
	});

	it("registers no custom property with @property, so an unset token falls back and a theme switch flips it rather than fading", () => {
		const REGISTERED_PROPERTY = /@property\s+--[\w-]+/;
		const files = walk({
			dir: join(REPO, "web/src"),
			match: (path) => path.endsWith(".css") || path.endsWith(".astro"),
		});

		expect(REGISTERED_PROPERTY.test('@property --surface { syntax: "<color>"; inherits: true; }')).toBe(true);
		expect(REGISTERED_PROPERTY.test("--surface: #f6f8fa;")).toBe(false);
		expect(files.filter((path) => path.endsWith(".css")).length).toBeGreaterThan(0);
		expect(linesMatching({ files, pattern: REGISTERED_PROPERTY })).toEqual([]);
	});

	it("reads FailureKind outside tests only in domain/failures/, failure-http.ts and contribution-errors.ts", () => {
		const files = outside([
			"web/src/domain/failures/",
			"web/src/application/http/failure-http.ts",
			"web/src/ui/utils/contribution-errors.ts",
		]);

		expect(files.length).toBeGreaterThan(0);
		expect(linesMatching({ files, pattern: /\bFailureKind\b/ })).toEqual([]);
	});

	it("never drives a module-level /g regex through exec or test", () => {
		const MODULE_LEVEL_GLOBAL_REGEX =
			/^(?:export\s+)?const\s+(\w+)(?:\s*:\s*RegExp)?\s*=\s*\/(?:\\.|[^/\n])+\/[a-z]*g[a-z]*\s*;?\s*$/gm;
		const regexes = webFiles().flatMap((path) =>
			[...read(path).matchAll(MODULE_LEVEL_GLOBAL_REGEX)].map(([, name]) => ({ path, name })),
		);
		const offenders = regexes
			.filter(({ path, name }) => new RegExp(`\\b${name}\\.(?:exec|test)\\(`).test(read(path)))
			.map(({ path, name }) => `${relative(path)}: ${name}`);

		expect(regexes.length).toBeGreaterThan(0);
		expect(offenders).toEqual([]);
	});

	it("reads astro:env nowhere in infrastructure/, and React only in infrastructure/email/", () => {
		const infrastructure = productionFiles().filter((path) => relative(path).startsWith("web/src/infrastructure/"));
		const readingEnv = infrastructure
			.filter((path) => importsOf(read(path)).some((specifier) => specifier.startsWith("astro:env")))
			.map(relative);
		const reactFiles = webFiles().filter(
			(path) =>
				path.endsWith(".tsx") ||
				importsOf(read(path)).some((specifier) => specifier === "react" || specifier === "react-email"),
		);
		const strayReact = reactFiles.map(relative).filter((path) => !path.startsWith("web/src/infrastructure/email/"));

		expect(infrastructure.length).toBeGreaterThan(0);
		expect(reactFiles.length).toBeGreaterThan(0);
		expect(readingEnv).toEqual([]);
		expect(strayReact).toEqual([]);
	});

	it("writes a log line and compares the server-error threshold only in failure-log.ts", () => {
		const files = outside(["web/src/application/http/failure-log.ts", "web/src/infrastructure/logging/"]);
		const LOGGING_OR_THRESHOLD =
			/\blogger\.(?:info|warn|error|logError)\(|[<>]=?\s*SERVER_ERROR_STATUS\b|\bSERVER_ERROR_STATUS\s*[<>]|\bstatus\s*[<>]=?\s*5\d\d\b/;

		expect(files.length).toBeGreaterThan(0);
		expect(linesMatching({ files, pattern: LOGGING_OR_THRESHOLD })).toEqual([]);
	});

	it("renders every .ts route on request and every page through BaseLayout", () => {
		const routes = productionFiles().filter(
			(path) =>
				relative(path).startsWith("web/src/pages/") &&
				!relative(path)
					.split("/")
					.some((part) => part.startsWith("_")),
		);
		const endpoints = routes.filter((path) => path.endsWith(".ts"));
		const pages = routes.filter((path) => path.endsWith(".astro"));
		const offenders = [
			...endpoints.filter((path) => !/^export const prerender = false;$/m.test(read(path))),
			...pages.filter(
				(path) =>
					!/^import BaseLayout from "@ui\/components\/core\/layouts\/BaseLayout\.astro";$/m.test(read(path)) ||
					!/<BaseLayout\b/.test(read(path)),
			),
		].map(relative);

		expect(endpoints.length).toBeGreaterThan(0);
		expect(pages.length).toBeGreaterThan(0);
		expect(offenders).toEqual([]);
	});

	it("wraps every .ts route's handler in the boundary that logs and answers SERVER_ERROR_MESSAGE", () => {
		const endpoints = productionFiles().filter(
			(path) =>
				path.endsWith(".ts") &&
				relative(path).startsWith("web/src/pages/") &&
				!relative(path)
					.split("/")
					.some((part) => part.startsWith("_")),
		);
		const unguarded = endpoints
			.filter((path) => {
				const source = read(path);
				return !(
					/\btry\s*\{/.test(source) &&
					/\blogServerError\(/.test(source) &&
					/\bSERVER_ERROR_MESSAGE\b/.test(source)
				);
			})
			.map(relative);

		expect(endpoints.length).toBeGreaterThan(1);
		expect(unguarded).toEqual([]);
	});

	it("imports Zod only through astro/zod, and declares no zod of its own", () => {
		const files = [...webFiles(), ...walk({ dir: join(REPO, "web/e2e"), match: (path) => path.endsWith(".ts") })];
		const imports = files.flatMap((path) => importsOf(read(path)).map((specifier) => ({ path, specifier })));
		const throughAstro = imports.filter(({ specifier }) => specifier === "astro/zod");
		const direct = imports
			.filter(({ specifier }) => specifier === "zod" || specifier.startsWith("zod/"))
			.map(({ path, specifier }) => `${relative(path)} imports ${specifier}`);
		const manifest = json<Record<string, Record<string, string> | undefined>>("web/package.json");
		const declaring = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"].filter(
			(field) => manifest[field]?.zod !== undefined,
		);

		expect(throughAstro.length).toBeGreaterThan(0);
		expect(direct).toEqual([]);
		expect(declaring).toEqual([]);
	});

	it("reads every JSON body into unknown or straight into a schema, and declares the injected grid unknown", () => {
		const JSON_BODY = /\.json\(\)/;
		const CHECKED_BODY =
			/:\s*unknown\s*=\s*await\s+[\w.]+\.json\(\)|\.(?:parse|safeParse|validate)\(\s*await\s+[\w.]+\.json\(\)/;
		const bodies = productionFiles().flatMap((path) =>
			read(path)
				.split("\n")
				.map((line, index) => ({ at: `${relative(path)}:${index + 1}`, line }))
				.filter(({ line }) => JSON_BODY.test(line)),
		);
		const unchecked = bodies.filter(({ line }) => !CHECKED_BODY.test(line)).map(({ at }) => at);

		expect(bodies.length).toBeGreaterThan(0);
		expect(unchecked).toEqual([]);
		expect(read(join(REPO, "web/src/env.d.ts"))).toMatch(/^\s*__INITIAL_DAYS__\?: unknown;$/m);
	});

	it("names every module-level schema <concept>Schema, after what it checks", () => {
		const SCHEMA_NAME = /^[a-z][A-Za-z]*Schema$/;
		const schemas = productionFiles().flatMap((path) => schemasIn(path).map(({ name }) => ({ path, name })));
		const misnamed = schemas
			.filter(({ name }) => !SCHEMA_NAME.test(name))
			.map(({ path, name }) => `${relative(path)}: ${name}`);

		expect(schemas.length).toBeGreaterThan(0);
		expect(misnamed).toEqual([]);
	});

	it("validates no schema that catches, defaults, transforms or coerces, since validate hands back its input untouched", () => {
		const TRANSFORMS =
			/\.(?:catch|default|prefault|transform|overwrite|trim|toLowerCase|toUpperCase|normalize)\(|\bz\.(?:coerce|preprocess|codec)\b/;
		const VALIDATE_CALL = /\b(\w+)\.validate\(/g;
		const NAMED_IMPORT = /import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*["']([^"']+)["']/g;
		const IMPORT_RENAME = /\s+as\s+/;
		const ALIASES: Record<string, string> = {
			"@domain/": "web/src/domain/",
			"@application/": "web/src/application/",
			"@infrastructure/": "web/src/infrastructure/",
			"@ui/": "web/src/ui/",
		};

		const localName = (entry: string): string => entry.trim().split(IMPORT_RENAME).pop() ?? "";

		const transformingIn = (path: string): Set<string> => {
			const schemas = schemasIn(path);
			const transforming = new Set<string>();
			let grew = true;
			while (grew) {
				const next = schemas.filter(
					({ name, statement }) =>
						!transforming.has(name) &&
						(TRANSFORMS.test(statement) || [...transforming].some((other) => identifierNamed(other).test(statement))),
				);
				for (const { name } of next) transforming.add(name);
				grew = next.length > 0;
			}
			return transforming;
		};

		interface ModuleOfParams {
			readonly from: string;
			readonly specifier: string;
		}

		const moduleOf = ({ from, specifier }: ModuleOfParams): string | null => {
			const alias = Object.keys(ALIASES).find((prefix) => specifier.startsWith(prefix));
			const base = alias
				? join(REPO, ALIASES[alias], specifier.slice(alias.length))
				: specifier.startsWith(".")
					? resolve(dirname(from), specifier)
					: null;
			return base && existsSync(`${base}.ts`) ? `${base}.ts` : null;
		};

		const files = productionFiles();
		const calls = files.flatMap((path) => {
			const source = read(path);
			const importedFrom = new Map(
				[...source.matchAll(NAMED_IMPORT)].flatMap(([, names, specifier]) =>
					names.split(",").map((entry) => [localName(entry), specifier] as const),
				),
			);
			return [...source.matchAll(VALIDATE_CALL)].map(([, name]) => {
				const specifier = importedFrom.get(name);
				const home = specifier ? moduleOf({ from: path, specifier }) : path;
				return { at: `${relative(path)}: ${name}.validate`, name, home };
			});
		});
		const offenders = calls
			.filter(({ name, home }) => home !== null && transformingIn(home).has(name))
			.map(({ at }) => at);

		expect(calls.length).toBeGreaterThan(0);
		expect(files.filter((path) => transformingIn(path).size > 0).length).toBeGreaterThan(0);
		expect(offenders).toEqual([]);
	});

	it("gives every fetch of the Worker and the browser the shared timeout, so no request waits for ever", () => {
		const FETCH_CALL = /\bfetch\(/;
		const TIMEOUT = "AbortSignal.timeout(REQUEST_TIMEOUT_MS)";
		const fetching = productionFiles().filter((path) => FETCH_CALL.test(withoutStringLiterals(read(path))));
		const untimed = fetching.filter((path) => !read(path).includes(TIMEOUT)).map(relative);

		expect(FETCH_CALL.test("await fetch(url)")).toBe(true);
		expect(fetching.length).toBeGreaterThan(2);
		expect(untimed).toEqual([]);
	});

	it("spells a robots directive only through RobotsDirective, which the type alone would let a bare string satisfy", () => {
		const BARE_ROBOTS = /\brobots\s*[:=]\s*(?:""|''|``)/;
		const files = productionFiles().filter((path) => !relative(path).endsWith("core/seo/types.ts"));
		const naming = files.filter((path) => /\brobots\b/.test(read(path)));

		expect(BARE_ROBOTS.test(withoutStringLiterals('robots: "noindex, nofollow",'))).toBe(true);
		expect(BARE_ROBOTS.test(withoutStringLiterals("robots = RobotsDirective.NoIndexNoFollow,"))).toBe(false);
		expect(naming.length).toBeGreaterThan(1);
		expect(linesMatching({ files, pattern: BARE_ROBOTS })).toEqual([]);
	});

	it("matches a closed set in a switch that names every member and carries no default arm", () => {
		const SWITCH_OPENER = /\bswitch\s*\([^)\n]*\)\s*\{/g;
		const DEFAULT_ARM = /^default\s*:/;

		const carriesDefaultArm = (body: string): boolean => {
			let depth = 0;
			for (let index = 0; index < body.length; index += 1) {
				if (body[index] === "{") depth += 1;
				else if (body[index] === "}") depth -= 1;
				else if (depth === 0 && !/[\w$.]/.test(body[index - 1] ?? " ") && DEFAULT_ARM.test(body.slice(index))) {
					return true;
				}
			}
			return false;
		};

		const switchesIn = (source: string): string[] =>
			[...source.matchAll(SWITCH_OPENER)].map((opener) =>
				bracedBodyFrom({ source, open: (opener.index ?? 0) + opener[0].length - 1 }),
			);

		const files = productionFiles();
		const switches = files.flatMap((path) => switchesIn(read(path)).map((body) => ({ path, body })));
		const defaulting = switches.filter(({ body }) => carriesDefaultArm(body)).map(({ path }) => relative(path));

		expect(carriesDefaultArm("case A:\n\treturn 1;\ndefault:\n\treturn 2;")).toBe(true);
		expect(carriesDefaultArm("case A: {\n\tconst o = { default: 1 };\n\treturn o;\n}\ncase B:\n\treturn 2;")).toBe(
			false,
		);
		expect(carriesDefaultArm("case A:\n\treturn isDefault;")).toBe(false);
		expect(switches.length).toBeGreaterThan(0);
		expect(defaulting).toEqual([]);
	});
});

describe("the tests sweep and tag what the standards say", () => {
	it("puts every sheet under app/lib/ui/features in both the semantics and the text-scaling sweep", () => {
		const SHEET_CLASS = /^class\s+(\w+Sheet)\b/gm;
		const sheets = walk({
			dir: join(REPO, "app/lib/ui/features"),
			match: (path) => path.endsWith("_sheet.dart"),
		}).flatMap((path) => [...read(path).matchAll(SHEET_CLASS)].map(([, name]) => name));
		const sweeps = ["app/test/ui/accessibility_test.dart", "app/test/ui/text_scaling_test.dart"];
		const missing = sweeps.flatMap((sweep) =>
			sheets
				.filter((sheet) => !identifierNamed(sheet).test(read(join(REPO, sweep))))
				.map((sheet) => `${sweep} skips ${sheet}`),
		);

		expect(sheets.length).toBeGreaterThan(0);
		expect(missing).toEqual([]);
	});

	it("tags @smoke only in web/e2e/smoke.spec.ts", () => {
		const SMOKE_SPEC = "web/e2e/smoke.spec.ts";
		const tagging = walk({ dir: join(REPO, "web/e2e"), match: (path) => path.endsWith(".ts") })
			.filter((path) => read(path).includes("@smoke"))
			.map(relative);

		expect(tagging).toEqual([SMOKE_SPEC]);
	});

	const webUnitTests = (): string[] =>
		walk({ dir: join(REPO, "web/src"), match: (path) => COLOCATED_TEST_FILE.test(path) });

	it("undoes every stubbed global, stubbed variable, spy and fake clock in an afterEach or afterAll, which a failing assertion cannot skip", () => {
		const TEARDOWN_HOOK = /\bafter(?:Each|All)\(/g;
		const STUB_RESTORES = [
			{ stub: /\bvi\.stubGlobal\(/, restores: ["vi.unstubAllGlobals()"] },
			{ stub: /\bvi\.stubEnv\(/, restores: ["vi.unstubAllEnvs()"] },
			{ stub: /\bvi\.spyOn\(/, restores: ["vi.restoreAllMocks()", ".mockRestore()"] },
			{ stub: /\bvi\.useFakeTimers\(/, restores: ["vi.useRealTimers()"] },
		];

		const teardownsIn = (source: string): string[] => {
			const flattened = source.replaceAll("(", "{").replaceAll(")", "}");
			return [...source.matchAll(TEARDOWN_HOOK)].map((match) => {
				const open = match.index + match[0].length - 1;
				return source.slice(open + 1, open + 1 + bracedBodyFrom({ source: flattened, open }).length);
			});
		};

		const missingRestores = (source: string): string[] => {
			const code = withoutStringLiterals(source);
			const teardowns = teardownsIn(code);
			return STUB_RESTORES.filter(({ stub }) => stub.test(code))
				.filter(({ restores }) => !teardowns.some((body) => restores.some((restore) => body.includes(restore))))
				.map(({ restores }) => restores.join(" or "));
		};

		const tests = webUnitTests();
		const stubbing = STUB_RESTORES.map(({ stub }) => tests.filter((path) => stub.test(read(path))).length);
		const leaking = tests.flatMap((path) =>
			missingRestores(read(path)).map((restore) => `${relative(path)}: ${restore}`),
		);

		expect(missingRestores('it("a", () => { vi.stubGlobal("a", 1); vi.unstubAllGlobals(); });')).toEqual([
			"vi.unstubAllGlobals()",
		]);
		expect(missingRestores('afterEach(() => vi.useRealTimers()); it("a", () => { vi.useFakeTimers(); });')).toEqual([]);
		expect(missingRestores('const spy = vi.spyOn(a, "b"); afterAll(() => { spy.mockRestore(); });')).toEqual([]);
		expect(stubbing).not.toContain(0);
		expect(leaking).toEqual([]);
	});

	it("asserts the Usage Events a flow records as the exact list of calls, never one call at a time", () => {
		const EVENT_SPY_ASSERTION =
			/\bexpect\(\s*(recordUsageEvent|gtag|betterstack)\s*\)\s*(?:\.\s*not\s*)?\.\s*(toHaveBeenCalledWith|toHaveBeenLastCalledWith|toHaveBeenNthCalledWith|toHaveBeenCalledOnce|toHaveBeenCalledExactlyOnceWith)\b/g;
		const VENDOR_SPIES = new Set(["gtag", "betterstack"]);
		const RECORDS_USAGE_EVENTS = /\brecordUsageEvent\b/;

		const offendersIn = (source: string): string[] =>
			[...withoutStringLiterals(source).matchAll(EVENT_SPY_ASSERTION)]
				.filter(([, spy]) => spy === "recordUsageEvent" || (VENDOR_SPIES.has(spy) && RECORDS_USAGE_EVENTS.test(source)))
				.map(([, spy, matcher]) => `${spy}.${matcher}`);

		const tests = webUnitTests();
		const recording = tests.filter((path) => RECORDS_USAGE_EVENTS.test(read(path)));
		const offenders = tests.flatMap((path) => offendersIn(read(path)).map((found) => `${relative(path)}: ${found}`));

		expect(offendersIn('expect(recordUsageEvent).toHaveBeenCalledWith({ event: "x" });')).toEqual([
			"recordUsageEvent.toHaveBeenCalledWith",
		]);
		expect(offendersIn('recordUsageEvent(event);\nexpect(gtag)\n\t.toHaveBeenLastCalledWith("event", "x");')).toEqual([
			"gtag.toHaveBeenLastCalledWith",
		]);
		expect(offendersIn('expect(gtag).toHaveBeenCalledWith("consent", "update");')).toEqual([]);
		expect(offendersIn("expect(recordUsageEvent.mock.calls).toEqual([]);")).toEqual([]);
		expect(recording.length).toBeGreaterThan(0);
		expect(offenders).toEqual([]);
	});

	it("pins the clock in every Dart test, which reads none of its own", () => {
		const tests = walk({ dir: join(REPO, "app/test"), match: (path) => path.endsWith(".dart") });

		expect(DART_CLOCK_READ.test("final before = DateTime.now();")).toBe(true);
		expect(DART_CLOCK_READ.test("now: DateTime.now,")).toBe(true);
		expect(DART_CLOCK_READ.test("final testToday = DateTime(2031, 6, 15, 12);")).toBe(false);
		expect(tests.length).toBeGreaterThan(0);
		expect(linesMatching({ files: tests, pattern: DART_CLOCK_READ })).toEqual([]);
	});

	it("pins the clock rather than reading the year off it or bracketing Date.now()", () => {
		const REAL_YEAR = /new Date\(\)\.getFullYear\(\)/;
		const CLOCK_BRACKET = /\bconst\s+(?:before|after)\w*\s*=\s*(?:Math\.floor\()?Date\.now\(\)/;
		const tests = webUnitTests();

		expect(REAL_YEAR.test("const CURRENT_YEAR = new Date().getFullYear();")).toBe(true);
		expect(CLOCK_BRACKET.test("const before = Math.floor(Date.now() / 1000);")).toBe(true);
		expect(tests.length).toBeGreaterThan(0);
		expect(tests.filter((path) => REAL_YEAR.test(read(path)) || CLOCK_BRACKET.test(read(path))).map(relative)).toEqual(
			[],
		);
	});
});

describe("two or more arguments are one object typed after the function", () => {
	const FUNCTION_SIGNATURE = /(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*(?:<[^>]*>)?\s*\(([^)]*)\)/g;
	const ARROW_SIGNATURE =
		/(?:export\s+)?const\s+([A-Za-z0-9_]+)\s*(?::[^=]*)?=\s*(?:async\s*)?\(([^)]*)\)\s*(?::[^=]*)?=>/g;
	const TRAILING_COMMA = /,\s*$/;

	const topLevelArity = (parameters: string): number => {
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
		expect(read(join(REPO, "AGENTS.md"))).toContain("One argument is positional; two or more are one object");
	});

	it("holds everywhere, tests included", () => {
		const signatures = sources.flatMap((file) =>
			[...read(file).matchAll(FUNCTION_SIGNATURE), ...read(file).matchAll(ARROW_SIGNATURE)].map(
				([, name, parameters]) => ({ file, name, parameters: (parameters ?? "").trim().replace(TRAILING_COMMA, "") }),
			),
		);
		const positional = signatures
			.filter(({ parameters }) => parameters.length > 0 && !parameters.startsWith("{"))
			.filter(({ parameters }) => topLevelArity(parameters) > 1)
			.map(({ file, name }) => `${relative(file)}: ${name}`);

		expect(emptyRoots({ paths: sources.map(relative), roots: ["web/src", "web/e2e", "docs"] })).toEqual([]);
		expect(signatures.length).toBeGreaterThan(0);
		expect(positional).toEqual([]);
	});

	it("gives no params type, and no inline parameter type, a single field of its own", () => {
		const PARAMS_DECLARATION =
			/(?:interface\s+(\w+Params)\b(?:\s*<[^>{]*>)?(\s+extends\s+[^{]+)?\s*\{|type\s+(\w+Params)\b(?:\s*<[^>=]*>)?\s*=\s*\{)/g;
		const INLINE_SINGLE_FIELD =
			/[(]\s*\{\s*\w+\s*(?:=\s*[^}]+)?\}\s*:\s*\{\s*(?:readonly\s+)?\w+\??\s*:[^;{}]*;?\s*\}\s*[)]/;

		const fieldsOf = (body: string): string[] => {
			let depth = 0;
			let current = "";
			const fields: string[] = [];

			for (const character of body) {
				if ("{([<".includes(character)) depth += 1;
				else if ("})]>".includes(character)) depth -= 1;
				if (";,\n".includes(character) && depth === 0) {
					if (current.trim()) fields.push(current.trim());
					current = "";
				} else current += character;
			}
			if (current.trim()) fields.push(current.trim());

			return fields;
		};

		const files = [...sources, ...walk({ dir: join(REPO, "web/src"), match: (path) => path.endsWith(".tsx") })];
		const declarations = files.flatMap((file) => {
			const source = read(file);
			return [...source.matchAll(PARAMS_DECLARATION)].map((match) => ({
				file,
				name: match[1] ?? match[3],
				extended: match[2] !== undefined,
				fields: fieldsOf(bracedBodyFrom({ source, open: match.index + match[0].length - 1 })),
			}));
		});
		const single = [
			...declarations
				.filter(({ extended, fields }) => !extended && fields.length < 2)
				.map(({ file, name }) => `${relative(file)}: ${name}`),
			...files.filter((file) => INLINE_SINGLE_FIELD.test(read(file))).map((file) => `${relative(file)}: inline`),
		];

		expect(declarations.length).toBeGreaterThan(0);
		expect(single).toEqual([]);
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
	const SHARED_DEPLOY_MESSAGE = /^\$\{\{ github\.sha \}\}-\$\{\{ github\.event_name \}\}$/;
	const DEPLOY_MESSAGE_ARGUMENT = /--message[ =]("?)((?:\$\{\{[^}]*\}\}|[^\s"])+)\1/;
	const SHELL_VARIABLE = /^\$\{?(\w+)\}?$/;
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

	interface DeployMessageParams {
		step: string;
		line: string;
	}

	const deployMessage = ({ step, line }: DeployMessageParams): string => {
		const argument = DEPLOY_MESSAGE_ARGUMENT.exec(line)?.[2] ?? "";
		const variable = SHELL_VARIABLE.exec(argument)?.[1];
		if (variable === undefined) return argument;
		const declaration = step
			.split("\n")
			.map((text) => text.trim())
			.find((text) => text.startsWith(`${variable}:`));
		return declaration?.slice(variable.length + 1).trim() ?? "";
	};

	it("names every deploy with the --message the deploying repositories share, <sha>-<event> as one token, because forever-pto's OpenNext deploy re-spawns wrangler through a shell", () => {
		const deploys = steps.flatMap(({ file, step }) =>
			step
				.split("\n")
				.filter((line) => DEPLOY_COMMAND.test(line))
				.map((line) => ({ file, message: deployMessage({ step, line }) })),
		);

		expect(deploys.length).toBeGreaterThan(0);
		expect(
			deploys
				.filter(({ message }) => !SHARED_DEPLOY_MESSAGE.test(message))
				.map(({ file, message }) => `${relative(file)} (${message})`),
		).toEqual([]);
	});

	it("filters ci.yml by no path, and gates the docs contract on nothing", () => {
		const ci = read(join(WORKFLOWS, "ci.yml"));
		const trigger = ci.match(/^on:\n([\s\S]*?)^\S/m)?.[1] ?? "";
		const docsContract = ci.match(/^ {2}docs-contract:\n((?: {4}.*\n|\n)*)/m)?.[1] ?? "";

		expect(trigger).not.toBe("");
		expect(docsContract).toContain("pnpm test:docs");
		expect(trigger).not.toMatch(/^\s+paths(?:-ignore)?:/m);
		expect(docsContract).not.toMatch(/^ {4}(?:if|needs):/m);
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

	const PLAYWRIGHT_CONFIG = "web/playwright.config.ts";
	const PLAYWRIGHT_PROJECT = /name:\s*"(\w+)",\s*use:\s*\{\s*\.\.\.devices\["([\w ]+)"\]/g;
	const RUNS_PLAYWRIGHT = /\bplaywright test\b|\bpnpm test:e2e\b/;
	const PLAYWRIGHT_INSTALL_LINE = /^.*\bplaywright install\b.*$/gm;
	const JOB_START = /^ {2}(?=[\w-]+:[ \t]*$)/m;
	const BOTH_BROWSERS = [
		/^ {10}key: \$\{\{ runner\.os \}\}-playwright-chromium-webkit-\$\{\{ hashFiles\('pnpm-lock\.yaml'\) \}\}$/m,
		/^ {8}run: pnpm exec playwright install --with-deps chromium webkit$/m,
		/^ {8}run: pnpm exec playwright install-deps chromium webkit$/m,
	];

	const jobsIn = (file: string): { id: string; body: string }[] => {
		const source = read(file);
		return source
			.slice(source.search(/^jobs:$/m))
			.split(JOB_START)
			.filter((body) => /^[\w-]+:/.test(body))
			.map((body) => ({ id: `${relative(file)}: ${body.slice(0, body.indexOf(":"))}`, body }));
	};

	it("runs every end-to-end case in Chromium and in WebKit, in CI and on a laptop alike", () => {
		const config = read(join(REPO, PLAYWRIGHT_CONFIG));
		const projects = [...config.matchAll(PLAYWRIGHT_PROJECT)].map(([, name, device]) => `${name}: ${device}`);

		expect(projects).toEqual(["chromium: Desktop Chrome", "webkit: Desktop Safari"]);
		expect(config.match(/\bprojects:/g)).toHaveLength(1);
		expect(config, "a project list chosen by process.env.CI runs a different suite in CI than on a laptop").toMatch(
			/\bprojects: \[/,
		);
		expect(config).not.toMatch(/firefox/i);
	});

	it("installs both browsers in every job that runs Playwright, under a cache key that names them", () => {
		const jobs = workflows.flatMap(jobsIn).filter(({ body }) => RUNS_PLAYWRIGHT.test(body));
		const missing = jobs.flatMap(({ id, body }) =>
			BOTH_BROWSERS.filter((line) => !line.test(body)).map((line) => `${id} lacks ${line.source}`),
		);
		const installs = workflows.flatMap((file) =>
			[...read(file).matchAll(PLAYWRIGHT_INSTALL_LINE)].map(([line]) => ({ file, line: line.trim() })),
		);
		const singleBrowser = installs
			.filter(({ line }) => !line.endsWith(" chromium webkit"))
			.map(({ file, line }) => `${relative(file)}: ${line}`);

		expect(jobs.map(({ id }) => id)).toEqual(
			expect.arrayContaining([".github/workflows/ci.yml: smoke", ".github/workflows/ci.yml: e2e"]),
		);
		expect(installs.length).toBeGreaterThanOrEqual(2 * jobs.length);
		expect(missing).toEqual([]);
		expect(singleBrowser).toEqual([]);
	});

	it("lets semantic-release say whether it published, rather than grepping the commit it wrote", () => {
		const workflow = read(join(WORKFLOWS, "release-app.yml"));
		const releaserc = read(join(REPO, "app/.releaserc.json"));

		expect(workflow).not.toMatch(/chore\(/);
		expect(workflow).not.toMatch(/git log -1/);
		expect(releaserc).toMatch(/"successCmd": ".*GITHUB_OUTPUT/);
	});
});

describe("the preview's Access token", () => {
	const ACCESS_FIXTURE = "web/e2e/fixtures.ts";
	const PLAYWRIGHT_CONFIG_FILE = /^playwright\.config\.[cm]?[jt]s$/;
	const PLAYWRIGHT_IMPORT = /^import\s+(type\s+)?([^;]*?)\s+from\s+"@playwright\/test";?$/gm;
	const BARE_PLAYWRIGHT_IMPORT = /^import\s+"@playwright\/test"/m;
	const NAMED_BINDINGS = /^\{([\s\S]*)\}$/;
	const EXTRA_HEADERS = /\bextraHTTPHeaders\b|\.setExtraHTTPHeaders\(/;

	const importsPlaywrightValues = (source: string): boolean =>
		BARE_PLAYWRIGHT_IMPORT.test(source) ||
		[...source.matchAll(PLAYWRIGHT_IMPORT)].some(([, typeOnly, clause = ""]) => {
			if (typeOnly) return false;
			const named = clause.trim().match(NAMED_BINDINGS);
			return (
				!named ||
				(named[1] ?? "")
					.split(",")
					.map((binding) => binding.trim())
					.some((binding) => binding !== "" && !binding.startsWith("type "))
			);
		});

	const e2eSources = (): string[] =>
		walk({ dir: join(REPO, "web/e2e"), match: (path) => path.endsWith(".ts") }).filter(
			(path) => relative(path) !== ACCESS_FIXTURE,
		);

	it("reaches every spec through web/e2e/fixtures.ts, which sends it to the preview's origin alone, so no spec takes a value from @playwright/test", () => {
		const sources = e2eSources();

		expect(importsPlaywrightValues('import { expect, test } from "@playwright/test";')).toBe(true);
		expect(importsPlaywrightValues('import { expect, type Page, test } from "@playwright/test";')).toBe(true);
		expect(importsPlaywrightValues('import * as playwright from "@playwright/test";')).toBe(true);
		expect(importsPlaywrightValues('import type { Page } from "@playwright/test";')).toBe(false);
		expect(importsPlaywrightValues('import { type Page } from "@playwright/test";')).toBe(false);
		expect(importsPlaywrightValues('import { expect, test } from "./fixtures";')).toBe(false);
		expect(existsSync(join(REPO, ACCESS_FIXTURE))).toBe(true);
		expect(sources.filter((path) => path.endsWith(".spec.ts")).length).toBeGreaterThan(0);
		expect(sources.filter((path) => importsPlaywrightValues(read(path))).map(relative)).toEqual([]);
	});

	it("is set as extraHTTPHeaders by no Playwright config and no spec, because Playwright sends those on every request a page makes, to every third party included", () => {
		const configs = ["", "web"].flatMap((dir) =>
			readdirSync(join(REPO, dir))
				.filter((name) => PLAYWRIGHT_CONFIG_FILE.test(name))
				.map((name) => join(REPO, dir, name)),
		);

		expect(EXTRA_HEADERS.test("export default defineConfig({ use: { extraHTTPHeaders: headers } });")).toBe(true);
		expect(EXTRA_HEADERS.test("test.use({ extraHTTPHeaders });")).toBe(true);
		expect(EXTRA_HEADERS.test("await page.setExtraHTTPHeaders(headers);")).toBe(true);
		expect(EXTRA_HEADERS.test('export default defineConfig({ use: { baseURL: "http://localhost" } });')).toBe(false);
		expect(configs.length).toBeGreaterThan(0);
		expect([...configs, ...e2eSources()].filter((path) => EXTRA_HEADERS.test(read(path))).map(relative)).toEqual([]);
	});
});

const SECURITY_TXT = /(?:^|\/)(?:public|assets)\/(?:.+\/)?security\.txt$/;
const SECURITY_TXT_PATH = "/.well-known/security.txt";
const SECURITY_TXT_FIELD = /^([\w-]+): *(.*)$/gm;
const SECURITY_TXT_SHAPE = ["Contact", "Expires", "Preferred-Languages", "Canonical", "Policy"].join(", ");
const SECURITY_TXT_RENEWAL_DAYS = 30;
const SECURITY_TXT_LIFETIME_YEARS = 2;
const DAY_IN_MS = 86_400_000;
const BARE_ORIGIN = /^https:\/\/[^/]+$/;
const GITHUB_REPOSITORY = /^git\+(https:\/\/github\.com\/[\w.-]+\/[\w-]+)\.git$/;
const SITE_DECLARATION = /^const SITE = process\.env\.SITE_URL \?\? "([^"]+)";$/m;
const SITES_SERVED = 1;

interface SecurityTxtFaultsParams {
	text: string;
	origin: string;
	repository: string;
	now: number;
}

const securityTxtFaults = ({ text, origin, repository, now }: SecurityTxtFaultsParams): string[] => {
	const fields = new Map([...text.matchAll(SECURITY_TXT_FIELD)].map(([, name, value]) => [name, value.trim()]));
	const shape = [...fields.keys()].join(", ");
	const expires = fields.get("Expires") ?? "";
	const instant = Date.parse(expires);
	const ceiling = new Date(now);
	const canonical = `${origin}${SECURITY_TXT_PATH}`;
	const policy = `${repository}/security/policy`;

	ceiling.setUTCFullYear(ceiling.getUTCFullYear() + SECURITY_TXT_LIFETIME_YEARS);

	const checks: [boolean, string][] = [
		[shape === SECURITY_TXT_SHAPE, `its fields are ${shape}, not ${SECURITY_TXT_SHAPE}`],
		[
			!Number.isNaN(instant) && new Date(instant).toISOString() === expires,
			`Expires ${expires} is not an ISO 8601 instant`,
		],
		[
			!(instant - now < SECURITY_TXT_RENEWAL_DAYS * DAY_IN_MS),
			`Expires ${expires} is fewer than ${SECURITY_TXT_RENEWAL_DAYS} days away: renew it`,
		],
		[!(instant > ceiling.getTime()), `Expires ${expires} is more than ${SECURITY_TXT_LIFETIME_YEARS} years away`],
		[fields.get("Canonical") === canonical, `Canonical ${fields.get("Canonical")} is not ${canonical}`],
		[fields.get("Policy") === policy, `Policy ${fields.get("Policy")} is not ${policy}`],
	];

	return checks.filter(([holds]) => !holds).map(([, fault]) => fault);
};

describe("security.txt", () => {
	const origin = read(join(REPO, "web/astro.config.ts")).match(SITE_DECLARATION)?.[1] ?? "";
	const repository =
		json<{ repository?: { url?: string } }>("package.json").repository?.url?.match(GITHUB_REPOSITORY)?.[1] ?? "";
	const sites = new Map([["web/public", origin]]);
	const files = walk({ dir: REPO, match: (path) => SECURITY_TXT.test(relative(path)) }).map(relative);

	it("keeps one security.txt on every site this repository serves, naming a contact, the site's own canonical URL and this repository's policy, and reads the real clock on purpose: an Expires fewer than 30 days away turns main red a month before the file lapses, so the fix is to renew it, and one more than two years away is past the owner's ceiling", () => {
		const now = Date.UTC(2026, 9, 10);
		const inDays = (days: number) => new Date(now + days * DAY_IN_MS).toISOString();
		const sample = (fields: Record<string, string>) =>
			securityTxtFaults({
				text: Object.entries(fields)
					.map(([name, value]) => `${name}: ${value}`)
					.join("\n"),
				origin: "https://example.org",
				repository: "https://github.com/owner/site",
				now,
			});
		const valid = {
			Contact: "mailto:security@example.org",
			Expires: inDays(365),
			"Preferred-Languages": "en",
			Canonical: "https://example.org/.well-known/security.txt",
			Policy: "https://github.com/owner/site/security/policy",
		};
		const { Canonical: canonical, ...noCanonical } = valid;
		const { Policy: policy, ...noPolicy } = valid;

		expect(SECURITY_TXT.test("apps/docs/public/.well-known/security.txt")).toBe(true);
		expect(SECURITY_TXT.test("app/assets/security.txt")).toBe(true);
		expect(SECURITY_TXT.test("docs/security.txt")).toBe(false);
		expect(sample(valid)).toEqual([]);
		expect(sample({ ...valid, Expires: inDays(30) })).toEqual([]);
		expect(sample({ ...valid, Expires: inDays(29) })).toEqual([
			`Expires ${inDays(29)} is fewer than 30 days away: renew it`,
		]);
		expect(sample({ ...valid, Expires: "2028-10-01T00:00:00.000Z" })).toEqual([]);
		expect(sample({ ...valid, Expires: "2028-10-11T00:00:00.000Z" })).toEqual([
			"Expires 2028-10-11T00:00:00.000Z is more than 2 years away",
		]);
		expect(sample({ ...valid, Expires: "the first of October" })).toEqual([
			"Expires the first of October is not an ISO 8601 instant",
		]);
		expect(sample(noCanonical)).toEqual([
			"its fields are Contact, Expires, Preferred-Languages, Policy, not Contact, Expires, Preferred-Languages, Canonical, Policy",
			`Canonical undefined is not ${canonical}`,
		]);
		expect(sample({ ...valid, Canonical: "https://example.com/.well-known/security.txt" })).toEqual([
			`Canonical https://example.com/.well-known/security.txt is not ${canonical}`,
		]);
		expect(sample(noPolicy)).toEqual([
			"its fields are Contact, Expires, Preferred-Languages, Canonical, not Contact, Expires, Preferred-Languages, Canonical, Policy",
			`Policy undefined is not ${policy}`,
		]);
		expect(origin).toMatch(BARE_ORIGIN);
		expect(repository).not.toBe("");
		expect(files.length).toBeGreaterThanOrEqual(SITES_SERVED);
		expect(files).toEqual([...sites.keys()].map((folder) => `${folder}${SECURITY_TXT_PATH}`));
		expect(
			files.flatMap((file) =>
				securityTxtFaults({
					text: read(join(REPO, file)),
					origin: sites.get(file.slice(0, -SECURITY_TXT_PATH.length)) ?? "",
					repository,
					now: Date.now(),
				}).map((fault) => `${file}: ${fault}`),
			),
		).toEqual([]);
	});
});

describe("the YAML carries no comment but a pin's version, and every action is pinned to a commit", () => {
	const YAML_FILE = /\.ya?ml$/;
	const WRITTEN_BY_PNPM = "pnpm-lock.yaml";
	const BLOCK_SCALAR_HEADER = /(?:^|\s)[|>](?:[1-9][+-]?|[+-][1-9]?)?$/;
	const LEADING_ENTRY = /^(\s*)((?:-\s+)*)/;
	const QUOTE_OPENS_AFTER = /(?:^\s*|(?:^|\s)-\s+|(?:^|\s)\?\s+|:\s+|[[{,]\s*)$/;
	const USES = /^\s*(?:-\s+)?uses:\s*(\S+)(.*)$/;
	const SAME_REPOSITORY = /^[.$]\//;
	const SHA_PIN = /^[\w.-]+\/[\w./-]+@[0-9a-f]{40}$/;
	const PIN_COMMENT = /^\s+#\s\S+$/;
	const TOOL_DIRECTIVE = /^#\s*(?:zizmor|yaml-language-server):/;
	const RENOVATE_ANNOTATION = /^# Renovate security update: \S/;
	const RENOVATE_ANNOTATED_FILE = "pnpm-workspace.yaml";

	interface YamlComment {
		readonly line: number;
		readonly text: string;
		readonly comment: string;
	}

	const yamlComments = (source: string): YamlComment[] => {
		const comments: YamlComment[] = [];
		let parentIndent: number | null = null;
		let quote: string | null = null;

		source.split("\n").forEach((text, index) => {
			const indent = text.length - text.trimStart().length;
			if (parentIndent !== null) {
				if (text.trim() === "" || indent > parentIndent) return;
				parentIndent = null;
			}
			let commentAt = -1;
			for (let at = 0; at < text.length; at += 1) {
				const character = text[at];
				if (quote) {
					if (quote === '"' && character === "\\") at += 1;
					else if (quote === "'" && character === "'" && text[at + 1] === "'") at += 1;
					else if (character === quote) quote = null;
				} else if ((character === '"' || character === "'") && QUOTE_OPENS_AFTER.test(text.slice(0, at))) {
					quote = character;
				} else if (character === "#" && (at === 0 || /[ \t]/.test(text[at - 1]))) {
					commentAt = at;
					break;
				}
			}
			const content = (commentAt === -1 ? text : text.slice(0, commentAt)).trimEnd();
			if (commentAt !== -1) comments.push({ line: index + 1, text, comment: text.slice(commentAt) });
			if (quote === null && BLOCK_SCALAR_HEADER.test(content)) {
				const [entry, base, dashes] = LEADING_ENTRY.exec(content) ?? ["", "", ""];
				const opensOnTheDash = /^[|>]/.test(content.slice(entry.length)) && dashes !== "";
				parentIndent = base.length + dashes.length - (opensOnTheDash ? 2 : 0);
			}
		});

		return comments;
	};

	const yamlFiles = (): string[] =>
		[
			...walk({ dir: REPO, match: (path) => YAML_FILE.test(path) }),
			...walk({ dir: join(REPO, ".github"), match: (path) => YAML_FILE.test(path) }),
		].filter((path) => relative(path) !== WRITTEN_BY_PNPM);

	const pinOf = (text: string): RegExpExecArray | null => {
		const uses = USES.exec(text);
		return uses !== null && !SAME_REPOSITORY.test(uses[1]) ? uses : null;
	};

	interface AllowedParams {
		readonly path: string;
		readonly found: YamlComment;
	}

	const allowed = ({ path, found }: AllowedParams): boolean => {
		const pin = pinOf(found.text);
		return (
			(pin !== null && SHA_PIN.test(pin[1]) && PIN_COMMENT.test(pin[2])) ||
			TOOL_DIRECTIVE.test(found.comment) ||
			(relative(path) === RENOVATE_ANNOTATED_FILE && RENOVATE_ANNOTATION.test(found.comment))
		);
	};

	it("tells a comment from a hash inside a scalar, a quoted string or a block", () => {
		const commentsOf = (source: string): string[] => yamlComments(source).map(({ comment }) => comment);

		expect(commentsOf("a: b # one\nc: \"d # not\" # two\ne: C#\nf: 'it''s # not'\n")).toEqual(["# one", "# two"]);
		expect(commentsOf("run: |\n  echo # shell\n  # heading\nnext: 1 # three\n")).toEqual(["# three"]);
		expect(commentsOf("steps:\n  - run: |\n      # inside\n    env: 1 # four\n  - |\n    # inside\n")).toEqual([
			"# four",
		]);
		expect(commentsOf('a: "first\n  # still the string"\n# five\n')).toEqual(["# five"]);
	});

	it("holds every uses: of another repository to a full commit SHA with its version or branch beside it", () => {
		const pins = yamlFiles().flatMap((path) =>
			read(path)
				.split("\n")
				.map((text, index) => ({ at: `${relative(path)}:${index + 1}`, pin: pinOf(text) })),
		);
		const unpinned = pins
			.filter(({ pin }) => pin !== null && !(SHA_PIN.test(pin[1]) && PIN_COMMENT.test(pin[2])))
			.map(({ at }) => at);

		expect(pins.filter(({ pin }) => pin !== null).length).toBeGreaterThan(0);
		expect(unpinned).toEqual([]);
	});

	it("carries no comment in YAML but a SHA pin's version, a tool directive and the line Renovate writes", () => {
		const files = yamlFiles();
		const offenders = files.flatMap((path) =>
			yamlComments(read(path))
				.filter((found) => !allowed({ path, found }))
				.map(({ line, comment }) => `${relative(path)}:${line} ${comment}`),
		);

		expect(files.length).toBeGreaterThan(0);
		expect(offenders).toEqual([]);
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
	zod: ["Zod", "zod"],
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

describe("stated versions", () => {
	it("polices the runtimes and every versioned dependency the manifests declare, and nothing else", () => {
		expect(POLICED_NAMES).toEqual(expect.arrayContaining(["Node", "pnpm"]));
		expect(POLICED_NAMES.length).toBeGreaterThan(2);
	});

	it("states the current version of nothing a bot moves, outside the ADRs", () => {
		const documents = checkedDocuments()
			.map(relative)
			.filter((file) => !file.startsWith("docs/adr/") && !file.endsWith("CHANGELOG.md"));
		const stated = documents.flatMap((file) =>
			[...read(join(REPO, file)).matchAll(STATED_VERSION)].map(([match]) => `${file}: ${match}`),
		);

		expect(documents.length).toBeGreaterThan(0);
		expect(stated).toEqual([]);
	});
});

const BREAKING_PARSER_OPTS = {
	headerPattern: "^(\\w*)(?:\\((.*)\\))?!?: (.*)$",
	breakingHeaderPattern: "^(\\w*)(?:\\((.*)\\))?!: (.*)$",
};
const COMMIT_PARSING_PLUGINS = ["@semantic-release/commit-analyzer", "@semantic-release/release-notes-generator"];
const RELEASE_CONFIG = /[/\\](\.releaserc(\.\w+)?|release\.config\.\w+)$/;

type ReleasePlugin = string | [string, Record<string, unknown>?];

interface ParserOptsOfParams {
	plugins: ReleasePlugin[];
	name: string;
}

const parserOptsOf = ({ plugins, name }: ParserOptsOfParams): unknown => {
	const entry = plugins.find((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin) === name);

	return Array.isArray(entry) ? entry[1]?.parserOpts : undefined;
};

describe("the release configs parse the commit grammar commitlint accepts", () => {
	const configs = walk({ dir: REPO, match: (path) => RELEASE_CONFIG.test(path) });

	it("teaches every plugin that parses a commit message the same header grammar, in both components", () => {
		const wrong = configs.flatMap((file) => {
			const { plugins } = JSON.parse(read(file)) as { plugins: ReleasePlugin[] };

			return COMMIT_PARSING_PLUGINS.filter(
				(name) => JSON.stringify(parserOptsOf({ plugins, name })) !== JSON.stringify(BREAKING_PARSER_OPTS),
			).map((name) => `${file.slice(REPO.length + 1)}: ${name}`);
		});

		expect(configs.length).toBeGreaterThan(1);
		expect(wrong).toEqual([]);
	});

	it("commits each release under its own package's scope, and tells CI to leave it alone", () => {
		const wrong = configs.flatMap((file) => {
			const { plugins } = JSON.parse(read(file)) as { plugins: ReleasePlugin[] };
			const entry = plugins.find((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin) === "@semantic-release/git");
			const message = Array.isArray(entry) ? String(entry[1]?.message) : "";
			const scope = json<{ name: string }>(
				`${file.slice(REPO.length + 1).replace(RELEASE_CONFIG, "")}/package.json`,
			).name;

			return message.startsWith(`chore(${scope}): release \${nextRelease.version}`) && message.includes("[skip ci]")
				? []
				: [`${file.slice(REPO.length + 1)}: ${message}`];
		});

		expect(wrong).toEqual([]);
	});

	it("serialises every job that pushes a release commit into one concurrency group", () => {
		const groups = ["ci.yml", "release-app.yml"].flatMap((workflow) =>
			[...read(join(REPO, ".github/workflows", workflow)).matchAll(/^\s*group:\s*(\S.*)$/gm)].map(([, group]) =>
				group.trim(),
			),
		);

		expect(groups).toContain("release");
		expect(groups.filter((group) => group.startsWith("release"))).toEqual(["release", "release"]);
	});
});
