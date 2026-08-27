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

interface BookingConfirmationProps {
  guestFirstName: string;
  guestLastName: string;
  confirmationCode: string;
  checkIn: string;
  checkOut: string;
  roomNumber: string;
  totalForStay: string;
  adults: number;
  children: number;
  specialRequests?: string;
  paymentMethod?: "CARD" | "CASH";
}

function formatHumanDate(iso: string): string {
  // `iso` is "YYYY-MM-DD". Format the date in a friendly way that does
  // not depend on the server's timezone (parse the parts explicitly).
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function BookingConfirmationTemplate(props: BookingConfirmationProps) {
  const {
    guestFirstName,
    guestLastName,
    confirmationCode,
    checkIn,
    checkOut,
    roomNumber,
    totalForStay,
    adults,
    children,
    specialRequests,
    paymentMethod,
  } = props;

  const guestLine = `${guestFirstName} ${guestLastName}`.trim();
  const guestCount = adults + children;
  const guestCountLabel =
    guestCount === 1 ? "1 guest" : `${guestCount} guests`;

  return (
    <Html>
      <Head />
      <Preview>Your booking {confirmationCode} is confirmed</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.section}>
            <Heading style={styles.heading}>HMS Booking</Heading>
            <Text style={styles.brand}>Direct booking confirmation</Text>

            <Text style={styles.text}>
              Thank you{guestLine ? `, ${guestFirstName}` : ""}! Your reservation at
              our hotel is confirmed. We&apos;ve assigned{" "}
              <strong>Room {roomNumber}</strong> to you for the dates below.
            </Text>

            <Section style={styles.codeContainer}>
              <Text style={styles.codeLabel}>Confirmation code</Text>
              <Text style={styles.code}>{confirmationCode}</Text>
            </Section>

            <Section style={styles.detailsCard}>
              <Section style={styles.detailRow}>
                <Text style={styles.detailLabel}>Check-in</Text>
                <Text style={styles.detailValue}>
                  {formatHumanDate(checkIn)}
                </Text>
              </Section>
              <Section style={styles.detailRow}>
                <Text style={styles.detailLabel}>Check-out</Text>
                <Text style={styles.detailValue}>
                  {formatHumanDate(checkOut)}
                </Text>
              </Section>
              <Section style={styles.detailRow}>
                <Text style={styles.detailLabel}>Room</Text>
                <Text style={styles.detailValue}>{roomNumber}</Text>
              </Section>
              <Section style={styles.detailRow}>
                <Text style={styles.detailLabel}>Guests</Text>
                <Text style={styles.detailValue}>
                  {guestCountLabel}
                  {children > 0 ? ` (${children} child)` : ""}
                </Text>
              </Section>
              <Section
                style={
                  paymentMethod ? styles.detailRow : styles.detailRowLast
                }>
                <Text style={styles.detailLabel}>Total for stay</Text>
                <Text style={styles.detailValue}>{totalForStay}</Text>
              </Section>
              {paymentMethod ? (
                <Section style={styles.detailRowLast}>
                  <Text style={styles.detailLabel}>Payment method</Text>
                  <Text style={styles.detailValue}>
                    {paymentMethod === "CASH"
                      ? "Cash (pay at the front desk)"
                      : "Card"}
                  </Text>
                </Section>
              ) : null}
            </Section>

            {specialRequests ? (
              <Section style={styles.notesCard}>
                <Text style={styles.detailLabel}>Special requests</Text>
                <Text style={styles.notes}>{specialRequests}</Text>
              </Section>
            ) : null}

            <Text style={styles.text}>
              Please bring a valid photo ID and arrive any time after{" "}
              <strong>3:00 PM</strong> on your check-in date. Free cancellation
              is available up to 24 hours before check-in.
            </Text>

            <Text style={styles.text}>
              We&apos;re excited to host you. If you have any questions,
              simply reply to this email.
            </Text>

            <Section style={styles.footer}>
              <Text style={styles.footerText}>
                HMS Booking — direct booking avoids third-party commissions.
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
    maxWidth: "520px",
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
  codeContainer: {
    backgroundColor: "#f0f4f8",
    borderRadius: "8px",
    margin: "24px auto",
    padding: "20px",
    maxWidth: "320px",
  },
  codeLabel: {
    color: "#6b7280",
    fontSize: "11px",
    fontWeight: "600" as const,
    letterSpacing: "2px",
    margin: "0",
    textTransform: "uppercase" as const,
    textAlign: "center" as const,
  },
  code: {
    color: "#1a2a6c",
    fontSize: "30px",
    fontWeight: "700" as const,
    letterSpacing: "4px",
    margin: "8px 0 0",
    textAlign: "center" as const,
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
  detailsCard: {
    backgroundColor: "#fafbfc",
    border: "1px solid #e6ebf1",
    borderRadius: "8px",
    margin: "24px 0",
    padding: "0",
  },
  detailRow: {
    borderBottom: "1px solid #e6ebf1",
    padding: "12px 20px",
    textAlign: "left" as const,
  },
  detailRowLast: {
    borderBottom: "none",
  },
  detailLabel: {
    color: "#6b7280",
    fontSize: "11px",
    fontWeight: "600" as const,
    letterSpacing: "1.5px",
    margin: "0",
    textTransform: "uppercase" as const,
  },
  detailValue: {
    color: "#1f2937",
    fontSize: "15px",
    fontWeight: "500" as const,
    margin: "4px 0 0",
  },
  notesCard: {
    backgroundColor: "#fafbfc",
    border: "1px solid #e6ebf1",
    borderRadius: "8px",
    margin: "16px 0",
    padding: "16px 20px",
    textAlign: "left" as const,
  },
  notes: {
    color: "#374151",
    fontSize: "14px",
    lineHeight: "20px",
    margin: "8px 0 0",
    whiteSpace: "pre-wrap" as const,
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

export default BookingConfirmationTemplate;
