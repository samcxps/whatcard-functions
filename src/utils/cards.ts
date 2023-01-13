/**
 * Cards utils file
 *
 * Any helper/util functions used when working with cards or Card/CardPack objects
 */

import type { CardPack } from "../types";

import { CARD_PACK_COLLECTION } from "../index";

/**
 * Gets a game from Firestore by the games ID
 *
 * @param gameId ID of game to get from Firestore
 *
 * @returns Firestore document as a Game
 */
interface IGetCardPackResponse {
  packRef?: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
  pack?: CardPack;
  hasError: boolean;
  error?: unknown;
}

export const getCardPack = async (
  cardPack: string
): Promise<IGetCardPackResponse> => {
  try {
    // Get game ref and snapshot
    const packRef = CARD_PACK_COLLECTION.doc(cardPack);
    const packSnapshot = await packRef.get();

    // Make sure pack exists
    if (!packSnapshot.exists) {
      return {
        hasError: true,
        error: `Card pack with ID ${cardPack} does not exist`,
      };
    }

    // Get game data and cast to Game
    const pack = packSnapshot.data() as CardPack;

    return { packRef, pack, hasError: false };
  } catch (error) {
    return { hasError: true, error };
  }
};
