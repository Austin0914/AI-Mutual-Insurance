/** @type {import('next').NextConfig} */
const nextConfig = {
  // @ai-insurance/abi 為 workspace 套件，交由 Next 一併編譯。
  transpilePackages: ['@ai-insurance/abi'],
  webpack(config) {
    // wagmi's connector barrel exposes MetaMask SDK, which probes this optional
    // React Native dependency during bundling. Browser injected-wallet flows do
    // not use it, so mark it unavailable to keep builds quiet.
    config.resolve.alias['@react-native-async-storage/async-storage'] = false
    return config
  },
}

export default nextConfig
