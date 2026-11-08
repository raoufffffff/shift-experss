import { Link, LinkProps } from 'react-router-dom'
import { useLocale } from '@/hooks/useLocale'

/**
 * Link component that automatically adds the locale prefix to the path
 */
export function LocalizedLink({ to, ...props }: LinkProps) {
  const { getLocalizedPath } = useLocale()

  // Handle both string and object `to` prop
  const localizedTo = typeof to === 'string'
    ? getLocalizedPath(to)
    : { ...to, pathname: to.pathname ? getLocalizedPath(to.pathname) : undefined }

  return <Link to={localizedTo} {...props} />
}
