import { useUserPublic } from "components/[guild]/hooks/useUser"
import { posthog } from "posthog-js"
import {
  PostHogProvider as DefaultPostHogProvider,
  usePostHog,
} from "posthog-js/react"
import { PropsWithChildren, createContext, useContext } from "react"
import useWeb3ConnectionManager from "./Web3ConnectionManager/hooks/useWeb3ConnectionManager"

if (typeof window !== "undefined") {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: "/api/posthog",
    // Capture custom events only
    autocapture: false,
    capture_pageleave: false,
    capture_pageview: false,

    persistence: "memory",

    // Disable in development
    loaded: (ph) => {
      if (
        process.env.NODE_ENV !== "production" ||
        window.location.host !== "guild.xyz"
      )
        ph.opt_out_capturing()
    },
  })
}

const PostHogContext = createContext<{
  captureEvent: (event: string, options?: Record<string, any>) => void
}>({
  captureEvent: () => {},
})

const CustomPostHogProvider = ({
  children,
}: PropsWithChildren<unknown>): JSX.Element => {
  const { address, type: walletType } = useWeb3ConnectionManager()
  const { id } = useUserPublic()
  const ph = usePostHog()

  return (
    <PostHogContext.Provider
      value={{
        captureEvent: (event, options) =>
          ph.capture(event, {
            userId: id,
            userAddress: address?.toLowerCase(),
            walletType,
            ...options,
          }),
      }}
    >
      {children}
    </PostHogContext.Provider>
  )
}

const PostHogProvider = ({ children }: PropsWithChildren<unknown>): JSX.Element => (
  <DefaultPostHogProvider client={posthog}>
    <CustomPostHogProvider>{children}</CustomPostHogProvider>
  </DefaultPostHogProvider>
)

const usePostHogContext = () => useContext(PostHogContext)

export { PostHogProvider, usePostHogContext }
