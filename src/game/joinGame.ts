import type { Game, Player } from "../types";

import { HttpsError } from "firebase-functions/v1/https";

import { sendPushNotification } from "../notifications";
import { getGame } from "../utils";
import { isUserInGame } from "../utils/game";

interface IJoinGame {
  joiningPlayerUid: string;
  displayName: string;
  gameId: string;
}

/**
 * Joins a WhatCard game
 */
const joinGame = async ({
  joiningPlayerUid,
  displayName,
  gameId,
}: IJoinGame) => {
  // Make sure all args are present
  if (joiningPlayerUid === null || displayName === null || gameId === null) {
    throw new HttpsError(
      "invalid-argument",
      "missing argument for function joinGame()"
    );
  }

  // Get game ref and data
  const { game, gameRef } = await getGame(gameId);
  if (!game || !gameRef) {
    throw new HttpsError("not-found", "Error fetching game");
  }

  // Make sure user is not already in game
  // If user is in game, throw GameServiceException
  if (isUserInGame(game, joiningPlayerUid)) {
    throw new HttpsError(
      "failed-precondition",
      "User is already a player in this game"
    );
  }

  // Create new player to add to game
  const newPlayer: Player = { displayName, uid: joiningPlayerUid, cards: [] };

  // Add player to game
  game.players.push(newPlayer);
  game.playerIds.push(joiningPlayerUid);

  // Save new game data in firestore
  await gameRef.set(game);

  // Send join game notification
  //   sendJoinGameNotification(game, joiningPlayerUid);

  return { success: true };
};

/**
 * Helper function to send a notification for game starting
 */
const sendJoinGameNotification = async (
  game: Game,
  joiningPlayerUid: string
) => {
  // Get playerIds for everyone in game except the player that just joined
  const notificationPlayers = game.playerIds.filter(
    (playerId) => playerId !== joiningPlayerUid
  );

  // Send push notification for players in this game
  sendPushNotification({
    playerIds: notificationPlayers,
    title: `${game.displayName} has started!`,
    body: "Go get playing!",
  });
};

export default joinGame;
