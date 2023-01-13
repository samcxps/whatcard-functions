import type { CallableContext } from "firebase-functions/v1/https";
import { Game, GameStatus } from "../types";

import { HttpsError } from "firebase-functions/v1/https";

import { GAMES_COLLECTION } from "../index";
import { sendPushNotification } from "../notifications";

const playCard = async (data: any, context: CallableContext) => {
  // Get gameId and cardId from request
  const { gameId, cardId, targetUid } = data;

  // Make sure all args are present
  if (gameId == null || cardId == null || targetUid == null) {
    throw new HttpsError(
      "invalid-argument",
      "missing argument for function playCard()"
    );
  }

  // Get game ref and data
  const gameRef = GAMES_COLLECTION.doc(gameId);
  const gameData = (await gameRef.get().then((doc) => doc.data())) as Game;
  if (!gameData) {
    throw new HttpsError("internal", "cannot fetch game with that id");
  }

  // Get stuff out of game data we will need to access
  const { players } = gameData;

  // Get idx of current player from game data
  const currPlayerIndex = players.findIndex(
    (player) => player.uid === context.auth?.uid
  );

  // Save display name of person playing card
  const currentPlayerDisplayName = players[currPlayerIndex].displayName;

  // Get idx of targeted player
  const targetPlayerIndex = players.findIndex(
    (player) => player.uid === targetUid
  );

  // Make sure curr player and target player exist in game
  if (currPlayerIndex === -1 || targetPlayerIndex === -1) {
    throw new HttpsError("internal", "cannot find player with id in game");
  }

  // Get curr player from game data
  const { cards: currPlayerCards } = players[currPlayerIndex];

  // Get card the user is playing
  const playedCard = currPlayerCards.find((card) => card.id === cardId);
  if (!playedCard) {
    throw new HttpsError(
      "internal",
      `cannot find card with id ${cardId} belonging to player`
    );
  }

  // Update players cards (remove the card being played)
  const newCards = currPlayerCards.filter((card) => card.id !== cardId);
  players[currPlayerIndex].cards = newCards;

  // Get next player
  // If last player in game, go back to players[0], else players[currPlayerIndex + 1]
  const nextPlayerIndex =
    currPlayerIndex === players.length - 1 ? 0 : currPlayerIndex + 1;
  const nextPlayer = players[nextPlayerIndex];

  // If the next player has 0 cards left, the game SHOULD be over
  //  (assuming that we use the same turn order for the whole game)
  // This logic will have to change if we change the way turns work
  //  (i.e. targeted players next, random player next, etc.)
  if (!nextPlayer.cards || nextPlayer.cards.length === 0) {
    // Game is over. Nobody should have any cards left.
    // Change game status and return early

    gameData.gameStatus = GameStatus.isOver;
    await gameRef.set(gameData);

    return { success: false, message: "Game Over" };
  }

  // Update game current turn
  const { uid: nextPlayerUid, displayName: nextPlayerDisplayName } = nextPlayer;
  const newCurrentTurn = { [nextPlayerUid]: nextPlayerDisplayName };

  // Update new player data after doing stuff in game and set in firestore
  gameData.players = players;
  gameData.currentTurn = newCurrentTurn;
  await gameRef.set(gameData);

  // Get playerIds to send notifications to
  // Everyone in game except the player who just went
  const notificationPlayers = gameData.playerIds.filter(
    (playerId) => playerId !== players[currPlayerIndex].uid
  );
  // Send push notification for players in this game
  sendPushNotification({
    players: notificationPlayers,
    title: `Something happened in ${gameData.displayName}`,
    body: `${currentPlayerDisplayName} just went! It's ${nextPlayerDisplayName}'s turn.`,
  });

  return { success: true, message: `New turn: ${nextPlayerDisplayName}` };
};

export default playCard;
