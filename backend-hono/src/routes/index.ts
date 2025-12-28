import { Hono } from 'hono';
import { projectxRoutes } from './projectx.js';
import { tradingRoutes } from './trading.js';
import { marketRoutes } from './market.js';
import { newsRoutes } from './news.js';
import { journalRoutes } from './journal.js';
import { erRoutes } from './er.js';
import { econRoutes } from './econ.js';
import { accountRoutes } from './account.js';
import { notificationsRoutes } from './notifications.js';
import { eventsRoutes } from './events.js';
import { eventsRoutes } from './events.js';
import { aiRoutes } from './ai/index.js';
import { autopilotRoutes } from './autopilot/index.js';
import { autopilotTestRoutes } from './autopilot-test.js';

export function registerRoutes(app: Hono) {
  app.route('/api/api/account', accountRoutes);
  app.route('/api/api/projectx', projectxRoutes);
  app.route('/api/api/trading', tradingRoutes);
  app.route('/api/api/market', marketRoutes);
  app.route('/api/api/news', newsRoutes);
  app.route('/api/api/journal', journalRoutes);
  app.route('/api/api/er', erRoutes);
  app.route('/api/api/econ', econRoutes);
  app.route('/api/api/notifications', notificationsRoutes);
  app.route('/api/api/events', eventsRoutes);
  app.route('/api/api/ai', aiRoutes);
  app.route('/api/api/autopilot', autopilotRoutes);

  // Test routes (only available when AUTOPILOT_TEST_MODE=true)
  if (process.env.AUTOPILOT_TEST_MODE === 'true') {
    app.route('/api/api/autopilot/test', autopilotTestRoutes);
  }
}
import { eventsRoutes } from "./events.js";
