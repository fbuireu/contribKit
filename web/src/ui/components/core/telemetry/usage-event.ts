import type { CellShape } from "@domain/value-objects/cell-shape";
import { ANALYTICS_CATEGORY } from "@ui/components/core/cookie-consent/config";
import type { ExportFormatKey } from "@ui/components/export/export-formats";
import { acceptedService } from "vanilla-cookieconsent";

export const UsageEventName = {
	CalendarRendered: "calendar_rendered",
	CalendarRenderFailed: "calendar_render_failed",
	PaletteChosen: "palette_chosen",
	CellShapeChosen: "cell_shape_chosen",
	ExportFormatChosen: "export_format_chosen",
	ExportCopied: "export_copied",
	StoreLinkOpened: "store_link_opened",
	SectionNavigated: "section_navigated",
	ThemeChanged: "theme_changed",
	ContactMessageSent: "contact_message_sent",
} as const;

export type UsageEventName = (typeof UsageEventName)[keyof typeof UsageEventName];

export const CalendarRequestSource = {
	Form: "form",
	Suggestion: "suggestion",
	Year: "year",
	History: "history",
} as const;

export type CalendarRequestSource = (typeof CalendarRequestSource)[keyof typeof CalendarRequestSource];

export const CalendarFailureReason = {
	InvalidUsername: "invalid_username",
	NotFound: "not_found",
	RateLimited: "rate_limited",
	Upstream: "upstream",
	Unreachable: "unreachable",
	Unknown: "unknown",
} as const;

export type CalendarFailureReason = (typeof CalendarFailureReason)[keyof typeof CalendarFailureReason];

export const ExportCopyOutcome = {
	Copied: "copied",
	Failed: "failed",
} as const;

export type ExportCopyOutcome = (typeof ExportCopyOutcome)[keyof typeof ExportCopyOutcome];

export const StoreName = {
	Play: "play",
} as const;

export type StoreName = (typeof StoreName)[keyof typeof StoreName];

export const StoreLinkPlacement = {
	Hero: "hero",
	Header: "header",
	Footer: "footer",
} as const;

export type StoreLinkPlacement = (typeof StoreLinkPlacement)[keyof typeof StoreLinkPlacement];

export const SiteSection = {
	How: "how",
	Custom: "custom",
	Export: "export",
	Widget: "widget",
} as const;

export type SiteSection = (typeof SiteSection)[keyof typeof SiteSection];

export const ThemeChoice = {
	Light: "light",
	Dark: "dark",
	System: "system",
} as const;

export type ThemeChoice = (typeof ThemeChoice)[keyof typeof ThemeChoice];

export const ContactMessageOutcome = {
	Sent: "sent",
	Rejected: "rejected",
	Failed: "failed",
} as const;

export type ContactMessageOutcome = (typeof ContactMessageOutcome)[keyof typeof ContactMessageOutcome];

export interface UsageEventProperties {
	[UsageEventName.CalendarRendered]: { source: CalendarRequestSource; year: number };
	[UsageEventName.CalendarRenderFailed]: { reason: CalendarFailureReason; year: number };
	[UsageEventName.PaletteChosen]: { palette: string };
	[UsageEventName.CellShapeChosen]: { cellShape: CellShape };
	[UsageEventName.ExportFormatChosen]: { format: ExportFormatKey };
	[UsageEventName.ExportCopied]: { format: ExportFormatKey; outcome: ExportCopyOutcome };
	[UsageEventName.StoreLinkOpened]: { store: StoreName; placement: StoreLinkPlacement };
	[UsageEventName.SectionNavigated]: { section: SiteSection };
	[UsageEventName.ThemeChanged]: { theme: ThemeChoice };
	[UsageEventName.ContactMessageSent]: { outcome: ContactMessageOutcome };
}

export interface RecordUsageEventParams<E extends UsageEventName> {
	event: E;
	properties: UsageEventProperties[E];
}

const GOOGLE_ANALYTICS_SERVICE = "ga4";
const BETTER_STACK_SERVICE = "betterstack";

const attempt = (send: () => void): void => {
	try {
		send();
	} catch {
		return;
	}
};

export function recordUsageEvent<E extends UsageEventName>({ event, properties }: RecordUsageEventParams<E>): void {
	if (typeof window === "undefined") return;
	attempt(() => {
		if (acceptedService(GOOGLE_ANALYTICS_SERVICE, ANALYTICS_CATEGORY)) window.gtag?.("event", event, properties);
	});
	attempt(() => {
		if (acceptedService(BETTER_STACK_SERVICE, ANALYTICS_CATEGORY)) window.betterstack?.("track", event, properties);
	});
}
