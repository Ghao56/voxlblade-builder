import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'

const basePath = process.env.VITE_BASE_PATH || '/voxlblade-builder/'

export default defineConfig({

  base: basePath,

  plugins: [
    svelte(),

    VitePWA({
      registerType: 'autoUpdate',

      manifest: {
        name:'voxlblade builder',
        short_name:'voxlbuilder',

        start_url: basePath,

        display:'standalone',

        background_color: process.env.VITE_THEME_COLOR || '#ffffff',
        theme_color: process.env.VITE_THEME_COLOR || '#ffffff',
      },

      workbox: {
        globPatterns:['**/*.{js,css,html,ico,png,svg}'],

        skipWaiting:true,
        clientsClaim:true,

        runtimeCaching:[
          {
            urlPattern:({request})=>request.mode==='navigate',
            handler:'StaleWhileRevalidate',

            options:{
              cacheName:'html-cache'
            }
          }
        ]
      }
    }),
  ],

  build:{
    rollupOptions:{
      output:{
        manualChunks:undefined
      }
    }
  }

})