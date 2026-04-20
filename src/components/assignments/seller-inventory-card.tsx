import type { SellerInventorySummary } from '@/app/services/mobile-seller';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

const PALETTES = [
  { avatar: 'bg-blue-500/10 text-blue-600', bar: 'from-blue-400 to-indigo-500', ring: 'ring-blue-500/20' },
  { avatar: 'bg-emerald-500/10 text-emerald-600', bar: 'from-emerald-400 to-teal-500', ring: 'ring-emerald-500/20' },
  { avatar: 'bg-violet-500/10 text-violet-600', bar: 'from-violet-400 to-purple-500', ring: 'ring-violet-500/20' },
  { avatar: 'bg-orange-500/10 text-orange-600', bar: 'from-orange-400 to-amber-500', ring: 'ring-orange-500/20' },
  { avatar: 'bg-pink-500/10 text-pink-600', bar: 'from-pink-400 to-rose-500', ring: 'ring-pink-500/20' },
  { avatar: 'bg-cyan-500/10 text-cyan-600', bar: 'from-cyan-400 to-sky-500', ring: 'ring-cyan-500/20' },
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
  const palette = PALETTES[seller.sellerId % PALETTES.length];
  const initials = getInitials(seller.sellerName);

  const filteredItems =
    searchQuery.trim() !== '' && !seller.sellerName.toLowerCase().includes(searchQuery.toLowerCase())
      ? seller.items.filter((item) => item.productName.toLowerCase().includes(searchQuery.toLowerCase()))
      : seller.items;

  return (
    <Card className="flex flex-col overflow-hidden border shadow-sm relative p-0">
      <div className={`h-1.5 w-full bg-linear-to-r ${palette.bar}`} />

      <CardHeader className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ring-2 ${palette.avatar} ${palette.ring}`}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{seller.sellerName}</p>
            <p className="truncate text-xs text-muted-foreground">{seller.sellerEmail}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <span className="text-xs font-semibold tabular-nums text-foreground">{seller.items.length} prod.</span>
            <span className="text-xs tabular-nums text-muted-foreground">{seller.totalQuantity} uds.</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 px-5 pt-0 pb-5">
        <div className="rounded-lg border bg-muted/30 divide-y divide-border/60 overflow-hidden">
          {filteredItems.map((item) => (
            <div key={item.variantId} className="flex items-center justify-between gap-3 px-4 py-2.5">
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
                    ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-0'
                    : 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/10 border-0'
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
