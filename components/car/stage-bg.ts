// The studio backdrop of the stage and the thumbnails: a cool light pool from above and a soft floor under the car.
// Built from the theme tokens. In dark mode the floor under the car is a soft spotlight, lighter than the stage, so
// black and graphite cars, their tyres and their shadow still stand out from it.
export const STAGE_BG = [
  "bg-[radial-gradient(ellipse_62%_48%_at_50%_74%,color-mix(in_oklab,var(--hand-bg)_70%,var(--line))_0%,transparent_72%),radial-gradient(ellipse_85%_75%_at_50%_0%,color-mix(in_oklab,var(--card)_85%,transparent)_0%,transparent_70%),linear-gradient(color-mix(in_oklab,var(--soft)_40%,var(--hand-bg)),color-mix(in_oklab,var(--soft)_55%,var(--hand-bg)))]",
  "dark:bg-[radial-gradient(ellipse_56%_34%_at_50%_76%,rgb(255_255_255/0.1)_0%,rgb(255_255_255/0.04)_45%,transparent_72%),radial-gradient(ellipse_85%_75%_at_50%_0%,color-mix(in_oklab,var(--ink)_9%,transparent)_0%,transparent_70%),linear-gradient(color-mix(in_oklab,var(--soft)_70%,var(--hand-bg)),color-mix(in_oklab,var(--card)_70%,var(--hand-bg)))]",
].join(" ");
