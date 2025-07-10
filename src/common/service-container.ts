import { ServiceFactory } from '../services/ServiceFactory.js';
import type { Services } from './types.js';

export function createServiceContainer(_options: { cwd: string }): Services {
  return ServiceFactory.createServices();
}