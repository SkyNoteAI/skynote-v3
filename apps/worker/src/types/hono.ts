import { Env } from './env';

export type HonoEnv = {
  Bindings: Env;
  Variables: {
    userId: string;
    user: any;
    requestId: string;
    jwtPayload?: any;
  };
};
