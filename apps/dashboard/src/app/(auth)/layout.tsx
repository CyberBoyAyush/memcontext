import { AuthHeader } from "@/components/auth-header";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background dark">
      <AuthHeader />
      {children}
    </div>
  );
}
