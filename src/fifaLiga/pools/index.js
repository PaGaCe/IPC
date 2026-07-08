import { GLOBAL_POOL } from "./GlobalPool";
import { DRAFT_STARS } from "./DraftStars";
import { SQUAD_POOL_1 } from "./SquadPool1";
import { SQUAD_POOL_2 } from "./SquadPool2";
import { SQUAD_POOL_3 } from "./SquadPool3";
import { LEGEND_POOL_1 } from "./LegendPool1";
import { LEGEND_POOL_2 } from "./LegendPool2";

const uniquePlayers = (arrays) => {
  const seen = new Set();
  return arrays.flat().filter((player) => {
    if (seen.has(player.name)) return false;
    seen.add(player.name);
    return true;
  });
};

export const SQUAD_POOL = [...SQUAD_POOL_1, ...SQUAD_POOL_2, ...SQUAD_POOL_3];
export const LEGEND_POOL = [...LEGEND_POOL_1, ...LEGEND_POOL_2];
export const MARKET_POOL = uniquePlayers([GLOBAL_POOL, DRAFT_STARS, SQUAD_POOL]);

export { GLOBAL_POOL, DRAFT_STARS };
