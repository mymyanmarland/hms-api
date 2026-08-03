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

interface PasswordResetOtpProps {
  otpCode: string;
  userEmail: string;
}

export function PasswordResetOtpTemplate({
  otpCode,
  userEmail,
}: PasswordResetOtpProps) {
  return (
    <Html>
      <Head />
      <Preview>Your password reset code for HMS Admin</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.section}>
            <Heading style={styles.heading}>HMS Admin Password Reset</Heading>
            <Text style={styles.text}>
              We received a request to reset the password for{" "}
              <strong>{userEmail}</strong>.
            </Text>
            <Text style={styles.text}>
              Use the verification code below to set a new password. The code
              will expire in <strong>10 minutes</strong>.
            </Text>
            <Section style={styles.otpContainer}>
              <Text style={styles.otpCode}>{otpCode}</Text>
            </Section>
            <Text style={styles.text}>
              For your security, do not share this code with anyone. If you did
              not request a password reset, you can safely ignore this email.
            </Text>
            <Section style={styles.footer}>
              <Text style={styles.footerText}>
                HMS Admin Dashboard - Secure Authentication
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
  otpContainer: {
    backgroundColor: "#f0f4f8",
    borderRadius: "8px",
    margin: "24px 0",
    padding: "24px",
  },
  otpCode: {
    color: "#1a1a1a",
    fontSize: "36px",
    fontWeight: "700" as const,
    letterSpacing: "8px",
    margin: "0",
    textAlign: "center" as const,
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

export default PasswordResetOtpTemplate;