import { useThemeContext } from "components/[guild]/ThemeContext"
import Button from "components/common/Button"
import LinkButton from "components/common/LinkButton"
import { PropsWithChildren } from "react"
import { Rest } from "types"
import { useIsTabsStuck } from "../Tabs"

type Props = {
  href?: string
  disabled?: boolean
  tooltipText?: string
  isActive?: boolean
} & Rest

const TabButton = ({
  href,
  isActive,
  children,
  ...rest
}: PropsWithChildren<Props>): JSX.Element => {
  const { isStuck } = useIsTabsStuck()
  const { textColor, buttonColorScheme } = useThemeContext() ?? {
    textColor: "white",
    buttonColorScheme: "whiteAlpha",
  }

  const Component = href ? LinkButton : Button

  return (
    <Component
      href={href}
      colorScheme={"gray"}
      {...(!isStuck && {
        color: textColor,
        colorScheme: buttonColorScheme,
      })}
      variant="ghost"
      isActive={isActive}
      mx={isActive && 2}
      prefetch={!!href ? false : undefined}
      sx={{
        /**
         * This equals to :first-child, just changed it so we don't get the annoying
         * emotion error in the console:
         * https://github.com/emotion-js/emotion/issues/2917#issuecomment-1791940421
         */
        ":not(:not(:last-child) ~ *)": {
          ml: 0,
        },
        ":last-child": {
          mr: 0,
        },
      }}
      minW="max-content"
      {...rest}
    >
      {children}
    </Component>
  )
}

export default TabButton
