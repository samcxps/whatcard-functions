import type { Game, CardPack } from "../types";

import { type CallableContext, HttpsError } from "firebase-functions/v1/https";

import { GAMES_COLLECTION, CARD_PACK_COLLECTION } from "../index";
import { sendPushNotification } from "../notifications";
import { shuffleArray } from "../utils";
import { GameStatus } from "../types";

interface IstartGame {
  gameId: string;
}

const startGame = async (data: IstartGame, context: CallableContext) => {
  const { gameId } = data;

  // Get game ref and data
  const gameRef = GAMES_COLLECTION.doc(gameId);
  const gameData = (await gameRef.get().then((doc) => doc.data())) as Game;

  // If game data does not exist return error
  if (!gameData) {
    throw new HttpsError("not-found", "Game with that id does not exist");
  }

  // Change game status to in progress
  gameData.gameStatus = GameStatus.isInProgress;

  // Shuffle players for random turns
  gameData.players = shuffleArray(gameData.players);

  // Get new current turn player after shuffling
  const { uid, displayName } = gameData.players[0];
  gameData.currentTurn = { [uid]: displayName };

  // Deal each plauer random cards from deck
  gameData.players = await dealPlayerCards(
    gameData.players,
    gameData.cardPack,
    gameData.cardAmount
  );

  // Get playerIds to send notifications to
  // Everyone in game except the player who just went
  const notificationPlayers = gameData.playerIds.filter(
    (playerId) => playerId !== Object.keys(gameData.host)[0]
  );

  // Send push notification for players in this game
  sendPushNotification({
    players: notificationPlayers,
    title: `${gameData.displayName} has started!`,
    body: "Go get playing!",
  });

  // Set new gameData in gameRef
  await gameRef.set(gameData);

  return { success: true };
};

/**
 * Helper function to deal player cards
 */
const dealPlayerCards = async (
  players: Game["players"],
  cardPack: Game["cardPack"],
  cardAmount: Game["cardAmount"]
) => {
  // Get game ref and data
  const cardPackRef = CARD_PACK_COLLECTION.doc(cardPack);
  const { cards } = (await cardPackRef
    .get()
    .then((doc) => doc.data())) as CardPack;

  // If card pack data does not exist return error
  if (!cards) {
    throw new HttpsError("not-found", "Error fetching card pack");
  }

  return players.map((player) => {
    player.cards = shuffleArray(cards).slice(0, cardAmount);
    return player;
  });
};

export default startGame;
