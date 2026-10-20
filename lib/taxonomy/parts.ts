import { maintenanceParts, brakeParts } from "./data/maintenance";
import { suspensionParts, steeringParts, wheelParts } from "./data/chassis";
import { bodyParts, glassParts } from "./data/body";
import { opticsParts, electricalParts, adasParts } from "./data/electrical";
import { interiorParts, coolingParts } from "./data/interior";
import { engineParts, transmissionParts, hvParts } from "./data/powertrain";
import type { PartGroup, PartType } from "./types";

export {
  PART_GROUPS,
  groupLabels,
  groupLabelsZh,
  type Axis,
  type PartGroup,
  type PartType,
  type Position,
  type Side,
} from "./types";

// The dictionary is shared by every request in the process, so a caller must not be able to change it.
function freeze(part: PartType): PartType {
  Object.freeze(part.synonyms);
  Object.freeze(part.epcHints);
  return Object.freeze(part);
}

// Order matters: when two parts match a query equally well, the one listed first wins.
// More frequently requested parts therefore come first within each group.
export const PART_TYPES: readonly PartType[] = Object.freeze(
  [
    ...maintenanceParts,
    ...brakeParts,
    ...suspensionParts,
    ...steeringParts,
    ...bodyParts,
    ...opticsParts,
    ...glassParts,
    ...electricalParts,
    ...adasParts,
    ...interiorParts,
    ...coolingParts,
    ...engineParts,
    ...transmissionParts,
    ...hvParts,
    ...wheelParts,
  ].map(freeze),
);

const BY_ID = new Map(PART_TYPES.map((p) => [p.id, p]));

export function getPartType(id: string | null | undefined): PartType | null {
  return (id && BY_ID.get(id)) || null;
}

export function partTypesByGroup(group: PartGroup): PartType[] {
  return PART_TYPES.filter((p) => p.group === group);
}
