import { camelCase } from 'es-toolkit';
import { TResponseMap } from './types';

export function getResIdentifierName(res: TResponseMap) {
  if (!res.id) {
    return '';
  }
  return camelCase(`get_${res.id}_${res.code}_response`);
}
