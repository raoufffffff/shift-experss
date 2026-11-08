import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import viteCompression from 'vite-plugin-compression'

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'

  return {
    plugins: [
      react(),
      viteCompression(),
      {
        name: 'html-transform',
        transformIndexHtml(html) {
          const connectSrc = isProduction
            ? "'self' https://api.shift.express https://*.supabase.co https://api.stripe.com wss://*.supabase.co https://o4510165797568512.ingest.de.sentry.io https://api-adresse.data.gouv.fr https://photon.komoot.io"
            : "'self' http://localhost:3001 https://api.shift.express https://*.supabase.co https://api.stripe.com wss://*.supabase.co https://o4510165797568512.ingest.de.sentry.io https://api-adresse.data.gouv.fr https://photon.komoot.io"

          const scriptSrc = isProduction
            ? "'self' 'unsafe-inline' https://js.stripe.com blob:"
            : "'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com blob:"

          return html.replace(
            '<head>',
            `<head>
              <meta http-equiv="Content-Security-Policy" content="
                default-src 'self';
                script-src ${scriptSrc};
                style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
                style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com;
                img-src 'self' data: https: https://*.supabase.co;
                font-src 'self' data: https://fonts.gstatic.com;
                connect-src ${connectSrc};
                worker-src 'self' blob:;
                child-src 'self' blob:;
                frame-src https://js.stripe.com;
              ">
            `
          );
        },
      },
    ],
    // 🔐 SECURITY: Remove console.* in production builds
    esbuild: {
      drop: isProduction ? ['console', 'debugger'] : [],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@shared': path.resolve(__dirname, '../../packages/shared/src'),
        '@shift-express/shared': path.resolve(__dirname, '../../packages/shared/src'),
      },
      dedupe: ['react', 'react-dom'],
    },
    server: {
      port: 5173,
      open: true,
    },
  };
});
