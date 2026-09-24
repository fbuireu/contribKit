// @vitest-environment happy-dom

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { initUsageEventLinks, readUsageEventLink, UsageAttribute, usageEventAttributes } from "./usage-event-links";

const recordUsageEvent = vi.hoisted(() => vi.fn());

vi.mock("@ui/components/core/telemetry/usage-event", async (importOriginal) => ({
	...(await importOriginal<typeof import("./usage-event")>()),
	recordUsageEvent,
}));

const click = (selector: string): void => {
	document.querySelector<HTMLElement>(selector)?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
};

describe("initUsageEventLinks", () => {
	beforeAll(() => {
		initUsageEventLinks();
	});

	beforeEach(() => {
		recordUsageEvent.mockClear();
		document.body.innerHTML = "";
	});

	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("records a store link with the placement the markup names", () => {
		document.body.innerHTML =
			'<a id="play" data-usage-event="store_link_opened" data-usage-store="play" data-usage-placement="hero">play</a>';

		click("#play");

		expect(recordUsageEvent).toHaveBeenCalledWith({
			event: "store_link_opened",
			properties: { store: "play", placement: "hero" },
		});
	});

	it("records a section link", () => {
		document.body.innerHTML = '<a id="how" data-usage-event="section_navigated" data-usage-section="how">how</a>';

		click("#how");

		expect(recordUsageEvent).toHaveBeenCalledWith({ event: "section_navigated", properties: { section: "how" } });
	});

	it("finds the link from a click on a child of it", () => {
		document.body.innerHTML =
			'<a data-usage-event="section_navigated" data-usage-section="export"><span id="inner">export</span></a>';

		click("#inner");

		expect(recordUsageEvent).toHaveBeenCalledOnce();
	});

	it("ignores a click that lands on no usage link", () => {
		document.body.innerHTML = '<a id="plain" href="/contact">contact</a>';

		click("#plain");

		expect(recordUsageEvent).not.toHaveBeenCalled();
	});

	it("ignores an event name it does not know, so markup cannot invent one", () => {
		document.body.innerHTML = '<a id="odd" data-usage-event="palette_chosen" data-usage-section="how">odd</a>';

		click("#odd");

		expect(recordUsageEvent).not.toHaveBeenCalled();
	});

	it("ignores a store link whose placement is not one of the closed set", () => {
		document.body.innerHTML =
			'<a id="play" data-usage-event="store_link_opened" data-usage-store="play" data-usage-placement="torvalds">play</a>';

		click("#play");

		expect(recordUsageEvent).not.toHaveBeenCalled();
	});

	it("ignores a store link naming a store that is not one of the closed set", () => {
		document.body.innerHTML =
			'<a id="play" data-usage-event="store_link_opened" data-usage-store="torvalds" data-usage-placement="hero">play</a>';

		click("#play");

		expect(recordUsageEvent).not.toHaveBeenCalled();
	});

	it("ignores a section link naming a section that is not one of the closed set", () => {
		document.body.innerHTML = '<a id="odd" data-usage-event="section_navigated" data-usage-section="torvalds">odd</a>';

		click("#odd");

		expect(recordUsageEvent).not.toHaveBeenCalled();
	});

	it("ignores a click whose target is not an element", () => {
		document.body.innerHTML = '<a data-usage-event="section_navigated" data-usage-section="how">how</a>';

		document.dispatchEvent(new MouseEvent("click", { bubbles: true }));

		expect(recordUsageEvent).not.toHaveBeenCalled();
	});
});

describe("readUsageEventLink", () => {
	it("reads back exactly what usageEventAttributes wrote, for both shapes", () => {
		const store = { event: "store_link_opened", store: "play", placement: "footer" } as const;
		const section = { event: "section_navigated", section: "widget" } as const;
		document.body.innerHTML = "<a id='store'></a><a id='section'></a>";
		const storeLink = document.getElementById("store") as HTMLElement;
		const sectionLink = document.getElementById("section") as HTMLElement;
		for (const [name, value] of Object.entries(usageEventAttributes(store))) storeLink.setAttribute(name, value);
		for (const [name, value] of Object.entries(usageEventAttributes(section))) sectionLink.setAttribute(name, value);

		expect(readUsageEventLink(storeLink)).toEqual(store);
		expect(readUsageEventLink(sectionLink)).toEqual(section);
	});

	it("writes only the attributes the controller reads", () => {
		expect(Object.keys(usageEventAttributes({ event: "section_navigated", section: "how" }))).toEqual([
			UsageAttribute.Event,
			UsageAttribute.Section,
		]);
		expect(
			Object.keys(usageEventAttributes({ event: "store_link_opened", store: "play", placement: "header" })),
		).toEqual([UsageAttribute.Event, UsageAttribute.Store, UsageAttribute.Placement]);
	});

	it("answers null for an element carrying no usage attribute at all", () => {
		expect(readUsageEventLink(document.createElement("a"))).toBeNull();
	});
});
