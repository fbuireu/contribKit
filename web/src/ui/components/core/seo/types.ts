export const RobotsDirective = {
	IndexFollow: "index, follow",
	NoIndex: "noindex",
	NoIndexNoFollow: "noindex, nofollow",
	NoFollow: "nofollow",
} as const;

export type RobotsDirective = (typeof RobotsDirective)[keyof typeof RobotsDirective];

export const OgType = {
	Website: "website",
	Article: "article",
} as const;

export type OgType = (typeof OgType)[keyof typeof OgType];

export interface Metadata {
	title: string;
	description?: string;
	url?: string;
	image?: string;
	imageAlt?: string;
	robots?: RobotsDirective;
	type?: OgType;
}
