import { type Failure, FailureField, FailureKind, isFailureKind } from "@domain/failures/failure";
import { CalendarFailureReason } from "../components/core/telemetry/usage-event";

const FALLBACK_CONTRIBUTION_ERROR = "something went wrong";

const INVALID_YEAR_ERROR = "invalid year";

const CONTRIBUTION_ERRORS: Record<Failure["kind"], string> = {
	[FailureKind.NotFound]: "username not found, check it and try again",
	[FailureKind.InvalidInput]: "invalid username",
	[FailureKind.Network]: "could not reach github, try again in a moment",
	[FailureKind.Parse]: "github answered, but the contribution calendar could not be read",
	[FailureKind.RateLimited]: "too many requests, try again in a moment",
	[FailureKind.Delivery]: FALLBACK_CONTRIBUTION_ERROR,
};

const KIND_BY_STATUS: Partial<Record<number, Failure["kind"]>> = {
	400: FailureKind.InvalidInput,
	404: FailureKind.NotFound,
	429: FailureKind.RateLimited,
};

const CONTRIBUTION_FAILURE_REASONS: Record<number, CalendarFailureReason> = {
	400: CalendarFailureReason.InvalidUsername,
	404: CalendarFailureReason.NotFound,
	429: CalendarFailureReason.RateLimited,
	502: CalendarFailureReason.Upstream,
};

export interface ContributionErrorParams {
	status: number;
	kind?: string | null;
	field?: string | null;
	serverMessage?: string | null;
}

export const contributionError = ({ status, kind, field, serverMessage }: ContributionErrorParams): string => {
	const named = isFailureKind(kind) ? kind : KIND_BY_STATUS[status];
	if (named === undefined) return serverMessage ?? FALLBACK_CONTRIBUTION_ERROR;
	if (named === FailureKind.InvalidInput && field === FailureField.Year) return INVALID_YEAR_ERROR;
	return CONTRIBUTION_ERRORS[named];
};

export const formatHeroError = (message: string): string => `↳ ${message}`;

export const contributionFailureReason = (status: number): CalendarFailureReason =>
	CONTRIBUTION_FAILURE_REASONS[status] ?? CalendarFailureReason.Unknown;
