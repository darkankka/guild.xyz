import { Chains } from "chains"
import useUser from "components/[guild]/hooks/useUser"
import delegateRegistryAbi from "static/abis/delegateRegistry"
import { useContractReads } from "wagmi"

enum DelegationType {
  NONE,
  ALL,
  CONTRACT,
  TOKEN,
}

// https://docs.delegate.cash/delegatecash/technical-documentation/delegation-registry/contract-addresses
const delegateAddresses = {
  [Chains.ETHEREUM]: "0x00000000000000447e69651d841bd8d104bed493",
  [Chains.ARBITRUM]: "0x00000000000000447e69651d841bd8d104bed493",
  [Chains.NOVA]: "0x00000000000000447e69651d841bd8d104bed493",
  [Chains.AVALANCHE]: "0x00000000000000447e69651d841bd8d104bed493",
  [Chains.BASE_MAINNET]: "0x00000000000000447e69651d841bd8d104bed493",
  [Chains.BSC]: "0x00000000000000447e69651d841bd8d104bed493",
  [Chains.CELO]: "0x00000000000000447e69651d841bd8d104bed493",
  [Chains.FANTOM]: "0x00000000000000447e69651d841bd8d104bed493",
  [Chains.GNOSIS]: "0x00000000000000447e69651d841bd8d104bed493",
  [Chains.LINEA]: "0x00000000000000447e69651d841bd8d104bed493",
  [Chains.MOONBEAM]: "0x00000000000000447e69651d841bd8d104bed493",
  [Chains.MOONRIVER]: "0x00000000000000447e69651d841bd8d104bed493",
  [Chains.OPTIMISM]: "0x00000000000000447e69651d841bd8d104bed493",
  [Chains.POLYGON]: "0x00000000000000447e69651d841bd8d104bed493",
  [Chains.POLYGON_ZKEVM]: "0x00000000000000447e69651d841bd8d104bed493",
  [Chains.ZORA]: "0x00000000000000447e69651d841bd8d104bed493",
  [Chains.GOERLI]: "0x00000000000000447e69651d841bd8d104bed493",
  [Chains.SEPOLIA]: "0x00000000000000447e69651d841bd8d104bed493",
} as const

// address for testing: 0xaaf3a70b7bcd9d0c20213981d91042683bd215f0 (should return "0x82407168ca396e800e55c8667af2a7516c5140dd" vault on Goerli)
const useDelegateVaults = () => {
  const { id, addresses } = useUser()

  const enabled = typeof id === "number" && Array.isArray(addresses)

  const delegateContracts = Object.entries(delegateAddresses).map(
    ([chainId, contractAddress]) => ({
      abi: delegateRegistryAbi,
      address: contractAddress,
      chainId: Number(chainId),
      functionName: "getIncomingDelegations",
    })
  )

  const delegates = addresses?.map(({ address }) => address)

  const { data } = useContractReads({
    contracts: delegates
      ?.map((delegate) =>
        delegateContracts.map((contract) => ({ ...contract, args: [delegate] }))
      )
      .flat(),
    enabled,
  })

  const results = data
    ?.filter((res) => res.status === "success")
    .flatMap((res) => res.result) as {
    contract_: `0x${string}`
    from: `0x${string}`
    type_: DelegationType
    tokenId: bigint
    to: `0x${string}`
  }[]

  const alreadyLinkedAddresses = new Set(delegates ?? [])

  const unlinked = results
    ?.filter(
      (res) =>
        res.type_ === DelegationType.ALL &&
        !alreadyLinkedAddresses.has(res.from.toLowerCase() as `0x${string}`)
    )
    .map((res) => res.from)
    .filter(Boolean)

  return unlinked
}

export default useDelegateVaults
