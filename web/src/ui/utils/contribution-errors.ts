const CONTRIBUTION_ERRORS: Record<number, string> = {
	400: "invalid username",
	404: "user not found — check the username and try again",
	502: "could not reach github, try again in a moment",
};

const FALLBACK_CONTRIBUTION_ERROR = "something went wrong";

export interface ContributionErrorParams {
	status: number;
	serverMessage?: string | null;
}

export const contributionError = ({ status, serverMessage }: ContributionErrorParams): string =>
	CONTRIBUTION_ERRORS[status] ?? serverMessage ?? FALLBACK_CONTRIBUTION_ERROR;

export const formatHeroError = (message: string): string => `↳ ${message}`;
