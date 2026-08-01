import { afterEach, describe, expect, it, vi } from "vitest";
import { activateRadio, activateTab, initRovingGroup, RovingOrientation } from "./roving";

type Handler = (event: { key: string; preventDefault: () => void }) => void;

interface FakeEl {
	id: string;
	classes: Set<string>;
	attrs: Record<string, string>;
	focus: ReturnType<typeof vi.fn>;
	keydown?: Handler;
	click?: () => void;
	tabIndex: number;
	classList: { add: (c: string) => void; remove: (c: string) => void; contains: (c: string) => boolean };
	setAttribute: (key: string, value: string) => void;
	addEventListener: (type: string, handler: Handler | (() => void)) => void;
}

const makeEl = (id = ""): FakeEl => {
	const classes = new Set<string>();
	const attrs: Record<string, string> = {};
	const el: FakeEl = {
		id,
		classes,
		attrs,
		focus: vi.fn(),
		tabIndex: 0,
		classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c) },
		setAttribute: (key, value) => {
			attrs[key] = value;
		},
		addEventListener: (type, handler) => {
			if (type === "keydown") el.keydown = handler as Handler;
			if (type === "click") el.click = handler as () => void;
		},
	};
	return el;
};

const asList = (els: FakeEl[]) => els as unknown as NodeListOf<HTMLElement>;
const asEl = (el: FakeEl) => el as unknown as HTMLElement;

describe("activateRadio", () => {
	it("activates the target and resets the others", () => {
		const els = [makeEl(), makeEl(), makeEl()];
		activateRadio({ buttons: asList(els), target: asEl(els[1]) });
		expect(els[1].classes.has("active")).toBe(true);
		expect(els[1].attrs["aria-checked"]).toBe("true");
		expect(els[0].classes.has("active")).toBe(false);
		expect(els[2].attrs["aria-checked"]).toBe("false");
	});
});

describe("initRovingGroup", () => {
	const setup = (orientation?: RovingOrientation) => {
		const els = [makeEl(), makeEl(), makeEl()];
		const onActivate = vi.fn();
		initRovingGroup({
			elements: asList(els),
			activate: (target) => activateRadio({ buttons: asList(els), target }),
			onActivate,
			orientation,
		});
		return { els, onActivate };
	};

	it("activates the clicked element", () => {
		const { els, onActivate } = setup();
		els[2].click?.();
		expect(els[2].classes.has("active")).toBe(true);
		expect(onActivate).toHaveBeenCalledOnce();
	});

	it("moves to the next item on ArrowDown and activates it", () => {
		const { els, onActivate } = setup();
		const preventDefault = vi.fn();
		els[0].keydown?.({ key: "ArrowDown", preventDefault });
		expect(preventDefault).toHaveBeenCalled();
		expect(els[1].classes.has("active")).toBe(true);
		expect(els[1].focus).toHaveBeenCalledOnce();
		expect(onActivate).toHaveBeenCalledOnce();
	});

	it("wraps from the first item to the last on ArrowUp", () => {
		const { els } = setup();
		els[0].keydown?.({ key: "ArrowUp", preventDefault: vi.fn() });
		expect(els[2].classes.has("active")).toBe(true);
	});

	it("jumps to the last item with End", () => {
		const { els } = setup();
		els[1].keydown?.({ key: "End", preventDefault: vi.fn() });
		expect(els[2].classes.has("active")).toBe(true);
	});

	it("ignores unrelated keys", () => {
		const { els, onActivate } = setup();
		els[0].keydown?.({ key: "Enter", preventDefault: vi.fn() });
		expect(onActivate).not.toHaveBeenCalled();
	});

	it("ignores vertical arrows when the orientation is horizontal", () => {
		const { els, onActivate } = setup(RovingOrientation.Horizontal);
		els[0].keydown?.({ key: "ArrowDown", preventDefault: vi.fn() });
		expect(onActivate).not.toHaveBeenCalled();
		els[0].keydown?.({ key: "ArrowRight", preventDefault: vi.fn() });
		expect(els[1].classes.has("active")).toBe(true);
	});
});

describe("activateTab", () => {
	afterEach(() => vi.unstubAllGlobals());

	it("selects the target tab and links the panel to it", () => {
		const panel = makeEl("export-preview");
		vi.stubGlobal("document", { getElementById: (id: string) => (id === "export-preview" ? panel : null) });
		const tabs = [makeEl("tab-a"), makeEl("tab-b")];
		activateTab({ tabs: asList(tabs), target: asEl(tabs[1]) });
		expect(tabs[1].attrs["aria-selected"]).toBe("true");
		expect(tabs[0].attrs["aria-selected"]).toBe("false");
		expect(panel.attrs["aria-labelledby"]).toBe("tab-b");
	});

	it("keeps exactly one tab in the tab order", () => {
		vi.stubGlobal("document", { getElementById: () => null });
		const tabs = [makeEl("tab-a"), makeEl("tab-b")];
		activateTab({ tabs: asList(tabs), target: asEl(tabs[1]) });
		expect(tabs.map((tab) => tab.tabIndex)).toEqual([-1, 0]);
	});
});
