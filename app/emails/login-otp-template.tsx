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

interface LoginOtpProps {
  otpCode: string;
  userEmail: string;
}

export function LoginOtpTemplate({ otpCode, userEmail }: LoginOtpProps) {
  return (
    <Html>
      <Head />
      <Preview>Your HMS Booking login code</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.section}>
            <Heading style={styles.heading}>HMS Booking</Heading>
            <Text style={styles.brand}>Sign in to your account</Text>
            <Text style={styles.text}>
              You requested a login verification code for{" "}
              <strong>{userEmail}</strong>.
            </Text>
            <Text style={styles.text}>Enter this code in the app to sign in:</Text>
            <Section style={styles.otpContainer}>
              <Text style={styles.otpCode}>{otpCode}</Text>
            </Section>
            <Text style={styles.text}>
              This code will expire in <strong>10 minutes</strong>.
            </Text>
            <Text style={styles.warning}>
              If you did not request this code, please ignore this email and
              ensure your account is secure.
            </Text>
            <Section style={styles.footer}>
              <Text style={styles.footerText}>
                HMS Booking - Secure Authentication
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
    color: "#1a2a6c",
    fontSize: "26px",
    fontWeight: "700" as const,
    margin: "0 0 4px",
    padding: "0",
    letterSpacing: "0.5px",
  },
  brand: {
    color: "#6b7280",
    fontSize: "14px",
    fontWeight: "500" as const,
    margin: "0 0 24px",
    textTransform: "uppercase" as const,
    letterSpacing: "2px",
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
    color: "#1a2a6c",
    fontSize: "40px",
    fontWeight: "700" as const,
    letterSpacing: "10px",
    margin: "0",
    textAlign: "center" as const,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
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

export default LoginOtpTemplate;