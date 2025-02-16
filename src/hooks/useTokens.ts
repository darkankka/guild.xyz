import { CHAIN_CONFIG, Chain, Chains } from "chains"
import useSWRImmutable from "swr/immutable"
import { CoingeckoToken } from "types"
import fetcher from "utils/fetcher"
import { NULL_ADDRESS } from "utils/guildCheckout/constants"

export const TokenApiURLs: Record<Chain, string[]> = {
  ETHEREUM: ["https://tokens.coingecko.com/uniswap/all.json"],
  BSC: ["https://tokens.coingecko.com/binance-smart-chain/all.json"],
  GNOSIS: [
    "https://unpkg.com/@1hive/default-token-list@5.17.1/build/honeyswap-default.tokenlist.json",
  ],
  POLYGON: [
    "https://unpkg.com/quickswap-default-token-list@1.0.91/build/quickswap-default.tokenlist.json",
  ],
  POLYGON_ZKEVM: [],
  AVALANCHE: ["https://tokens.coingecko.com/avalanche/all.json"],
  FANTOM: ["https://tokens.coingecko.com/fantom/all.json"],
  ARBITRUM: ["https://tokens.coingecko.com/arbitrum-one/all.json"],
  NOVA: ["https://tokens.coingecko.com/arbitrum-nova/all.json"],
  CELO: [
    "https://raw.githubusercontent.com/Ubeswap/default-token-list/master/ubeswap.token-list.json",
  ],
  HARMONY: [
    "https://raw.githubusercontent.com/DefiKingdoms/community-token-list/main/src/defikingdoms-default.tokenlist.json",
    "https://raw.githubusercontent.com/DefiKingdoms/community-token-list/main/build/defikingdoms-community.tokenlist.json",
  ],
  ZETACHAIN_ATHENS: [],
  SCROLL_ALPHA: [],
  SCROLL_SEPOLIA: [],
  SCROLL: ["https://tokens.coingecko.com/scroll/all.json"],
  ZKSYNC_ERA: [],
  SEPOLIA: [],
  GOERLI: [
    "https://raw.githubusercontent.com/Uniswap/default-token-list/main/src/tokens/goerli.json",
  ],
  OPTIMISM: ["https://static.optimism.io/optimism.tokenlist.json"],
  MOONRIVER: ["https://tokens.coingecko.com/moonriver/all.json"],
  MOONBEAM: ["https://tokens.coingecko.com/moonbeam/all.json"],
  METIS: ["https://tokens.coingecko.com/metis-andromeda/all.json"],
  CRONOS: ["https://tokens.coingecko.com/cronos/all.json"],
  BOBA: ["https://tokens.coingecko.com/boba/all.json"],
  BOBA_AVAX: ["https://tokens.coingecko.com/boba/all.json"],
  PALM: [],
  BASE_GOERLI: [],
  EXOSAMA: [],
  EVMOS: ["https://tokens.coingecko.com/evmos/all.json"],
  POLYGON_MUMBAI: [],
  BASE_MAINNET: [],
  ZORA: [],
  PGN: [],
  NEON_EVM: [],
  LINEA: [],
  LUKSO: [],
  MANTLE: [],
  RONIN: [],
  SHIMMER: [],
  KAVA: [],
  BITFINITY_TESTNET: [],
  X1_TESTNET: [],
  ONTOLOGY: [],
  BERA_TESTNET: [],
  MANTA: [],
  TAIKO_KATLA: [],
}

const fetchTokens = async ([_, chain]) =>
  Promise.all(TokenApiURLs[chain].map((url) => fetcher(url))).then(
    (tokenArrays: any) => {
      const finalTokenArray = tokenArrays.reduce(
        (acc, curr) =>
          acc.concat(
            (Array.isArray(curr) ? curr : curr?.tokens)?.filter(
              ({ chainId }) => chainId === Chains[chain]
            )
          ),
        []
      )
      return CHAIN_CONFIG[chain]
        ? [
            {
              ...CHAIN_CONFIG[chain].nativeCurrency,
              logoURI: CHAIN_CONFIG[chain].iconUrl,
              address: NULL_ADDRESS,
            },
          ].concat(finalTokenArray)
        : finalTokenArray
    }
  )

const useTokens = (chain: string) => {
  const { isLoading, data } = useSWRImmutable<Array<CoingeckoToken>>(
    chain ? ["tokens", chain] : null,
    fetchTokens
  )

  return { tokens: data, isLoading }
}

export default useTokens
