/** @type {import('next').NextConfig} */
export default {
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
};
