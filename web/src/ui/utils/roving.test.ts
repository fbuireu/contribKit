import { afterEach, describe, expect, it, vi } from "vitest";
import { activateRadio, activateTab, addRadioKeyboard } from "./roving";

type KeydownHandler = (event: { key: string; preventDefault: () => void }) => void;

interface FakeEl {
	id: string;
	classes: Set<string>;
	attrs: Record<string, string>;
	focus: ReturnType<typeof vi.fn>;
	keydown?: KeydownHandler;
	classList: { add: (c: string) => void; remove: (c: string) => void };
	setAttribute: (key: string, value: string) => void;
	addEventListener: (type: string, handler: KeydownHandler) => void;
}

const makeEl = (id = ""): FakeEl => {
	const classes = new Set<string>();
	const attrs: Record<string, string> = {};
	const el: FakeEl = {
		id,
		classes,
		attrs,
		focus: vi.fn(),
		classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c) },
		setAttribute: (key, value) => {
			attrs[key] = value;
		},
		addEventListener: (type, handler) => {
			if (type === "keydown") el.keydown = handler;
		},
	};
	return el;
};

const asList = (els: FakeEl[]) => els as unknown as NodeListOf<HTMLElement>;
const asEl = (el: FakeEl) => el as unknown as HTMLElement;

describe("activateRadio", () => {
	it("activates the target and resets the others", () => {
		const els = [makeEl(), makeEl(), makeEl()];
		activateRadio(asList(els), asEl(els[1]));
		expect(els[1].classes.has("active")).toBe(true);
		expect(els[1].attrs["aria-checked"]).toBe("true");
		expect(els[0].classes.has("active")).toBe(false);
		expect(els[2].attrs["aria-checked"]).toBe("false");
	});
});

describe("addRadioKeyboard", () => {
	it("moves to the next item on ArrowDown and activates it", () => {
		const els = [makeEl(), makeEl(), makeEl()];
		const onActivate = vi.fn();
		addRadioKeyboard(asList(els), 0, onActivate);
		const preventDefault = vi.fn();
		els[0].keydown?.({ key: "ArrowDown", preventDefault });
		expect(preventDefault).toHaveBeenCalled();
		expect(els[1].classes.has("active")).toBe(true);
		expect(els[1].focus).toHaveBeenCalledOnce();
		expect(onActivate).toHaveBeenCalledOnce();
	});

	it("wraps from the first item to the last on ArrowUp", () => {
		const els = [makeEl(), makeEl(), makeEl()];
		addRadioKeyboard(asList(els), 0, vi.fn());
		els[0].keydown?.({ key: "ArrowUp", preventDefault: vi.fn() });
		expect(els[2].classes.has("active")).toBe(true);
	});

	it("jumps to the last item with End", () => {
		const els = [makeEl(), makeEl(), makeEl()];
		addRadioKeyboard(asList(els), 1, vi.fn());
		els[1].keydown?.({ key: "End", preventDefault: vi.fn() });
		expect(els[2].classes.has("active")).toBe(true);
	});

	it("ignores unrelated keys", () => {
		const els = [makeEl(), makeEl()];
		const onActivate = vi.fn();
		addRadioKeyboard(asList(els), 0, onActivate);
		els[0].keydown?.({ key: "Enter", preventDefault: vi.fn() });
		expect(onActivate).not.toHaveBeenCalled();
	});
});

describe("activateTab", () => {
	afterEach(() => vi.unstubAllGlobals());

	it("selects the target tab and links the panel to it", () => {
		const panel = makeEl("export-preview");
		vi.stubGlobal("document", { getElementById: (id: string) => (id === "export-preview" ? panel : null) });
		const tabs = [makeEl("tab-a"), makeEl("tab-b")];
		activateTab(asList(tabs), asEl(tabs[1]));
		expect(tabs[1].attrs["aria-selected"]).toBe("true");
		expect(tabs[0].attrs["aria-selected"]).toBe("false");
		expect(panel.attrs["aria-labelledby"]).toBe("tab-b");
	});
});
