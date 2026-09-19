import { createPartyIdRoutes } from '@/lib/crud/parties';

const routes = createPartyIdRoutes('suppliers');
export const PATCH = routes.PATCH;
export const DELETE = routes.DELETE;
