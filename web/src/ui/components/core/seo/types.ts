export const RobotsDirective = {
	IndexFollow: "index, follow",
	NoIndexNoFollow: "noindex, nofollow",
} as const;

export type RobotsDirective = (typeof RobotsDirective)[keyof typeof RobotsDirective];

export interface Metadata {
	title: string;
	description?: string;
	url?: string;
	image?: string;
	imageAlt?: string;
	robots?: RobotsDirective;
}
