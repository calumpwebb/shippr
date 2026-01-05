export type TokenPayload = {
  userId: string;
  email: string;
  iat: number;
  exp: number;
};

export type AuthResponse = {
  token: string;
  user: {
    id: string;
    email: string;
  };
};
