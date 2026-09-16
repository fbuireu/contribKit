import type { ContributionCalendar } from "../entities/types";
import type { Failure } from "../failures/failure";
import type { ContactMessage } from "../value-objects/contact-message";
import type { Username } from "../value-objects/username";
import type { Year } from "../value-objects/year";

export interface FetchCalendarParams {
	readonly username: Username;
	readonly year: Year | null;
}

export interface ContributionRepository {
	readonly fetchCalendar: (params: FetchCalendarParams) => Promise<ContributionCalendar | Failure>;
}

export interface ContactMessageRepository {
	readonly deliver: (message: ContactMessage) => Promise<ContactMessage | Failure>;
}
