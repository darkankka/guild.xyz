import useConnectPlatform from "components/[guild]/JoinModal/hooks/useConnectPlatform"
import Button from "components/common/Button"
import useToast from "hooks/useToast"
import platforms from "platforms/platforms"
import { PlatformName } from "types"

import { HStack, Icon, Tooltip, useDisclosure } from "@chakra-ui/react"
import useMembershipUpdate from "components/[guild]/JoinModal/hooks/useMembershipUpdate"
import useUser from "components/[guild]/hooks/useUser"
import useMembership from "components/explorer/hooks/useMembership"
import { Question } from "phosphor-react"
import { memo } from "react"
import useDisconnect from "../../hooks/useDisconnect"
import DisconnectAccountButton from "./components/DisconnectAccountButton"
import SocialAccountUI from "./components/SocialAccountUI"

type Props = {
  type: PlatformName
}

const SocialAccount = memo(({ type }: Props): JSX.Element => {
  const { platformUsers } = useUser()
  const { membership } = useMembership()
  const platformUser = platformUsers?.find(
    (platform) => platform.platformName.toString() === type
  )

  const isConnected = !!platformUser

  const isReconnect =
    !!membership &&
    membership?.roles?.some(({ requirements }) =>
      requirements?.some(
        ({ errorType, subType }) =>
          errorType === "PLATFORM_CONNECT_INVALID" && subType?.toUpperCase() === type
      )
    )

  return (
    <SocialAccountUI
      type={type}
      avatarUrl={platformUser?.platformUserData?.avatar}
      username={platformUser?.platformUserData?.username}
      isConnected={isConnected}
    >
      {type === "TWITTER_V1" ? <TwitterV1Tooltip /> : null}
      {!isConnected ? (
        <ConnectPlatformButton type={type} />
      ) : (
        <HStack spacing="1">
          {isReconnect && <ConnectPlatformButton type={type} isReconnect />}
          <DisconnectPlatformButton type={type} />
        </HStack>
      )}
    </SocialAccountUI>
  )
})

export const TwitterV1Tooltip = () => (
  <Tooltip
    hasArrow
    placement="top"
    label="Some of our X requirements can only be checked if your X account is connected this way as well"
  >
    <Icon color="gray" as={Question} />
  </Tooltip>
)

const ConnectPlatformButton = ({ type, isReconnect = false }) => {
  const toast = useToast()
  const { triggerMembershipUpdate } = useMembershipUpdate()

  const onSuccess = () => {
    toast({
      title: `Account successfully connected`,
      status: "success",
    })
    triggerMembershipUpdate()
  }

  const { onConnect, isLoading, response } = useConnectPlatform(
    type as PlatformName,
    onSuccess,
    isReconnect
  )

  return (
    <Button
      isLoading={isLoading}
      onClick={onConnect}
      isDisabled={response}
      colorScheme={isReconnect ? "orange" : platforms[type].colorScheme}
      variant={isReconnect ? "subtle" : "solid"}
      size="sm"
    >
      {isReconnect ? "Reconnect" : "Connect"}
    </Button>
  )
}

const DisconnectPlatformButton = ({ type }: { type: PlatformName }) => {
  const disclosure = useDisclosure()

  const { onSubmit, isLoading, signLoadingText } = useDisconnect(disclosure.onClose)
  const onConfirm = () => onSubmit({ platformName: type })
  const loadingText = signLoadingText ?? "Removing"

  return (
    <DisconnectAccountButton
      {...{
        disclosure,
        isLoading,
        loadingText,
        onConfirm,
        name: platforms[type].name,
      }}
    />
  )
}

export default SocialAccount
