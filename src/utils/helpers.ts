/**
 * Util file
 *
 * Any utility/helper functions that are not specific to one
 *  aspect or piece of the game
 */

/**
 * Durstenfeld shuffle
 *
 * Used for dealing cards and randomizing player turns
 *
 * @param arr Any array to shuffle
 */
export const shuffleArray = <T>(arr: T[]): T[] => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
};
