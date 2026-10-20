import type { Axis, PartType, Side } from "./types";

const AXIS_ZH: Record<Axis, string> = { front: "前", rear: "后" };
const SIDE_ZH: Record<Side, string> = { left: "左", right: "右" };

// Chinese label for a supplier: side first, then axis — 左前大灯总成, 右前空气弹簧, 后刹车片.
// The axis prefix is added only to parts that come in front and rear versions and whose name does not
// already start with 前/后 (前大灯总成, 后背门). Side is added whenever the customer gave it.
export function zhLabel(part: PartType, axis: Axis | null = null, side: Side | null = null): string {
  let label = part.zh;
  if (axis && part.needsAxis && !/^[前后]/.test(label)) label = AXIS_ZH[axis] + label;
  if (side) label = SIDE_ZH[side] + label;
  return label;
}
