import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { getSession } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  return (
    <>
      <Nav variant={session.wallet ? "dashboard" : "public"} />
      <div className="min-h-[calc(100vh-58px-180px)]">{children}</div>
      <Footer />
    </>
  );
}
