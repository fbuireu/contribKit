export type RobotsDirective = "index, follow" | "noindex" | "noindex, nofollow" | "nofollow";

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
