import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface UserInviteEmailProps {
  userName: string;
  userEmail: string;
  temporaryPassword: string;
  loginUrl: string;
}

export function UserInviteTemplate({
  userName,
  userEmail,
  temporaryPassword,
  loginUrl,
}: UserInviteEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your HMS account is ready</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.section}>
            <Heading style={styles.heading}>Welcome to HMS</Heading>
            <Text style={styles.text}>
              Hi <strong>{userName}</strong>,
            </Text>
            <Text style={styles.text}>
              An HMS administrator has created an account for you at{" "}
              <strong>{userEmail}</strong>. Use the credentials below to sign in
              to the HMS mobile app for the first time.
            </Text>
            <Section style={styles.credentialsBox}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{userEmail}</Text>
              <Text style={styles.label}>Temporary password</Text>
              <Text style={styles.passwordValue}>{temporaryPassword}</Text>
            </Section>
            <Section style={styles.ctaContainer}>
              <Text style={styles.ctaLink}>{loginUrl}</Text>
            </Section>
            <Text style={styles.text}>
              For your security, please change this password immediately after
              signing in and do not share it with anyone.
            </Text>
            <Section style={styles.footer}>
              <Text style={styles.footerText}>
                HMS - Hospitality Management System
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    backgroundColor: "#f6f9fc",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  container: {
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
    margin: "40px auto",
    maxWidth: "480px",
    padding: "40px",
  },
  section: {
    textAlign: "center" as const,
  },
  heading: {
    color: "#1a1a1a",
    fontSize: "24px",
    fontWeight: "600" as const,
    margin: "0 0 24px",
    padding: "0",
  },
  text: {
    color: "#4a4a4a",
    fontSize: "16px",
    lineHeight: "24px",
    margin: "16px 0",
    textAlign: "left" as const,
  },
  credentialsBox: {
    backgroundColor: "#f0f4f8",
    borderRadius: "8px",
    margin: "24px 0",
    padding: "20px",
    textAlign: "left" as const,
  },
  label: {
    color: "#6b7280",
    fontSize: "12px",
    fontWeight: "600" as const,
    letterSpacing: "1px",
    margin: "0 0 4px",
    textTransform: "uppercase" as const,
  },
  value: {
    color: "#1a1a1a",
    fontSize: "16px",
    margin: "0 0 16px",
  },
  passwordValue: {
    color: "#1a1a1a",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: "20px",
    letterSpacing: "2px",
    margin: "0",
  },
  ctaContainer: {
    backgroundColor: "#eef2ff",
    borderRadius: "8px",
    margin: "16px 0",
    padding: "12px 16px",
  },
  ctaLink: {
    color: "#1d4ed8",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: "14px",
    margin: "0",
    wordBreak: "break-all" as const,
  },
  footer: {
    borderTop: "1px solid #e6ebf1",
    marginTop: "32px",
    paddingTop: "24px",
  },
  footerText: {
    color: "#8898aa",
    fontSize: "12px",
    margin: "0",
    textAlign: "center" as const,
  },
};

export default UserInviteTemplate;
