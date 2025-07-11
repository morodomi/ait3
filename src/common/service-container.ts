import { ServiceFactory } from '../services/ServiceFactory.js';
import type { Services } from './types.js';

export async function createServiceContainer(_options: { cwd: string }): Promise<Services> {
  return await ServiceFactory.createServices();
}