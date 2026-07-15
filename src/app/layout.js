import ToasterProvider from "@/components/ToasterProvider";
import WebSocketErrorHandler from "@/components/WebSocketErrorHandler";
import "./globals.css";

export const metadata = {
  title: "One Dashboard",
  description: "Dashboard system for multi-role access",
  icons: {
    icon: [
      { url: "/assets/icon.png", type: "image/png" },
    ],
  },
};


export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600;700&family=Roboto:wght@300;400;500;700&family=Montserrat:wght@300;400;500;600;700&family=Open+Sans:wght@300;400;500;600;700&family=Lato:wght@300;400;700&family=Courier+Prime&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <WebSocketErrorHandler />
        {children}
        <ToasterProvider />
      </body>
    </html>
  );
}
