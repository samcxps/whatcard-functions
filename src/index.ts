/* eslint-disable @typescript-eslint/no-explicit-any */
import * as admin from "firebase-admin";

import {
  HttpsError,
  onCall,
  type CallableContext,
} from "firebase-functions/v1/https";
import { startGame, playCard, joinGame } from "./game";

admin.initializeApp();

export const GAMES_COLLECTION = admin.firestore().collection("games");
export const CARD_PACK_COLLECTION = admin.firestore().collection("card_packs");
export const USER_COLLECTION = admin.firestore().collection("users");

/**
 * Custom middleware stuff for google cloud functions
 */
export type Middleware = (
  data: any,
  context: CallableContext,
  next: (data: any, context: CallableContext) => Promise<any>
) => Promise<any>;

export const withMiddlewares =
  (middlewares: Middleware[], handler: any) =>
  (data: any, context: CallableContext) => {
    const chainMiddlewares = ([
      firstMiddleware,
      ...restOfMiddlewares
    ]: Middleware[]) => {
      if (firstMiddleware) {
        return (data: any, context: CallableContext): Promise<any> => {
          try {
            return firstMiddleware(
              data,
              context,
              chainMiddlewares(restOfMiddlewares)
            );
          } catch (error) {
            return Promise.reject(error);
          }
        };
      }

      return handler;
    };

    return chainMiddlewares(middlewares)(data, context);
  };

/**
 * Middleware for authentication
 * Ensures user is authenticated before executing function
 */
const assertAuthenticated: Middleware = (data, context, next) => {
  if (!context.auth?.uid) {
    throw new HttpsError("unauthenticated", "Unauthorized.");
  }

  return next(data, context);
};

/**
 * Start a whatcard game
 *
 * Changes game status to in progress, sets random turn order,
 *  deals cards from chosen card pack, sends players notifications
 */
exports.startGame = onCall(
  withMiddlewares([assertAuthenticated], async (data: any) => startGame(data))
);

/**
 * Join a whatcard game
 *
 * Adds user to game and sends other players notifications
 */
exports.joinGame = onCall(
  withMiddlewares([assertAuthenticated], async (data: any) => joinGame(data))
);

/**
 * Play a card for user
 */
exports.playCard = onCall(
  withMiddlewares(
    [assertAuthenticated],
    async (data: any, context: CallableContext) => playCard(data, context)
  )
);
