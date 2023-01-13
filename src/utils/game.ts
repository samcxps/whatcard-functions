/**
 * Game utils file
 *
 * Any helper/util functions used when working with games or Game objects
 */

import type { Game } from "../types";

import { GAMES_COLLECTION } from "../index";

/**
 * Gets a game from Firestore by the games ID
 *
 * @param gameId ID of game to get from Firestore
 *
 * @returns Firestore document as a Game
 */

interface IGetGameResponse {
  gameRef?: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
  game?: Game;
  hasError: boolean;
  error?: unknown;
}

export const getGame = async (gameId: string): Promise<IGetGameResponse> => {
  try {
    // Get game ref and snapshot
    const gameRef = GAMES_COLLECTION.doc(gameId);
    const gameSnapshot = await gameRef.get();

    // Make sure game exists
    if (!gameSnapshot.exists) {
      return { hasError: true, error: `Game with ID ${gameId} does not exist` };
    }

    // Get game data and cast to Game
    const game = gameSnapshot.data() as Game;

    return { gameRef, game, hasError: false };
  } catch (error) {
    return { hasError: true, error };
  }
};
