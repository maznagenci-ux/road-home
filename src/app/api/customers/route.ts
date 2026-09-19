import { createPartyRoutes } from '@/lib/crud/parties';

const routes = createPartyRoutes('customers');
export const GET = routes.GET;
export const POST = routes.POST;
