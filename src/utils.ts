import { camelCase } from 'es-toolkit';

export const toExpressLikePath = (path: string) =>
  // use `.+?` for lazy match
  path.replace(/{(.+?)}/g, (_match, p1: string) => `:${camelCase(p1)}`);

export const isValidRegExp = (pattern: string): boolean => {
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
};
