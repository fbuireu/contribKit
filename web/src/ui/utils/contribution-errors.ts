import { CalendarFailureReason } from "@ui/components/core/telemetry/usage-event";

const CONTRIBUTION_ERRORS: Record<number, string> = {
	400: "invalid username",
	404: "user not found, check the username and try again",
	429: "too many requests, try again in a moment",
	502: "could not reach github, try again in a moment",
};

const FALLBACK_CONTRIBUTION_ERROR = "something went wrong";

const CONTRIBUTION_FAILURE_REASONS: Record<number, CalendarFailureReason> = {
	400: CalendarFailureReason.InvalidUsername,
	404: CalendarFailureReason.NotFound,
	429: CalendarFailureReason.RateLimited,
	502: CalendarFailureReason.Upstream,
};

export interface ContributionErrorParams {
	status: number;
	serverMessage?: string | null;
}

export const contributionError = ({ status, serverMessage }: ContributionErrorParams): string =>
	CONTRIBUTION_ERRORS[status] ?? serverMessage ?? FALLBACK_CONTRIBUTION_ERROR;

export const formatHeroError = (message: string): string => `↳ ${message}`;

export const contributionFailureReason = (status: number): CalendarFailureReason =>
	CONTRIBUTION_FAILURE_REASONS[status] ?? CalendarFailureReason.Unknown;
