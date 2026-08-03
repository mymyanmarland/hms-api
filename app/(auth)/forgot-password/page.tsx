import { ForgotPasswordForm } from "./_components/forgot-password-form";

export const metadata = {
  title: "Forgot Password - HMS Admin",
  description: "Reset your HMS Admin account password",
};

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <ForgotPasswordForm />
    </div>
  );
}