import {
	recordUsageEvent,
	SiteSection,
	StoreLinkPlacement,
	StoreName,
	UsageEventName,
} from "@ui/components/core/telemetry/usage-event";

export const UsageAttribute = {
	Event: "data-usage-event",
	Store: "data-usage-store",
	Placement: "data-usage-placement",
	Section: "data-usage-section",
} as const;

export interface StoreLinkUsage {
	event: typeof UsageEventName.StoreLinkOpened;
	store: StoreName;
	placement: StoreLinkPlacement;
}

export interface SectionLinkUsage {
	event: typeof UsageEventName.SectionNavigated;
	section: SiteSection;
}

export type UsageEventLink = StoreLinkUsage | SectionLinkUsage;

export const usageEventAttributes = (link: UsageEventLink): Record<string, string> =>
	link.event === UsageEventName.StoreLinkOpened
		? {
				[UsageAttribute.Event]: link.event,
				[UsageAttribute.Store]: link.store,
				[UsageAttribute.Placement]: link.placement,
			}
		: {
				[UsageAttribute.Event]: link.event,
				[UsageAttribute.Section]: link.section,
			};

const memberOf =
	<T extends string>(members: Record<string, T>) =>
	(value: string | null): value is T =>
		value !== null && (Object.values(members) as string[]).includes(value);

const isStoreName = memberOf(StoreName);
const isStoreLinkPlacement = memberOf(StoreLinkPlacement);
const isSiteSection = memberOf(SiteSection);

export const readUsageEventLink = (element: Element): UsageEventLink | null => {
	const event = element.getAttribute(UsageAttribute.Event);
	if (event === UsageEventName.StoreLinkOpened) {
		const store = element.getAttribute(UsageAttribute.Store);
		const placement = element.getAttribute(UsageAttribute.Placement);
		return isStoreName(store) && isStoreLinkPlacement(placement) ? { event, store, placement } : null;
	}
	if (event === UsageEventName.SectionNavigated) {
		const section = element.getAttribute(UsageAttribute.Section);
		return isSiteSection(section) ? { event, section } : null;
	}
	return null;
};

const record = (link: UsageEventLink): void => {
	if (link.event === UsageEventName.StoreLinkOpened) {
		recordUsageEvent({ event: link.event, properties: { store: link.store, placement: link.placement } });
		return;
	}
	recordUsageEvent({ event: link.event, properties: { section: link.section } });
};

export function initUsageEventLinks(): void {
	document.addEventListener("click", (event) => {
		if (!(event.target instanceof Element)) return;
		const element = event.target.closest(`[${UsageAttribute.Event}]`);
		if (!element) return;
		const link = readUsageEventLink(element);
		if (link) record(link);
	});
}
