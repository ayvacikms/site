/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // !! DİKKAT: Bu satır TypeScript hataları olsa bile build almanıza izin verir.
    ignoreBuildErrors: true,
  },
  eslint: {
    // ESLint hatalarını da görmezden gelmek istersen:
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
