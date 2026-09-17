export interface BuildMimeMessageParams {
	from: string;
	to: string;
	replyTo: string;
	subject: string;
	text: string;
	html: string;
	date: Date;
	messageId: string;
	boundary: string;
}

const CRLF = "\r\n";
const BASE64_LINE = /.{1,76}/g;
const HEADER_BREAK = /[\r\n]+/g;
const BOUNDARY_UNSAFE = /[^A-Za-z0-9'()+_,\-./:=?]/g;

const withoutHeaderBreaks = (value: string): string => value.replace(HEADER_BREAK, " ");

const base64Of = (value: string): string =>
	btoa(Array.from(new TextEncoder().encode(value), (byte) => String.fromCharCode(byte)).join(""));

const encodedWord = (value: string): string => `=?UTF-8?B?${base64Of(value)}?=`;

const foldedBase64 = (value: string): string => (value.match(BASE64_LINE) ?? []).join(CRLF);

interface PartParams {
	contentType: string;
	content: string;
}

const part = ({ contentType, content }: PartParams): string =>
	[
		`Content-Type: ${contentType}; charset=utf-8`,
		"Content-Transfer-Encoding: base64",
		"",
		foldedBase64(base64Of(content)),
	].join(CRLF);

export const buildMimeMessage = ({
	from,
	to,
	replyTo,
	subject,
	text,
	html,
	date,
	messageId,
	boundary,
}: BuildMimeMessageParams): string => {
	const safeBoundary = boundary.replace(BOUNDARY_UNSAFE, "");
	const headers: readonly (readonly [string, string])[] = [
		["From", withoutHeaderBreaks(from)],
		["To", withoutHeaderBreaks(to)],
		["Reply-To", withoutHeaderBreaks(replyTo)],
		["Subject", encodedWord(withoutHeaderBreaks(subject))],
		["Date", date.toUTCString()],
		["Message-ID", withoutHeaderBreaks(messageId)],
		["MIME-Version", "1.0"],
		["Content-Type", `multipart/alternative; boundary="${safeBoundary}"`],
	];
	const head = headers.map(([name, value]) => `${name}: ${value}`).join(CRLF);
	const body = [
		`--${safeBoundary}`,
		part({ contentType: "text/plain", content: text }),
		`--${safeBoundary}`,
		part({ contentType: "text/html", content: html }),
		`--${safeBoundary}--`,
	].join(CRLF);

	return `${head}${CRLF}${CRLF}${body}${CRLF}`;
};
