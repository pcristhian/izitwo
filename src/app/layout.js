import "./globals.css";

export const metadata = {
  title: "IZI 2 ajaj",
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
