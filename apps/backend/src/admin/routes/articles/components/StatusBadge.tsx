import { Badge } from '@medusajs/ui'

interface StatusBadgeProps {
  status: 'draft' | 'published'
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  return (
    <Badge color={status === 'published' ? 'green' : 'orange'}>
      {status}
    </Badge>
  )
}
