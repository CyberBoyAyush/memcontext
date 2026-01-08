import { AuthHeader } from "@/components/auth-header";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0a0a0a" }}>
      <AuthHeader />
      {children}
    </div>
  );
}
