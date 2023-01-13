import type { Timestamp } from "firebase-admin/firestore";

export type CardPack = {
  cards: GameCard[];
  description: string;
  displayName: string;
  packId: string;
};

export type GameCard = {
  id: number;
  title: string;
  description: string;
};

export type Game = {
  cardPack: string;
  cardAmount: number;
  createdTime: Timestamp;
  currentTurn: Record<string, string>;
  displayName: string;
  gameId: string;
  gameStatus: GameStatus;
  host: Record<string, string>;
  joinCode: string;
  playerIds: string[];
  players: Player[];
};

export type Player = {
  cards: GameCard[];
  displayName: string;
  uid: string;
};

export enum GameStatus {
  isInPreLobby = "isInPreLobby",
  isInProgress = "isInProgress",
  isOver = "isOver",
}

export type User = {
  fcmToken: string;
  phoneNumber: string;
  uid: string;
};
