import type { BodyGeometry } from "../geometry";
import type { BodyType } from "../types";
import { crossover } from "./crossover";
import { hatchback } from "./hatchback";
import { liftback } from "./liftback";
import { minivan } from "./minivan";
import { offroad } from "./offroad";
import { pickup } from "./pickup";
import { sedan } from "./sedan";
import { suv } from "./suv";

export const BODIES: Record<BodyType, BodyGeometry> = { crossover, suv, offroad, sedan, liftback, hatchback, minivan, pickup };
