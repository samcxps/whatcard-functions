import type { Game } from "../types";

import { HttpsError } from "firebase-functions/v1/https";

import { sendPushNotification } from "../notifications";
import { getCardPack, getGame, shuffleArray } from "../utils";
import { GameStatus } from "../types";

interface IstartGame {
  gameId: string;
}

/**
 * Starts a WhatCard game
 */
const startGame = async ({ gameId }: IstartGame) => {
  // Make sure all args are present
  if (!gameId) {
    throw new HttpsError(
      "invalid-argument",
      "missing argument for function startGame()"
    );
  }

  // Get game ref and data
  const { game, gameRef } = await getGame(gameId);
  if (!game || !gameRef) {
    throw new HttpsError("not-found", "Error fetching game");
  }

  // Change game status to in progress
  // Shuffle players for random turns
  // Deal each plauer random cards from deck
  game.gameStatus = GameStatus.isInProgress;
  game.players = shuffleArray(game.players);
  game.players = await dealPlayerCards(game);

  // Get player who is up first and set game currentTurn
  //  to that player
  const { uid, displayName } = game.players[0];
  game.currentTurn = { [uid]: displayName };

  // Save new game data in firestore
  await gameRef.set(game);

  // Send game start notification
  sendStartGameNotification(game);

  return { success: true };
};

/**
 * Helper function to deal player cards
 */
const dealPlayerCards = async (game: Game) => {
  // Get stuff we need from param
  const { players, cardPack, cardAmount } = game;

  // Get card pack
  const { pack } = await getCardPack(cardPack);

  // If card pack data does not exist return error
  if (!pack) {
    throw new HttpsError("not-found", "Error fetching card pack");
  }

  // Get cards from pack
  const { cards: packCards } = pack;

  // Map over each player in game and assign them n random cards
  //  by shuffling the cards in the card pack and then slicing 0,cardAmount
  return players.map((player) => {
    player.cards = shuffleArray(packCards).slice(0, cardAmount);
    return player;
  });
};

/**
 * Helper function to send a notification for game starting
 */
const sendStartGameNotification = async (game: Game) => {
  // Get playerIds for everyone in game except the host
  //  to send notifications to
  const notificationPlayers = game.playerIds.filter(
    (playerId) => playerId !== Object.keys(game.host)[0]
  );

  // Send push notification for players in this game
  sendPushNotification({
    players: notificationPlayers,
    title: `${game.displayName} has started!`,
    body: "Go get playing!",
  });
};

export default startGame;
