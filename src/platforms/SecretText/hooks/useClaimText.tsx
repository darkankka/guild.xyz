import {
  HStack,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Text,
  useDisclosure,
} from "@chakra-ui/react"
import useMembershipUpdate from "components/[guild]/JoinModal/hooks/useMembershipUpdate"
import { reactMarkdownComponents } from "components/[guild]/collect/components/RichTextDescription"
import useGuild from "components/[guild]/hooks/useGuild"
import ErrorAlert from "components/common/ErrorAlert"
import { Modal } from "components/common/Modal"
import useJsConfetti from "components/create-guild/hooks/useJsConfetti"
import useShowErrorToast from "hooks/useShowErrorToast"
import { SignedValidation, useSubmitWithSign } from "hooks/useSubmit"
import { useUserRewards } from "hooks/useUserRewards"
import ReactMarkdown from "react-markdown"
import { useSWRConfig } from "swr"
import useSWRImmutable from "swr/immutable"
import fetcher from "utils/fetcher"
import { useClaimedReward } from "../../../hooks/useClaimedReward"

type ClaimResponse = {
  uniqueValue: string
}

const useClaimText = (rolePlatformId: number) => {
  const { cache } = useSWRConfig()
  const { uniqueValue } = useClaimedReward(rolePlatformId)

  const { isOpen, onOpen, onClose } = useDisclosure()

  const { id: guildId, roles, mutateGuild } = useGuild()
  const roleId = roles.find((role) =>
    role.rolePlatforms.some((rp) => rp.id === rolePlatformId)
  )?.id

  const { data: userRewards, isLoading: isUserRewardsLoading } = useUserRewards()
  const hasUserReward = !!userRewards?.find(
    (reward) => reward.rolePlatformId === rolePlatformId
  )

  const triggerConfetti = useJsConfetti()
  const showErrorToast = useShowErrorToast()

  const endpoint = `/v2/guilds/${guildId}/roles/${roleId}/role-platforms/${rolePlatformId}/claim`
  const { data: responseFromCache, mutate: mutateCachedResponse } = useSWRImmutable(
    endpoint,
    () => cache.get(endpoint)?.data
  )

  const claimFetcher = (signedValidation: SignedValidation) =>
    fetcher(endpoint, {
      method: "POST",
      ...signedValidation,
    })

  const { onSubmit: onClaimTextSubmit, ...claim } = useSubmitWithSign<ClaimResponse>(
    claimFetcher,
    {
      onSuccess: (response) => {
        triggerConfetti()
        /**
         * Saving in SWR cache so we don't need to re-claim the reward if the user
         * clicks on the claim button in the AccessHub, then on the RoleCard (or vice
         * versa)
         */
        mutateCachedResponse(response)
        mutateGuild((prevGuild) => ({
          ...prevGuild,
          roles: prevGuild?.roles.map((role) => {
            if (!role.rolePlatforms?.some((rp) => rp.id === rolePlatformId))
              return role

            return {
              ...role,
              rolePlatforms: role.rolePlatforms.map((rp) => {
                if (rp.id !== rolePlatformId) return rp

                return {
                  ...rp,
                  claimedCount: rp.claimedCount + 1,
                }
              }),
            }
          }),
        }))
      },
      onError: (error) => showErrorToast(error),
    }
  )

  const {
    error: membershipUpdateError,
    isLoading: isMembershipUpdateLoading,
    triggerMembershipUpdate,
  } = useMembershipUpdate(
    () => onClaimTextSubmit(),
    (error) =>
      showErrorToast({
        error: "Couldn't check eligibility",
        correlationId: error.correlationId,
      })
  )

  return {
    error: claim.error ?? membershipUpdateError,
    response: uniqueValue ? { uniqueValue } : responseFromCache ?? claim.response,
    isPreparing: isUserRewardsLoading,
    isLoading: claim.isLoading || isMembershipUpdateLoading,
    onSubmit: hasUserReward
      ? () => onClaimTextSubmit()
      : () => triggerMembershipUpdate(),
    modalProps: {
      isOpen,
      onOpen,
      onClose,
    },
  }
}

type ModalProps = {
  title: string
  isOpen: boolean
  onClose: () => void
  isLoading: boolean
  response?: ClaimResponse
  error?: any
}

const ClaimTextModal = ({
  title,
  isOpen,
  onClose,
  isLoading,
  response,
  error,
}: ModalProps) => (
  <Modal isOpen={isOpen} onClose={onClose}>
    <ModalOverlay />
    <ModalContent>
      <ModalCloseButton />

      <ModalHeader pb={0}>{title}</ModalHeader>

      <ModalBody pt={8}>
        {isLoading ? (
          <HStack spacing="6">
            <Spinner />
            <Text>Getting your secret...</Text>
          </HStack>
        ) : response?.uniqueValue ? (
          <ReactMarkdown components={reactMarkdownComponents}>
            {response.uniqueValue}
          </ReactMarkdown>
        ) : (
          <ErrorAlert label={error?.error ?? "Something went wrong"} />
        )}
      </ModalBody>
    </ModalContent>
  </Modal>
)

export default useClaimText
export { ClaimTextModal }
