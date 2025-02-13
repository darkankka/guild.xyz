import { useUserPublic } from "components/[guild]/hooks/useUser"
import { usePostHogContext } from "components/_app/PostHogProvider"
import useWeb3ConnectionManager from "components/_app/Web3ConnectionManager/hooks/useWeb3ConnectionManager"
import { createStore, del, get, set } from "idb-keyval"
import { useAtomValue } from "jotai"
import { mutate } from "swr"
import { useFetcherWithSign } from "utils/fetcher"
import { recaptchaAtom } from "utils/recaptcha"
import useSubmit from "./useSubmit"

/**
 * This is a generic RPC internal error code, but we are only using it for testing
 * personal_sign errors, which should mean that the user rejected the request
 */
const RPC_INTERNAL_ERROR_CODE = -32603

export type StoredKeyPair = {
  keyPair: CryptoKeyPair
  pubKey: string
}

type SetKeypairPayload = Omit<StoredKeyPair, "keyPair"> & {
  verificationParams?: {
    reCaptcha: string
  }
}

const getStore = () => createStore("guild.xyz", "signingKeyPairs")
export const getKeyPairFromIdb = (userId: number) =>
  get<StoredKeyPair>(userId, getStore())
export const deleteKeyPairFromIdb = (userId: number) =>
  userId ? del(userId, getStore()) : null
const setKeyPairToIdb = (userId: number, keys: StoredKeyPair) =>
  set(userId, keys, getStore())

const generateKeyPair = async () => {
  const keyPair: StoredKeyPair = {
    pubKey: undefined,
    keyPair: undefined,
  }
  try {
    const generatedKeys = await window.crypto.subtle.generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      false,
      ["sign", "verify"]
    )

    const generatedPubKey = await window.crypto.subtle.exportKey(
      "raw",
      generatedKeys.publicKey
    )

    const generatedPubKeyHex = Buffer.from(generatedPubKey).toString("hex")
    keyPair.pubKey = generatedPubKeyHex
    keyPair.keyPair = generatedKeys
    return keyPair
  } catch {
    throw new Error("Pubkey export error")
  }
}

const useSetKeyPair = () => {
  const { captureEvent } = usePostHogContext()
  const { address } = useWeb3ConnectionManager()
  const fetcherWithSign = useFetcherWithSign()

  const { id, captchaVerifiedSince } = useUserPublic()

  const recaptcha = useAtomValue(recaptchaAtom)

  const setSubmitResponse = useSubmit(
    async () => {
      const reCaptchaToken =
        !recaptcha || !!captchaVerifiedSince
          ? undefined
          : await recaptcha.executeAsync()

      const generatedKeys = await generateKeyPair().catch((err) => {
        if (err?.code !== 4001) {
          captureEvent(`Keypair generation error`, {
            error: err?.message || err?.toString?.() || err,
          })
        }
        throw err
      })

      const body: SetKeypairPayload = {
        pubKey: generatedKeys.pubKey,
      }

      if (reCaptchaToken) {
        recaptcha.reset()
        body.verificationParams = {
          reCaptcha: reCaptchaToken,
        }
      }

      const userProfile = await fetcherWithSign([
        `/v2/users/${id ?? address}/public-key`,
        {
          method: "POST",
          body,
          signOptions: {
            forcePrompt: true,
            msg: "Please sign this message, so we can generate, and assign you a signing key pair. This is needed so you don't have to sign every Guild interaction.",
          },
        },
      ])

      /**
       * This rejects, when IndexedDB is not available, like in Firefox private
       * window. Ignoring this error is fine, since we are falling back to just
       * storing it in memory.
       */
      await setKeyPairToIdb(userProfile.id, generatedKeys).catch(() => {})

      await mutate(
        [`/v2/users/${userProfile.id}/profile`, { method: "GET", body: {} }],
        userProfile,
        {
          revalidate: false,
        }
      )
      await mutate(
        `/v2/users/${address}/profile`,
        {
          id: userProfile?.id,
          publicKey: userProfile?.publicKey,
          captchaVerifiedSince: userProfile?.captchaVerifiedSince,
          keyPair: generatedKeys,
        },
        {
          revalidate: false,
        }
      )
    },
    {
      onError: (error) => {
        console.error("setKeyPair error", error)
        if (
          error?.code !== RPC_INTERNAL_ERROR_CODE &&
          error?.code !== "ACTION_REJECTED"
        ) {
          const trace = error?.stack || new Error().stack
          captureEvent(`Failed to set keypair`, { error, trace })
        }
      },
    }
  )

  return setSubmitResponse
}

export default useSetKeyPair
