import type { SellerInventorySummary } from '@/app/services/mobile-seller';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-teal-100 text-teal-700',
] as const;

const ACCENT_GRADIENTS = [
  'bg-linear-to-r from-blue-400 to-blue-600',
  'bg-linear-to-r from-green-400 to-green-600',
  'bg-linear-to-r from-purple-400 to-purple-600',
  'bg-linear-to-r from-orange-400 to-orange-600',
  'bg-linear-to-r from-pink-400 to-pink-600',
  'bg-linear-to-r from-teal-400 to-teal-600',
] as const;

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

interface SellerInventoryCardProps {
  seller: SellerInventorySummary;
  searchQuery: string;
}

export function SellerInventoryCard({ seller, searchQuery }: SellerInventoryCardProps) {
  const avatarColor = AVATAR_COLORS[seller.sellerId % AVATAR_COLORS.length];
  const accentGradient = ACCENT_GRADIENTS[seller.sellerId % ACCENT_GRADIENTS.length];
  const initials = getInitials(seller.sellerName);

  const filteredItems =
    searchQuery.trim() !== '' && !seller.sellerName.toLowerCase().includes(searchQuery.toLowerCase())
      ? seller.items.filter((item) => item.productName.toLowerCase().includes(searchQuery.toLowerCase()))
      : seller.items;

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className={`h-1 ${accentGradient}`} />
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarColor}`}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{seller.sellerName}</p>
            <p className="truncate text-xs text-muted-foreground">{seller.sellerEmail}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge variant="secondary">{seller.items.length} productos</Badge>
            <Badge variant="outline">{seller.totalQuantity} uds.</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pt-0">
        <div className="divide-y">
          {filteredItems.map((item) => (
            <div key={item.variantId} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.productName}</p>
                <div className="flex items-center gap-2">
                  {item.presentationName && (
                    <span className="truncate text-xs text-muted-foreground">{item.presentationName}</span>
                  )}
                  {item.code && <span className="font-mono text-xs text-muted-foreground">#{item.code}</span>}
                </div>
              </div>
              <Badge
                variant="secondary"
                className={
                  item.quantity >= 10
                    ? 'bg-green-100 text-green-700 hover:bg-green-100'
                    : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100'
                }
              >
                {item.quantity}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
