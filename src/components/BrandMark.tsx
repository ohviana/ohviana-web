/**
 * The Ohviana logo lockup (mark + wordmark) on its dark tile, used in both themes: header, footer,
 * sign-in. Pass `label` where nothing else names the brand; inside a labelled link it stays silent.
 */
export function BrandMark({ label }: { label?: string }) {
  return (
    <img
      className="brand-mark"
      src="/brand/header-dark.webp"
      alt={label ?? ''}
      width={422}
      height={132}
    />
  );
}
