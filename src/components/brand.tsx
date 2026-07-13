import { Link } from "@tanstack/react-router";
import iconAsset from "@/assets/pertamina-icon.png.asset.json";
import { cn } from "@/lib/utils";

/**
 * Split brand: colored icon (transparent PNG, works on any theme) + real
 * HTML text for "PERTAMINA" so its color is theme-aware. The wordmark uses
 * Poppins ExtraBold with tight tracking to visually approximate the official
 * logotype without shipping any raster text.
 */
export function Brand({
  size = "md",
  showText = true,
  showSubtitle = true,
  linkTo = "/",
}: {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  showSubtitle?: boolean;
  linkTo?: string | null;
}) {
  const iconSize =
    size === "lg" ? "h-12 w-12" : size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const wordSize =
    size === "lg" ? "text-xl" : size === "sm" ? "text-[13px]" : "text-[15px]";

  const inner = (
    <>
      <img
        src={iconAsset.url}
        alt="Pertamina"
        className={cn(iconSize, "shrink-0 object-contain select-none")}
        draggable={false}
      />
      {showText && (
        <div className="min-w-0">
          <div
            className={cn(
              "font-brand font-extrabold tracking-[0.02em] leading-none text-foreground",
              wordSize,
            )}
            style={{ fontStretch: "condensed" }}
          >
            PERTAMINA
          </div>
          {showSubtitle && (
            <>
              <div className="text-[11px] font-medium text-foreground/80 leading-tight mt-1 truncate">
                Reliability Instrumentation
              </div>
              <div className="text-[10px] text-muted-foreground leading-tight truncate">
                Maintenance Area 2 – RU VI Balongan
              </div>
            </>
          )}
        </div>
      )}
    </>
  );

  if (linkTo === null) {
    return <div className="flex items-center gap-3 min-w-0">{inner}</div>;
  }
  return (
    <Link to={linkTo} className="flex items-center gap-3 min-w-0 group">
      {inner}
    </Link>
  );
}
