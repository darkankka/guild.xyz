import { Box, Container, GridItem, Img, SimpleGrid, Stack } from "@chakra-ui/react"
import Link from "components/common/Link"

const Footer = (): JSX.Element => (
  <Box
    position="relative"
    w="full"
    bgImage="url('/landing/fire.svg')"
    bgSize="auto 8rem"
    bgRepeat="repeat-x"
    bgPosition="bottom center"
    bgColor="gray.800"
  >
    <Container
      maxW="container.lg"
      px={{ base: 8, lg: 10 }}
      pt={{ base: 16, lg: 28 }}
      pb={{ base: 48, lg: 64 }}
    >
      <SimpleGrid columns={6} gap={8}>
        <GridItem
          colSpan={{ base: 3, md: 1 }}
          display="flex"
          alignItems="center"
          justifyContent={{ base: "center", md: "unset" }}
        >
          <Img
            src="/landing/guild-footer-logo.svg"
            alt="Guild.xyz"
            maxH={{ base: "120px", lg: "140px" }}
          />
        </GridItem>
        <GridItem colSpan={{ base: 3, md: 5 }}>
          <Stack
            w="full"
            h="full"
            spacing={{ base: 0, md: 4, lg: 6 }}
            direction={{ base: "column", md: "row" }}
            alignItems="center"
            justifyContent={{ base: "center", md: "end" }}
            fontSize={{ base: "md", lg: "lg" }}
            whiteSpace="nowrap"
            fontWeight="bold"
            fontFamily="display"
          >
            <Link href="https://twitter.com/guildxyz" isExternal>
              x
            </Link>
            <Link href="https://github.com/guildxyz/guild.xyz" isExternal>
              github
            </Link>
            <Link href="https://guild.mirror.xyz" isExternal>
              mirror
            </Link>
            <Link href="https://guild.xyz/our-guild" isExternal>
              guild
            </Link>
            <Link href="/guild-xyz-brand-kit.zip" isExternal>
              brand kit
            </Link>
            <Link href="/privacy-policy">privacy policy</Link>
            <Link href="/terms-and-conditions">terms & conditions</Link>
          </Stack>
        </GridItem>
      </SimpleGrid>
    </Container>
  </Box>
)

export default Footer
