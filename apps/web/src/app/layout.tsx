export const metadata = {
  title: "FootballTerror",
  description: "AI-native football intelligence platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ background: "#0a0a0a", color: "#e5e5e5" }}>{children}</body>
    </html>
  );
}
