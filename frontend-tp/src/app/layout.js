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


// Set data-theme sebelum paint pertama, biar tidak ada kedipan
// (render light dulu lalu lompat ke dark) saat user sudah pernah pilih dark mode.
const themeInitScript = `(function(){try{var t=localStorage.getItem('theme-mode');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600;700&family=Roboto:wght@300;400;500;700&family=Montserrat:wght@300;400;500;600;700&family=Open+Sans:wght@300;400;500;600;700&family=Lato:wght@300;400;700&family=Courier+Prime&family=Anton&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <WebSocketErrorHandler />
        {children}
        <ToasterProvider />
      </body>
    </html>
  );
}
