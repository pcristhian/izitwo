import "./globals.css";

export const metadata = {
  title: "Sistema Chidoris",
  description: "No sabia que poner",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        {children}
      </body>
    </html>
  );
}
