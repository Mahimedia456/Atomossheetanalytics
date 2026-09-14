export type AtomosRole = "admin" | "viewer" | string;

export type AtomosUser = {
  id?: string | number;
  email?: string;
  name?: string;
  role?: AtomosRole;
  permissions?: string[];
  [key: string]: unknown;
};

export type LoginResponse = {
  ok: boolean;
  message?: string;
  token: string;
  user: AtomosUser;
};

export type MeResponse = {
  ok: boolean;
  user: AtomosUser;
};
