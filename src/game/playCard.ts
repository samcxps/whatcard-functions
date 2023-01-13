import type { CallableContext } from "firebase-functions/v1/https";
import { Game, GameStatus } from "../types";

import { HttpsError } from "firebase-functions/v1/https";

import { sendPushNotification } from "../notifications";
import { getGame } from "../utils";

interface IPlayCard {
  gameId: string;
  cardId: number;
  targetUid: string;
}

const playCard = async (
  { gameId, cardId, targetUid }: IPlayCard,
  context: CallableContext
) => {
  // Make sure all args are present
  if (!gameId || !cardId || !targetUid) {
    throw new HttpsError(
      "invalid-argument",
      "missing argument for function playCard()"
    );
  }

  // Get game ref and data
  const { game, gameRef } = await getGame(gameId);
  if (!game || !gameRef) {
    throw new HttpsError("not-found", "Error fetching game");
  }

  // Get stuff out of game data we will need to access
  const { players } = game;

  // Get indices of the player who is playing a card and the targeted player
  const { cardPlayerIndex, targetPlayerIndex } = getPlayerIndices(
    game,
    targetUid,
    context
  );

  // Make sure curr player and target player exist in game
  if (cardPlayerIndex === -1 || targetPlayerIndex === -1) {
    throw new HttpsError("internal", "cannot find player with id in game");
  }

  // Save display name and cards of person playing card
  const { displayName: cardPlayerDisplayName, cards: cardPlayerCards } =
    players[cardPlayerIndex];

  // Try get specific card the user is playing
  const playedCard = cardPlayerCards.find((card) => card.id === cardId);
  if (!playedCard) {
    throw new HttpsError("internal", `cannot find card with id ${cardId}`);
  }

  // Update players cards (remove the card being played)
  const newCards = cardPlayerCards.filter((card) => card.id !== cardId);
  players[cardPlayerIndex].cards = newCards;

  // Get next player
  const nextPlayer = players[getNextPlayerIndex(game, cardPlayerIndex)];

  // If the next player has 0 cards left, the game SHOULD be over
  //  (assuming that we use the same turn order for the whole game)
  // This logic will have to change if we change the way turns work
  //  (i.e. targeted players next, random player next, etc.)
  if (nextPlayer.cards.length === 0) {
    game.gameStatus = GameStatus.isOver;
    await gameRef.set(game);
    return { success: true };
  }

  // Game is not over so update current turn player
  //  and update all players
  const { uid: nextPlayerUid, displayName: nextPlayerDisplayName } = nextPlayer;
  game.currentTurn = { [nextPlayerUid]: nextPlayerDisplayName };
  game.players = players;

  // Save in firestore
  await gameRef.set(game);

  // Send notification that card was played
  sendCardPlayedNotification(
    game,
    cardPlayerIndex,
    cardPlayerDisplayName,
    nextPlayerDisplayName
  );

  return { success: true };
};

/**
 * Helper function to return indices of the player who is playing a card
 *  and the player who is being targeted
 */
const getPlayerIndices = (
  game: Game,
  targetUid: string,
  context: CallableContext
) => {
  const { players } = game;

  // Use the UID of the user calling this function to get the
  //  index of the player who is playing the card
  const cardPlayerIndex = players.findIndex(
    (player) => player.uid === context.auth?.uid
  );

  // Use targetUid to get the index of the player who is being
  //    targeted
  const targetPlayerIndex = players.findIndex(
    (player) => player.uid === targetUid
  );

  return { cardPlayerIndex, targetPlayerIndex };
};

/**
 * Helper function to get the index of the next player
 *
 * This is seperate functin so in the future, we can change up the logic
 *  for choosing next player depending on game type/style or whatever
 */
const getNextPlayerIndex = (game: Game, cardPlayerIndex: number) => {
  const { players } = game;

  // If last player in game, go back to players[0], else players[currPlayerIndex + 1]
  return cardPlayerIndex === players.length - 1 ? 0 : cardPlayerIndex + 1;
};

const sendCardPlayedNotification = (
  game: Game,
  cardPlayerIndex: number,
  currPlayerDisplayName: string,
  nextPlayerDisplayName: string
) => {
  const { players } = game;

  // Get playerIds to send notifications to everyone
  //  in game except the player who just went
  const notificationPlayers = game.playerIds.filter(
    (playerId) => playerId !== players[cardPlayerIndex].uid
  );

  // Send push notification for players in this game
  sendPushNotification({
    players: notificationPlayers,
    title: `Something happened in ${game.displayName}`,
    body: `${currPlayerDisplayName} just went! It's ${nextPlayerDisplayName}'s turn.`,
  });
};

export default playCard;
