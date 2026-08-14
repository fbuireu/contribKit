import { DEFAULT_USERNAME, isUsername, parseUsername } from "@domain/value-objects/username";

export const DaySource = {
	Loaded: "loaded",
	Empty: "empty",
	Placeholder: "placeholder",
} as const;

export type DaySource = (typeof DaySource)[keyof typeof DaySource];

const CACHE_CONTROL_EXPLICIT = "private, max-age=3600, stale-while-revalidate=86400";
const CACHE_CONTROL_DEFAULT = "private, no-store";

export interface ResolveViewerIdentityParams {
	requestedUsername?: string | null;
	savedUsername?: string | null;
}

export interface ViewerIdentity {
	username: string;
	isExplicit: boolean;
	cacheControl: string;
}

const asUsername = (raw?: string | null): string | undefined => {
	const trimmed = raw?.trim();
	if (!trimmed) return undefined;
	const parsed = parseUsername(trimmed);
	return isUsername(parsed) ? parsed.value : undefined;
};

export const resolveViewerIdentity = ({
	requestedUsername,
	savedUsername,
}: ResolveViewerIdentityParams): ViewerIdentity => {
	const requested = asUsername(requestedUsername);
	const saved = asUsername(savedUsername);
	const chosen = requested ?? saved;

	return {
		username: chosen ?? DEFAULT_USERNAME,
		isExplicit: chosen !== undefined,
		cacheControl: chosen === undefined ? CACHE_CONTROL_DEFAULT : CACHE_CONTROL_EXPLICIT,
	};
};

export interface DaySourceForParams {
	loaded: boolean;
	isExplicit: boolean;
}

export const daySourceFor = ({ loaded, isExplicit }: DaySourceForParams): DaySource => {
	if (loaded) return DaySource.Loaded;
	return isExplicit ? DaySource.Empty : DaySource.Placeholder;
};
