import { Chains } from "chains"
import useGuild from "components/[guild]/hooks/useGuild"
import { usePostHogContext } from "components/_app/PostHogProvider"
import useShowErrorToast from "hooks/useShowErrorToast"

import useMembershipUpdate from "components/[guild]/JoinModal/hooks/useMembershipUpdate"
import useSubmit from "hooks/useSubmit"
import { useToastWithTweetButton } from "hooks/useToast"
import useUsersGuildPins from "hooks/useUsersGuildPins"
import { useState } from "react"
import guildPinAbi from "static/abis/guildPin"
import { GuildPinMetadata } from "types"
import base64ToObject from "utils/base64ToObject"
import fetcher from "utils/fetcher"
import getEventsFromViemTxReceipt from "utils/getEventsFromViemTxReceipt"
import { GUILD_PIN_CONTRACTS } from "utils/guildCheckout/constants"
import processViemContractError from "utils/processViemContractError"
import { TransactionReceipt } from "viem"
import { useAccount, useChainId, usePublicClient, useWalletClient } from "wagmi"
import { GuildAction, useMintGuildPinContext } from "../MintGuildPinContext"
import { useTransactionStatusContext } from "../components/TransactionStatusContext"
import useGuildPinFee from "./useGuildPinFee"

type MintData = {
  userAddress: `0x${string}`
  guildAction: GuildAction
  userId: number
  guildId: number
  guildName: string
  createdAt: number
  adminTreasury: `0x${string}`
  adminFee: string
  timestamp: number
  cid: string
  chainId: number
  contractAddress: `0x${string}`
  signature: `0x${string}`
}

const useMintGuildPin = () => {
  const { captureEvent } = usePostHogContext()
  const { id, name, urlName, roles } = useGuild()
  const postHogOptions = { guild: urlName }

  const { mutate } = useUsersGuildPins()

  const toastWithTweetButton = useToastWithTweetButton()
  const showErrorToast = useShowErrorToast()

  const { address } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const { pinType, setMintedTokenId } = useMintGuildPinContext()
  const { setTxHash, setTxError, setTxSuccess } = useTransactionStatusContext() ?? {}

  const [loadingText, setLoadingText] = useState<string>("")

  const contractAddress = GUILD_PIN_CONTRACTS[Chains[chainId]]?.address

  const { guildPinFee } = useGuildPinFee()

  const { triggerMembershipUpdate } = useMembershipUpdate()

  const mintGuildPin = async () => {
    setTxError?.(false)
    setTxSuccess?.(false)

    setLoadingText("Uploading metadata")
    const {
      userAddress,
      guildAction,
      userId,
      guildId,
      guildName,
      createdAt,
      adminTreasury,
      adminFee,
      timestamp,
      cid,
      signature,
    }: MintData = await fetcher(`/v2/guilds/${id}/pin`, {
      body: {
        userAddress: address,
        guildId: id,
        guildAction: pinType,
        chainId,
        contractAddress,
      },
    })

    setLoadingText("Check your wallet")
    // params: paytoken address, { receiver address, guildAction uint8, userId uint256, guildId uint256, guildName string, createdAt uint256}, signedAt uint256, cid string, signature bytes

    const contractCallParams = [
      {
        receiver: userAddress,
        guildAction,
        userId: BigInt(userId),
        guildId: BigInt(guildId),
        guildName,
        createdAt: BigInt(createdAt),
      },
      adminTreasury,
      BigInt(adminFee),
      BigInt(timestamp),
      cid,
      signature,
    ] as const

    const { request } = await publicClient.simulateContract({
      abi: guildPinAbi,
      address: contractAddress,
      functionName: "claim",
      args: contractCallParams,
      value: guildPinFee,
    })

    if (process.env.NEXT_PUBLIC_MOCK_CONNECTOR) {
      toastWithTweetButton({
        title: "GUILD_PIN_E2E_TEST_SUCCESS",
        tweetText: "",
      })
      return Promise.resolve()
    }

    const hash = await walletClient.writeContract({
      ...request,
      account: walletClient.account,
    })

    setTxHash?.(hash)

    const receipt: TransactionReceipt = await publicClient.waitForTransactionReceipt(
      { hash }
    )

    if (receipt.status !== "success") {
      throw new Error(`Transaction failed. Hash: ${hash}`)
    }

    const events = getEventsFromViemTxReceipt(guildPinAbi, receipt)

    const transferEvent: {
      eventName: "Transfer"
      args: {
        from: `0x${string}`
        to: `0x${string}`
        tokenId: bigint
      }
    } = events.find((event) => event.eventName === "Transfer")

    let tokenId: number, tokenURI: string
    if (transferEvent) {
      try {
        tokenId = Number(transferEvent.args.tokenId)
        setMintedTokenId(tokenId)
        tokenURI = await publicClient.readContract({
          abi: guildPinAbi,
          address: contractAddress,
          functionName: "tokenURI",
          args: [transferEvent.args.tokenId],
        })
      } catch {}
    }

    captureEvent("Minted Guild Pin (GuildCheckout)", postHogOptions)

    try {
      const metadata: GuildPinMetadata = base64ToObject<GuildPinMetadata>(tokenURI)

      mutate((prevData) => {
        const newPin = {
          chainId,
          tokenId,
          ...metadata,
          image: metadata.image.replace(
            "ipfs://",
            process.env.NEXT_PUBLIC_IPFS_GATEWAY
          ),
        }

        const updatedPins = prevData?.usersPins
          ? [...prevData.usersPins, newPin]
          : [newPin]

        return { ...prevData, usersPins: updatedPins }
      })
    } catch {}

    const hasGuildPinRequirement = roles
      .flatMap((r) => r.requirements)
      .some(
        (req) =>
          req.type === "ERC721" &&
          req.chain === Chains[chainId] &&
          req.address.toLowerCase() === contractAddress.toLowerCase()
      )

    if (hasGuildPinRequirement) {
      triggerMembershipUpdate()
    }

    toastWithTweetButton({
      title: "Successfully minted Guild Pin!",
      tweetText: `Just minted my Guild Pin for joining ${name}!\nguild.xyz/${urlName}`,
    })
  }

  return {
    ...useSubmit(mintGuildPin, {
      onError: (error) => {
        setLoadingText("")
        setTxError?.(true)

        const prettyError = error.correlationId
          ? error
          : processViemContractError(error)
        showErrorToast(prettyError)

        captureEvent("Mint Guild Pin error (GuildCheckout)", {
          ...postHogOptions,
          error,
        })
      },
      onSuccess: () => {
        setLoadingText("")
        setTxSuccess?.(true)
      },
    }),
    loadingText,
  }
}

export default useMintGuildPin
