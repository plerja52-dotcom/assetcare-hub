import { Link } from "@tanstack/react-router";
import iconAsset from "@/assets/pertamina-icon.png.asset.json";
import { cn } from "@/lib/utils";

/**
 * Icon + wordmark, aligned on a single visual centerline. The right-hand
 * text column is a flex column whose height matches the icon (leading-none
 * on every line), so the icon and text center cleanly at every size.
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
  const iconSize = size === "lg" ? "h-12 w-12" : size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const wordSize = size === "lg" ? "text-xl" : size === "sm" ? "text-[13px]" : "text-[15px]";

  const inner = (
    <>
      <img
        src={iconAsset.url}
        alt="Pertamina"
        className={cn(iconSize, "shrink-0 object-contain select-none")}
        draggable={false}
      />
      {showText && (
        <div className="flex flex-col justify-center min-w-0 leading-none">
          <div
            className={cn(
              "font-brand font-extrabold tracking-[0.02em] leading-none text-foreground",
              wordSize,
            )}
          >
            PERTAMINA
          </div>
          {showSubtitle && (
            <>
              <div className="text-[11px] font-medium text-foreground/80 leading-none mt-1.5 truncate">
                Reliability Instrumentation
              </div>
              <div className="text-[10px] text-muted-foreground leading-none mt-1 truncate">
                Maintenance Area 2 – RU VI Balongan
              </div>
            </>
          )}
        </div>
      )}
    </>
  );

  if (linkTo === null) return <div className="flex items-center gap-3 min-w-0">{inner}</div>;
  return (
    <Link to={linkTo} className="flex items-center gap-3 min-w-0 group">
      {inner}
    </Link>
  );
}
