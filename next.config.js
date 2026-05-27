/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_D1_NAME: process.env.DAUGHTER_1_NAME || 'Daughter 1',
    NEXT_PUBLIC_D2_NAME: process.env.DAUGHTER_2_NAME || 'Daughter 2',
  },
}

module.exports = nextConfig
