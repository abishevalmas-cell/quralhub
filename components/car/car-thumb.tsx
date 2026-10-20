import { cn } from "@/lib/utils";
import { CarIllustration } from "./car-illustration";
import { STAGE_BG } from "./stage-bg";
import type { BodyType, Powertrain } from "./types";

/**
 * The car art for garage and model cards: same drawing as the stage, no hotspots, on the studio backdrop.
 * Without a title the picture is decorative (the card already names the car).
 */
export function CarThumb({
  body,
  color,
  title,
  powertrain,
  spare,
  plain = false,
  className,
}: {
  body: BodyType;
  color: string;
  title?: string;
  powertrain?: Powertrain | null;
  spare?: boolean;
  /** Drop the backdrop when the card already has its own. */
  plain?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden", !plain && cn("rounded-xl", STAGE_BG), className)}>
      <CarIllustration body={body} color={color} powertrain={powertrain} spare={spare} title={title} decorative={!title} tight />
    </div>
  );
}
