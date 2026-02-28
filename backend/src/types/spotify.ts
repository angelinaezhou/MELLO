export type AudioFeatures = {
  id: string;
  energy: number;
  valence: number;
  danceability: number;
  acousticness: number;
  instrumentalness: number;
  tempo: number;
};

export type Track = {
  id: string;
  name: string;
  artist: string;
  albumArt: string;
  audioFeatures?: AudioFeatures;
};