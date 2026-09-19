import { createPartyIdRoutes } from '@/lib/crud/parties';

const routes = createPartyIdRoutes('customers');
export const GET = routes.GET;
export const PATCH = routes.PATCH;
export const DELETE = routes.DELETE;
