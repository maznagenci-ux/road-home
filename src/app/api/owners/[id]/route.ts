import { createPartyIdRoutes } from '@/lib/crud/parties';

const routes = createPartyIdRoutes('owners');
export const PATCH = routes.PATCH;
export const DELETE = routes.DELETE;
