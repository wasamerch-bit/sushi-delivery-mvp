// server.js - Minimal Fastify Mock Server for SushiDelivery MVP
const fastify = require('fastify')({ logger: true });
const { v4: uuidv4 } = require('uuid');
fastify.register(require('fastify-multipart'));

// In-memory stores (mock)
const ORDERS = new Map();
const TASKS = new Map();
const DRIVERS = new Map();
const TOURS = new Map();
const PHOTOS = new Map();

// Helper
function nowISO(){ return new Date().toISOString(); }

// Webhook: /webhook/orders
fastify.post('/webhook/orders', async (request, reply) => {
  const body = request.body;
  if (!body || !body.order || !body.order.order_id) {
    return reply.code(400).send({ error: 'invalid payload' });
  }
  const channel = body.source || body.order.channel || 'unknown';
  const channelOrderId = body.order.channel_order_id || body.order.order_id;
  // idempotency: search by channel+channelOrderId
  for (let o of ORDERS.values()){
    if (o.channel === channel && o.channel_order_id === channelOrderId){
      return reply.code(409).send({ ok: true, existing_order_id: o.id });
    }
  }
  const id = uuidv4();
  const order = {
    id,
    channel,
    channel_order_id: channelOrderId,
    customer_name: body.order.customer_name || null,
    customer_phone: body.order.customer_phone || null,
    delivery_address: body.order.delivery_address || null,
    items: body.order.items || [],
    requested_time: body.order.requested_time || null,
    priority: body.order.priority || 0,
    state: 'received',
    created_at: nowISO(),
    updated_at: nowISO()
  };
  ORDERS.set(id, order);

  // create tasks per item.station
  const stations = {};
  (order.items || []).forEach(it => {
    const s = it.station || 'packing';
    if (!stations[s]) stations[s] = [];
    stations[s].push(it);
  });
  Object.keys(stations).forEach(station => {
    const taskId = uuidv4();
    const task = {
      id: taskId,
      order_id: id,
      station,
      status: 'pending',
      estimated_time: Math.max(30, (stations[station].reduce((a,b)=>a+(b.prep_time||60),0))),
      created_at: nowISO(),
      updated_at: nowISO()
    };
    TASKS.set(taskId, task);
  });

  // emit (mock) event log
  fastify.log.info({event: 'order.created', order_id: id});
  return reply.send({ ok: true, order_id: id });
});

// GET /orders
fastify.get('/orders', async (req, reply) => {
  const { state, station } = req.query;
  let res = Array.from(ORDERS.values());
  if (state) res = res.filter(o => o.state === state);
  if (station) {
    const orderIdsWithStation = new Set();
    for (let t of TASKS.values()){
      if (t.station === station) orderIdsWithStation.add(t.order_id);
    }
    res = res.filter(o => orderIdsWithStation.has(o.id));
  }
  return reply.send(res);
});

// GET /orders/:orderId
fastify.get('/orders/:orderId', async (req, reply) => {
  const o = ORDERS.get(req.params.orderId);
  if (!o) return reply.code(404).send({ error: 'not found' });
  return reply.send(o);
});

// Tasks for KDS: /tasks?station=sushi
fastify.get('/tasks', async (req, reply) => {
  const { station } = req.query;
  let res = Array.from(TASKS.values());
  if (station) res = res.filter(t => t.station === station);
  return reply.send(res);
});

// Claim task
fastify.post('/tasks/:taskId/claim', async (req, reply) => {
  const task = TASKS.get(req.params.taskId);
  if (!task) return reply.code(404).send({ error: 'task not found' });
  const { user_id } = req.body || {};
  if (!user_id) return reply.code(400).send({ error: 'missing user_id' });
  if (task.status !== 'pending') return reply.code(409).send({ error: 'task not pending' });
  task.status = 'claimed';
  task.claimed_by = user_id;
  task.started_at = nowISO();
  task.updated_at = nowISO();
  TASKS.set(task.id, task);
  return reply.send({ ok: true, task });
});

// Update task status
fastify.post('/tasks/:taskId/status', async (req, reply) => {
  const task = TASKS.get(req.params.taskId);
  if (!task) return reply.code(404).send({ error: 'task not found' });
  const { status, by } = req.body || {};
  if (!status) return reply.code(400).send({ error: 'missing status' });
  task.status = status;
  if (status === 'done') task.finished_at = nowISO();
  task.updated_at = nowISO();
  TASKS.set(task.id, task);

  // If all tasks for order are done -> mark order ready_for_pack
  const orderTasks = Array.from(TASKS.values()).filter(t=>t.order_id === task.order_id);
  const allDone = orderTasks.every(t=>t.status === 'done');
  if (allDone){
    const order = ORDERS.get(task.order_id);
    if (order){
      order.state = 'ready_for_pack';
      order.updated_at = nowISO();
      ORDERS.set(order.id, order);
    }
  }

  return reply.send({ ok: true, task });
});

// Driver status update
fastify.post('/drivers/:driverId/status', async (req, reply) => {
  const driverId = req.params.driverId;
  const body = req.body || {};
  let drv = DRIVERS.get(driverId);
  if (!drv){
    drv = { id: driverId, name: body.name || null, status: body.status || 'available', last_location: body.location || null, created_at: nowISO(), updated_at: nowISO() };
  } else {
    drv.status = body.status || drv.status;
    drv.last_location = body.location || drv.last_location;
    drv.updated_at = nowISO();
  }
  DRIVERS.set(driverId, drv);
  return reply.send({ ok: true, driver: drv });
});

// Driver accepts tour
fastify.post('/drivers/:driverId/accept_tour', async (req, reply) => {
  const { tour_id } = req.body || {};
  if (!tour_id) return reply.code(400).send({ error: 'missing tour_id' });
  const tour = TOURS.get(tour_id);
  if (!tour) return reply.code(404).send({ error: 'tour not found' });
  tour.status = 'dispatched';
  tour.updated_at = nowISO();
  TOURS.set(tour_id, tour);
  return reply.send({ ok: true, tour });
});

// Confirm delivery
fastify.post('/drivers/:driverId/confirm_delivery', async (req, reply) => {
  const { order_id, signature_url, photo_url } = req.body || {};
  if (!order_id) return reply.code(400).send({ error: 'missing order_id' });
  const order = ORDERS.get(order_id);
  if (!order) return reply.code(404).send({ error: 'order not found' });
  order.state = 'delivered';
  order.updated_at = nowISO();
  ORDERS.set(order_id, order);
  return reply.send({ ok: true, order });
});

// Upload packing photo: multipart
fastify.post('/orders/:orderId/photo', async (req, reply) => {
  const orderId = req.params.orderId;
  const parts = req.multipart();
  let fileUrl = null;
  for await (const part of parts) {
    if (part.file) {
      const id = uuidv4();
      // In mock: we do not save file - just return a fake URL
      fileUrl = `https://mock.storage.local/photos/${id}.jpg`;
      PHOTOS.set(id, { id, order_id: orderId, url: fileUrl, uploaded_by: part.fields && part.fields.uploaded_by ? part.fields.uploaded_by.value : null, created_at: nowISO() });
    }
  }
  if (!fileUrl) return reply.code(400).send({ error: 'no file uploaded' });
  // Mark order state maybe
  const order = ORDERS.get(orderId);
  if (order) {
    order.updated_at = nowISO();
  }
  return reply.code(201).send({ photo_id: Array.from(PHOTOS.keys()).pop(), url: fileUrl });
});

// Dashboard overview (very basic)
fastify.get('/dashboard/overview', async (req, reply) => {
  const allOrders = Array.from(ORDERS.values());
  const open_orders = allOrders.filter(o => o.state === 'received' || o.state === 'in_preparation' || o.state === 'ready_for_pack' || o.state === 'ready_for_driver').length;
  const in_production = Array.from(TASKS.values()).filter(t => t.status === 'in_progress' || t.status === 'claimed').length;
  const on_the_way = allOrders.filter(o => o.state === 'on_the_way').length;
  const delivered = allOrders.filter(o => o.state === 'delivered').length;
  return reply.send({
    open_orders,
    in_production,
    on_the_way,
    delivered,
    avg_prep_time_seconds: 300,
    avg_delivery_time_seconds: 1200
  });
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    fastify.log.info('Mock server running on http://0.0.0.0:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
