import { MOCK_SERVICES, type Service } from './serviceFetch';

export const isStaticMockMode = (): boolean =>
  import.meta.env.MODE === 'mock' ||
  import.meta.env.VITE_APP_MODE === 'mock' ||
  (import.meta.env.BASE_URL || '/') !== '/';

type MockRole = 'USER' | 'ADMIN';
type MockOrderStatus = 'draft' | 'submitted' | 'completed' | 'rejected' | 'deleted';

export interface MockUser {
  id: number;
  username: string;
  email?: string;
  role: MockRole;
  password: string;
}

export interface MockOrderItem {
  id: number;
  service_id: number;
  quantity: number;
  price_at_time: number;
  service: Service;
  service_name: string;
  service_price: number;
}

export interface MockOrder {
  id: number;
  user: { id: number; username: string; email?: string };
  status: MockOrderStatus;
  created_at: string;
  submitted_at?: string;
  completed_at?: string;
  total_amount: number;
  total_items: number;
  items_count: number;
  items: MockOrderItem[];
}

const USERS_KEY = 'voltmarket_mock_users';
const ORDERS_KEY = 'voltmarket_mock_orders';
const SERVICES_KEY = 'voltmarket_mock_services';
const USER_KEY = 'user';

const readJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = <T>(key: string, value: T) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const publicUser = (user: MockUser) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  role: user.role,
});

const getSeedUsers = (): MockUser[] => [
  { id: 1, username: 'user', email: 'user@gmail.com', role: 'USER', password: 'user123' },
  { id: 2, username: 'admin', email: '', role: 'ADMIN', password: 'admin123' },
];

export const getMockUsers = (): MockUser[] => {
  const users = readJson<MockUser[]>(USERS_KEY, []);
  if (users.length > 0) return users;
  const seeded = getSeedUsers();
  writeJson(USERS_KEY, seeded);
  return seeded;
};

const saveMockUsers = (users: MockUser[]) => writeJson(USERS_KEY, users);

export const getCurrentMockUser = () => {
  const stored = readJson<ReturnType<typeof publicUser> | null>(USER_KEY, null);
  if (!stored?.username) return null;
  return stored;
};

export const mockLogin = (username: string, password: string) => {
  const normalizedUsername = username.trim();
  const user = getMockUsers().find((item) => item.username.toLowerCase() === normalizedUsername.toLowerCase());
  if (!user || user.password !== password) {
    throw new Error('Неверный логин или пароль');
  }
  const safeUser = publicUser(user);
  writeJson(USER_KEY, safeUser);
  return safeUser;
};

export const mockRegister = (username: string, email: string, password: string) => {
  const normalizedUsername = username.trim();
  if (!normalizedUsername || !password) {
    throw new Error('Заполните логин и пароль');
  }

  const users = getMockUsers();
  const role: MockRole = normalizedUsername.toLowerCase() === 'admin' ? 'ADMIN' : 'USER';
  const existingIndex = users.findIndex((item) => item.username.toLowerCase() === normalizedUsername.toLowerCase());
  let user: MockUser;

  if (existingIndex >= 0) {
    user = {
      ...users[existingIndex],
      username: normalizedUsername,
      email,
      role,
      password,
    };
    users[existingIndex] = user;
  } else {
    user = {
      id: Math.max(0, ...users.map((item) => item.id)) + 1,
      username: normalizedUsername,
      email,
      role,
      password,
    };
    users.push(user);
  }

  saveMockUsers(users);
  const safeUser = publicUser(user);
  writeJson(USER_KEY, safeUser);
  return safeUser;
};

export const mockLogout = () => {
  localStorage.removeItem(USER_KEY);
};

export const setMockUserRole = (userId: number, role: MockRole) => {
  const users = getMockUsers().map((user) => (
    user.id === userId ? { ...user, role } : user
  ));
  saveMockUsers(users);
  const updated = users.find((user) => user.id === userId);
  const current = getCurrentMockUser();
  if (updated && current?.id === userId) {
    writeJson(USER_KEY, publicUser(updated));
  }
  return updated ? publicUser(updated) : null;
};

const decorateService = (service: Service): Service => ({
  ...service,
  status: service.status || 'active',
});

export const getMockServices = (): Service[] => {
  const stored = readJson<Service[]>(SERVICES_KEY, []);
  if (stored.length > 0) return stored;
  const seeded = MOCK_SERVICES.map(decorateService);
  writeJson(SERVICES_KEY, seeded);
  return seeded;
};

const saveMockServices = (services: Service[]) => writeJson(SERVICES_KEY, services);

export const setMockServiceStatus = (serviceId: number, status: 'active' | 'inactive' | 'deleted') => {
  const services = getMockServices().map((service) => (
    service.id === serviceId ? { ...service, status } : service
  ));
  saveMockServices(services);
  return services.find((service) => service.id === serviceId);
};

const getMockOrders = (): MockOrder[] => readJson<MockOrder[]>(ORDERS_KEY, []);
const saveMockOrders = (orders: MockOrder[]) => writeJson(ORDERS_KEY, orders);

const currentUserOrThrow = () => {
  const user = getCurrentMockUser();
  if (!user) throw new Error('Требуется авторизация');
  return user;
};

const recalculateOrder = (order: MockOrder): MockOrder => {
  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = order.items.reduce((sum, item) => sum + item.quantity * Number(item.price_at_time || 0), 0);
  return {
    ...order,
    total_items: totalItems,
    items_count: totalItems,
    total_amount: totalAmount,
  };
};

const findOrCreateDraft = () => {
  const user = currentUserOrThrow();
  const orders = getMockOrders();
  let order = orders.find((item) => item.status === 'draft' && item.user.id === user.id);

  if (!order) {
    order = {
      id: Math.max(1000, ...orders.map((item) => item.id)) + 1,
      user: { id: user.id, username: user.username, email: user.email },
      status: 'draft',
      created_at: new Date().toISOString(),
      total_amount: 0,
      total_items: 0,
      items_count: 0,
      items: [],
    };
    orders.push(order);
    saveMockOrders(orders);
  }

  return order;
};

export const getMockCart = () => {
  const user = currentUserOrThrow();
  const order = getMockOrders().find((item) => item.status === 'draft' && item.user.id === user.id);
  return order ? recalculateOrder(order) : null;
};

export const addMockCartItem = (serviceId: number) => {
  const orders = getMockOrders();
  const draft = findOrCreateDraft();
  const service = getMockServices().find((item) => item.id === serviceId);
  if (!service) throw new Error('Товар не найден');

  const existing = draft.items.find((item) => item.service_id === serviceId);
  if (existing) {
    existing.quantity += 1;
  } else {
    draft.items.push({
      id: Date.now(),
      service_id: serviceId,
      quantity: 1,
      price_at_time: Number(service.price),
      service,
      service_name: service.name,
      service_price: Number(service.price),
    });
  }

  const nextOrder = recalculateOrder(draft);
  const nextOrders = orders.some((item) => item.id === nextOrder.id)
    ? orders.map((item) => item.id === nextOrder.id ? nextOrder : item)
    : [...orders, nextOrder];
  saveMockOrders(nextOrders);
  return nextOrder;
};

export const updateMockCartItem = (orderId: number, serviceId: number, quantity: number) => {
  const orders = getMockOrders();
  const order = orders.find((item) => item.id === orderId);
  if (!order) throw new Error('Заявка не найдена');
  order.items = order.items.map((item) => (
    item.service_id === serviceId ? { ...item, quantity: Math.max(1, quantity) } : item
  ));
  const nextOrder = recalculateOrder(order);
  saveMockOrders(orders.map((item) => item.id === orderId ? nextOrder : item));
  return nextOrder;
};

export const removeMockCartItem = (orderId: number, serviceId: number) => {
  const orders = getMockOrders();
  const order = orders.find((item) => item.id === orderId);
  if (!order) throw new Error('Заявка не найдена');
  order.items = order.items.filter((item) => item.service_id !== serviceId);
  const nextOrder = recalculateOrder(order);
  saveMockOrders(orders.map((item) => item.id === orderId ? nextOrder : item));
  return nextOrder;
};

export const submitMockOrder = (orderId: number) => {
  const orders = getMockOrders();
  const order = orders.find((item) => item.id === orderId);
  if (!order) throw new Error('Заявка не найдена');
  const nextOrder = recalculateOrder({
    ...order,
    status: 'submitted',
    submitted_at: new Date().toISOString(),
  });
  saveMockOrders(orders.map((item) => item.id === orderId ? nextOrder : item));
  return nextOrder;
};

export const getMockOrdersList = (params?: { status?: string; date_from?: string; date_to?: string }) => {
  const user = currentUserOrThrow();
  const orders = getMockOrders()
    .filter((order) => user.role === 'ADMIN' || order.user.id === user.id)
    .filter((order) => !params?.status || order.status === params.status)
    .filter((order) => !params?.date_from || order.created_at.slice(0, 10) >= params.date_from!)
    .filter((order) => !params?.date_to || order.created_at.slice(0, 10) <= params.date_to!)
    .map(recalculateOrder)
    .sort((a, b) => b.id - a.id);
  return orders;
};

export const getMockOrder = (orderId: number) => {
  const user = currentUserOrThrow();
  const order = getMockOrders().find((item) => item.id === orderId);
  if (!order || (user.role !== 'ADMIN' && order.user.id !== user.id)) {
    throw new Error('Заявка не найдена');
  }
  return recalculateOrder(order);
};

export const setMockOrderStatus = (orderId: number, status: Exclude<MockOrderStatus, 'draft' | 'deleted'>) => {
  const orders = getMockOrders();
  const order = orders.find((item) => item.id === orderId);
  if (!order) throw new Error('Заявка не найдена');
  const nextOrder = recalculateOrder({
    ...order,
    status,
    completed_at: status === 'completed' ? new Date().toISOString() : order.completed_at,
  });
  saveMockOrders(orders.map((item) => item.id === orderId ? nextOrder : item));
  return nextOrder;
};

export const deleteMockOrder = (orderId: number) => {
  const orders = getMockOrders();
  const order = orders.find((item) => item.id === orderId);
  if (!order) throw new Error('Заявка не найдена');
  const nextOrder = recalculateOrder({ ...order, status: 'deleted' });
  saveMockOrders(orders.map((item) => item.id === orderId ? nextOrder : item));
  return nextOrder;
};
