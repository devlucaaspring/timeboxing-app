// Einstiegspunkt: meldet die Screens beim Router an und startet ihn.
// Der Auth-Check folgt in Phase 2.

import { registerRoute, startRouter } from './router.js';
import * as heute from './views/heute.js';
import * as dump from './views/dump.js';
import * as planen from './views/planen.js';
import * as routinen from './views/routinen.js';

registerRoute('heute', heute.enter);
registerRoute('dump', dump.enter);
registerRoute('planen', planen.enter);
registerRoute('routinen', routinen.enter);

startRouter();
