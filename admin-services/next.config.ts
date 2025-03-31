import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Enable React strict mode for better development experience
    reactStrictMode: true,
    output: 'standalone',
  
    // Configure image domains if needed for document previews
    images: {
      domains: [],
    },
    
    // Extend webpack config for document handling
    webpack: (config, { isServer }) => {
      // Add support for importing large document files
      config.module.rules.push({
        test: /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[hash].[ext]',
              publicPath: `/_next/static/files/`,
              outputPath: `${isServer ? '../' : ''}static/files/`,
            },
          },
        ],
      });
      
      return config;
    },
    
    // Control serverless function timeout for large document processing
    serverRuntimeConfig: {
      // Private config that is only available on the server
      documentUploadMaxSize: process.env.DOCUMENT_UPLOAD_MAX_SIZE || '20mb',
    },
    
    // Public runtime config (available on both client and server)
    publicRuntimeConfig: {
      // Config for public consumption
      documentSupportedTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/markdown',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ],
    },
    
    // Use app directory for the new React server components
    experimental: {
      // This is no longer experimental in newer Next.js versions
      // but including it for compatibility with older versions
      
      // Increase serverComponents body size limit for document uploads
      serverComponentsExternalPackages: [],
      serverActions: {
        bodySizeLimit: '20mb',
      },
    },
    
    // Configure headers for proper document handling
    async headers() {
      return [
        {
          // Apply to document specific routes
          source: '/api/documents/:path*',
          headers: [
            {
              key: 'Cache-Control',
              value: 'no-store, max-age=0',
            },
          ],
        },
      ];
    },
  };


export default nextConfig;
