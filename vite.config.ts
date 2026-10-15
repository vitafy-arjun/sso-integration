import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { createPartnerAuthApiMiddleware } from './server/partner-auth-api.js'
import { requireGatewayOriginFromEnv } from './shared/gatewayOrigin.js'

function partnerAuthApiPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'partner-auth-api',
    configureServer(server) {
      server.middlewares.use(createPartnerAuthApiMiddleware(env))
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const gateway = requireGatewayOriginFromEnv(env.VITE_GATEWAY_ORIGIN)

  return {
    plugins: [react(), partnerAuthApiPlugin(env)],
    server: {
      port: 5173,
      proxy: {
        '/integrations': {
          target: gateway,
          changeOrigin: true,
        },
      },
    },
  }
})
