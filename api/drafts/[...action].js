const { applyCors } = require('../_lib/cors');
const handlers = require('../_lib/handlers/drafts-handlers');

const ROUTES = {
  list: handlers.list,
  approve: handlers.approve,
  reject: handlers.reject,
  'generate-daily': handlers.generateDaily,
};

module.exports = async (req, res) => {
  if (applyCors(req, res)) return;

  const action = Array.isArray(req.query.action) ? req.query.action[0] : req.query.action;
  const handler = ROUTES[action];

  if (!handler) {
    return res.status(404).json({ error: 'Not found' });
  }

  return handler(req, res);
};
