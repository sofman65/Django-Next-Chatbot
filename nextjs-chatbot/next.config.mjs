// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
        return [
            {
                source: '/api/:path*',                  // match “/api/…”
                destination: 'http://localhost:8000/api/:path*', // forward to Django
            },
        ]
    },
}

export default nextConfig
