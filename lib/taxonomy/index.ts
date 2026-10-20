export {
  PART_GROUPS,
  PART_TYPES,
  getPartType,
  groupLabels,
  groupLabelsZh,
  partTypesByGroup,
  type Axis,
  type PartGroup,
  type PartType,
  type Position,
  type Side,
} from "./parts";
export { matchParts, parseQuery, type ParsedQuery, type PartMatch, type QueryKind } from "./parse";
export { normalizeText } from "./text";
export { zhLabel } from "./zh";
