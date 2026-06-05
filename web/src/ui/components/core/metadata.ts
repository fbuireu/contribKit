export type RobotsDirective = "index, follow" | "noindex" | "noindex, nofollow" | "nofollow";

export interface Metadata {
	title: string;
	description?: string;
	url?: string;
	image?: string;
	imageAlt?: string;
	robots?: RobotsDirective;
	type?: "website" | "article";
}
