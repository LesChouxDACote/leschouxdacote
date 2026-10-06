import NextLink, { LinkProps } from "next/link"
import { AnchorHTMLAttributes, FC } from "react"
import { ButtonProps, LinkButton } from "src/components/Button"

type Props = Pick<LinkProps, "href"> & AnchorHTMLAttributes<HTMLAnchorElement>

const Link: FC<Props> = ({ children, href, ...props }) => (
  <NextLink href={href} {...props}>
    {children}
  </NextLink>
)

export const ButtonLink: FC<Props & ButtonProps> = ({ children, href, $variant, ...props }) => (
  <LinkButton href={href} $variant={$variant} {...props}>
    {children}
  </LinkButton>
)

export default Link
