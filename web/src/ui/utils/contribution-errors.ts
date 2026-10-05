import { type Failure, FailureField, FailureKind, isFailureKind } from "@domain/failures/failure";
import { CalendarFailureReason } from "../components/core/telemetry/usage-event";

const FALLBACK_CONTRIBUTION_ERROR = "something went wrong";

const INVALID_YEAR_ERROR = "invalid year";

const CONTRIBUTION_ERRORS: Record<Failure["kind"], string> = {
	[FailureKind.NotFound]: "username not found, check it and try again",
	[FailureKind.InvalidInput]: "invalid username",
	[FailureKind.Network]: "could not reach github, try again in a moment",
	[FailureKind.Upstream]: "github could not serve the calendar, try again in a moment",
	[FailureKind.Parse]: "github answered, but the contribution calendar could not be read",
	[FailureKind.RateLimited]: "too many requests, try again in a moment",
	[FailureKind.Delivery]: FALLBACK_CONTRIBUTION_ERROR,
};

const KIND_BY_STATUS: Partial<Record<number, Failure["kind"]>> = {
	400: FailureKind.InvalidInput,
	404: FailureKind.NotFound,
	429: FailureKind.RateLimited,
};

const CONTRIBUTION_FAILURE_REASONS: Record<Failure["kind"], CalendarFailureReason> = {
	[FailureKind.NotFound]: CalendarFailureReason.NotFound,
	[FailureKind.InvalidInput]: CalendarFailureReason.InvalidUsername,
	[FailureKind.Network]: CalendarFailureReason.Upstream,
	[FailureKind.Upstream]: CalendarFailureReason.Upstream,
	[FailureKind.Parse]: CalendarFailureReason.Upstream,
	[FailureKind.RateLimited]: CalendarFailureReason.RateLimited,
	[FailureKind.Delivery]: CalendarFailureReason.Unknown,
};

const BAD_GATEWAY_STATUS = 502;

const reasonOfUnnamedFailure = (status: number): CalendarFailureReason =>
	status === BAD_GATEWAY_STATUS ? CalendarFailureReason.Upstream : CalendarFailureReason.Unknown;

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

export interface ContributionFailureReasonParams {
	status: number;
	kind?: string | null;
	field?: string | null;
}

export const contributionFailureReason = ({
	status,
	kind,
	field,
}: ContributionFailureReasonParams): CalendarFailureReason => {
	const named = isFailureKind(kind) ? kind : KIND_BY_STATUS[status];
	if (named === undefined) return reasonOfUnnamedFailure(status);
	if (named === FailureKind.InvalidInput && field === FailureField.Year) return CalendarFailureReason.InvalidYear;
	return CONTRIBUTION_FAILURE_REASONS[named];
};
