import type { ContactMessage } from "@domain/value-objects/contact-message";
import { PALETTES } from "@domain/value-objects/palette";
import {
	Body,
	Button,
	Column,
	Container,
	Head,
	Heading,
	Hr,
	Html,
	Link,
	Preview,
	Row,
	Section,
	Text,
} from "@react-email/components";

export interface ContactMessageEmailProps {
	message: ContactMessage;
	sentAt: string;
	site: string;
}

const GREENS = PALETTES.github.colors.map((color) => color.hex);
const STRIP = [GREENS[1], GREENS[2], GREENS[3], GREENS[4], GREENS[3]] as const;
const BRAND = GREENS[2];
const BRAND_ON_DARK = GREENS[4];

const DARK_MODE_STYLE = `
:root { color-scheme: light dark; supported-color-schemes: light dark; }
@media (prefers-color-scheme: dark) {
  .email-bg { background-color: #0d1117 !important; }
  .email-card { background-color: #161b22 !important; border-color: #30363d !important; }
  .email-panel { background-color: #0d1117 !important; border-color: #30363d !important; }
  .email-divider { border-color: #30363d !important; }
  .email-heading { color: #e6edf3 !important; }
  .email-label { color: #8b949e !important; }
  .email-value { color: #e6edf3 !important; }
  .email-muted { color: #8b949e !important; }
  .email-link { color: ${BRAND_ON_DARK} !important; }
  .email-button { background-color: ${BRAND_ON_DARK} !important; color: #0d1117 !important; }
}
[data-ogsc] .email-bg { background-color: #0d1117 !important; }
[data-ogsc] .email-card { background-color: #161b22 !important; border-color: #30363d !important; }
[data-ogsc] .email-panel { background-color: #0d1117 !important; border-color: #30363d !important; }
[data-ogsc] .email-divider { border-color: #30363d !important; }
[data-ogsc] .email-heading { color: #e6edf3 !important; }
[data-ogsc] .email-label { color: #8b949e !important; }
[data-ogsc] .email-value { color: #e6edf3 !important; }
[data-ogsc] .email-muted { color: #8b949e !important; }
[data-ogsc] .email-link { color: ${BRAND_ON_DARK} !important; }
[data-ogsc] .email-button { background-color: ${BRAND_ON_DARK} !important; color: #0d1117 !important; }
`;

const styles = {
	body: {
		backgroundColor: "#f6f8fa",
		fontFamily: "-apple-system, 'Segoe UI', Inter, Helvetica, Arial, sans-serif",
		fontSize: "100%",
		lineHeight: 1.6,
		margin: 0,
		padding: "24px 12px",
	},
	card: {
		backgroundColor: "#ffffff",
		border: "1px solid #d0d7de",
		borderRadius: "12px",
		margin: "0 auto",
		maxWidth: "600px",
		padding: "32px",
	},
	strip: {
		margin: "0 auto 8px",
		width: "auto",
	},
	cell: {
		borderRadius: "3px",
		height: "12px",
		padding: 0,
		width: "12px",
	},
	cellGap: {
		padding: 0,
		width: "4px",
	},
	wordmark: {
		color: "#1f2328",
		fontSize: "18px",
		fontWeight: 700,
		letterSpacing: "-0.02em",
		margin: "0 0 28px",
		textAlign: "center" as const,
	},
	heading: {
		color: "#1f2328",
		fontSize: "24px",
		fontWeight: 700,
		letterSpacing: "-0.02em",
		margin: "0 0 4px",
		textAlign: "center" as const,
	},
	lede: {
		color: "#59636e",
		fontSize: "14px",
		margin: "0 0 28px",
		textAlign: "center" as const,
	},
	panel: {
		backgroundColor: "#f6f8fa",
		border: "1px solid #d0d7de",
		borderRadius: "8px",
		padding: "16px 20px",
	},
	label: {
		color: "#59636e",
		fontSize: "12px",
		fontWeight: 600,
		letterSpacing: "0.04em",
		margin: "0 0 2px",
		textTransform: "uppercase" as const,
	},
	value: {
		color: "#1f2328",
		fontSize: "15px",
		margin: "0 0 14px",
	},
	lastValue: {
		color: "#1f2328",
		fontSize: "15px",
		margin: 0,
	},
	link: {
		color: BRAND,
		textDecoration: "none",
	},
	messageLabel: {
		color: "#59636e",
		fontSize: "12px",
		fontWeight: 600,
		letterSpacing: "0.04em",
		margin: "24px 0 8px",
		textTransform: "uppercase" as const,
	},
	message: {
		color: "#1f2328",
		fontSize: "15px",
		lineHeight: 1.7,
		margin: 0,
		whiteSpace: "pre-wrap" as const,
	},
	divider: {
		borderTop: "1px solid #d0d7de",
		margin: "28px 0",
	},
	button: {
		backgroundColor: BRAND,
		borderRadius: "8px",
		color: "#ffffff",
		display: "block",
		fontSize: "15px",
		fontWeight: 600,
		padding: "12px 16px",
		textAlign: "center" as const,
		textDecoration: "none",
	},
	footer: {
		color: "#59636e",
		fontSize: "12px",
		lineHeight: 1.6,
		margin: "28px 0 0",
		textAlign: "center" as const,
	},
};

const replyHref = (message: ContactMessage): string => {
	const subject = encodeURIComponent(`Re: your message to ContribKit`);
	return `mailto:${message.email}?subject=${subject}`;
};

export const ContactMessageEmail = ({ message, sentAt, site }: ContactMessageEmailProps) => {
	const who = message.name ?? message.email;

	return (
		<Html lang="en">
			<Head>
				<meta name="color-scheme" content="light dark" />
				<meta name="supported-color-schemes" content="light dark" />
				<style>{DARK_MODE_STYLE}</style>
			</Head>
			<Preview>{`New contact message from ${who}`}</Preview>
			<Body style={styles.body} className="email-bg">
				<Container style={styles.card} className="email-card">
					<Section style={styles.strip}>
						<Row>
							{STRIP.flatMap((color, index) => [
								<Column key={color + String(index)} style={{ ...styles.cell, backgroundColor: color }} />,
								<Column key={`gap-${String(index)}`} style={styles.cellGap} />,
							])}
						</Row>
					</Section>
					<Text style={styles.wordmark} className="email-heading">
						ContribKit
					</Text>
					<Heading as="h1" style={styles.heading} className="email-heading">
						New contact message
					</Heading>
					<Text style={styles.lede} className="email-muted">
						{`${who} wrote through the contact form on ${site}`}
					</Text>
					<Section style={styles.panel} className="email-panel">
						<Text style={styles.label} className="email-label">
							Name
						</Text>
						<Text style={styles.value} className="email-value">
							{message.name ?? "(not given)"}
						</Text>
						<Text style={styles.label} className="email-label">
							Email
						</Text>
						<Text style={styles.value} className="email-value">
							<Link href={`mailto:${message.email}`} style={styles.link} className="email-link">
								{message.email}
							</Link>
						</Text>
						<Text style={styles.label} className="email-label">
							Sent
						</Text>
						<Text style={styles.lastValue} className="email-value">
							{sentAt}
						</Text>
					</Section>
					<Text style={styles.messageLabel} className="email-label">
						Message
					</Text>
					<Text style={styles.message} className="email-value">
						{message.body}
					</Text>
					<Hr style={styles.divider} className="email-divider" />
					<Button href={replyHref(message)} style={styles.button} className="email-button">
						{`Reply to ${who}`}
					</Button>
					<Text style={styles.footer} className="email-muted">
						Sent through the contact form on{" "}
						<Link href={`https://${site}/contact`} style={styles.link} className="email-link">
							{site}
						</Link>
						. Replying to this email answers the sender directly. If it looks like spam, ignore it.
					</Text>
				</Container>
			</Body>
		</Html>
	);
};
