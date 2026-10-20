export { CarIllustration, TIGHT_VIEWBOX, type CarIllustrationProps } from "./car-illustration";
export { CarGhost } from "./car-ghost";
export { CarThumb } from "./car-thumb";
export {
  CAR_COLORS,
  DEFAULT_PAINT,
  carColorById,
  darken,
  lighten,
  luminance,
  mix,
  normalizeHex,
  paintShades,
  parseHex,
  type CarColor,
  type CarColorId,
} from "./colors";
export { STAGE_BG } from "./stage-bg";
export {
  BODY_LABELS,
  BODY_TYPES,
  POWERTRAINS,
  ZONE_IDS,
  ZONE_LABELS,
  hasChargePort,
  hasExhaust,
  zoneLabelsFor,
  type BodyType,
  type Powertrain,
  type ZoneId,
} from "./types";
export { StageHint, VehicleStage, stageActionClass, stageLinkClass, type StageSize, type VehicleStageProps } from "./vehicle-stage";
export { carZones, zonePosition, type ZoneAnchor } from "./zones";
