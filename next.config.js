/** @type {import('next').NextConfig} */
module.exports = {
    reactStrictMode: true,
    swcMinify: true,
    // The demo carries no ESLint setup of its own; the main repository does the linting.
    eslint: {
        ignoreDuringBuilds: true
    }
};
