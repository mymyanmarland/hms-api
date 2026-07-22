import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface OtpEmailProps {
  otpCode: string;
  userEmail: string;
}

export function OtpEmailTemplate({ otpCode, userEmail }: OtpEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your verification code for HMS Admin Login</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.section}>
            <Heading style={styles.heading}>HMS Admin Login</Heading>
            <Text style={styles.text}>
              You requested a login verification code for <strong>{userEmail}</strong>.
            </Text>
            <Text style={styles.text}>Your verification code is:</Text>
            <Section style={styles.otpContainer}>
              <Text style={styles.otpCode}>{otpCode}</Text>
            </Section>
            <Text style={styles.text}>
              This code will expire in <strong>10 minutes</strong>.
            </Text>
            <Text style={styles.warning}>
              If you did not request this code, please ignore this email and ensure
              your account is secure.
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
  warning: {
    color: "#666666",
    fontSize: "14px",
    lineHeight: "20px",
    margin: "24px 0 0",
    textAlign: "left" as const,
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

export default OtpEmailTemplate;
