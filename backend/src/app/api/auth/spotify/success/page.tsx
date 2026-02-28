export default function SuccessPage({
    searchParams,
  }: {
    searchParams: { [key: string]: string };
  }) {
    const query = new URLSearchParams(searchParams).toString();
    const deepLink = `exp://10.4.151.47:8081?${query}`;
  
    return (
      <html>
        <head>
          <meta httpEquiv="refresh" content={`0;url=${deepLink}`} />
        </head>
        <body>
          <script
            dangerouslySetInnerHTML={{
              __html: `window.location.href = "${deepLink}";`,
            }}
          />
          <p>Redirecting back to app...</p>
          <a href="${deepLink}">Tap here if not redirected</a>
        </body>
      </html>
    );
  }