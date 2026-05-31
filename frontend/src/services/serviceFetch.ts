import { API_BASE_URL, toMediaUrl } from './api';
import { publicAssetUrl } from './mediaAssets';

export interface Service {
  id: number;
  name: string;
  price: number;
  description: string;
  category: string;
  brand: string;
  rating?: number;
  image_url?: string;
  video_url?: string;
  status?: 'active' | 'inactive' | 'deleted' | string;
  weight?: number | string;
  created_at?: string;
}

export interface ServiceFilters {
  search?: string;
  category?: string;
  priceFrom?: number | null;
  priceTo?: number | null;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

export const MOCK_SERVICES: Service[] = [
  {
    id: 1,
    name: 'Apple iPhone 16 Pro 128GB',
    price: 120000,
    description: 'Флагманский смартфон Apple с дисплеем ProMotion, камерой профессионального уровня и высокой производительностью.',
    category: 'Смартфоны',
    brand: 'Apple',
    rating: 4.9,
    image_url: publicAssetUrl('AppleiPhone16Pro128.jpg'),
    video_url: publicAssetUrl('iphone16pro.mp4'),
    status: 'active',
    weight: 0.22,
  },
  {
    id: 2,
    name: 'Apple Watch Ultra 2',
    price: 85000,
    description: 'Защищенные смарт-часы Apple для спорта, навигации и ежедневного контроля активности.',
    category: 'Носимые устройства',
    brand: 'Apple',
    rating: 4.8,
    image_url: publicAssetUrl('AppleWatchUltra2.jpg'),
    video_url: publicAssetUrl('applewatchultra2.mp4'),
    status: 'active',
    weight: 0.06,
  },
  {
    id: 3,
    name: 'MacBook Pro 16',
    price: 250000,
    description: 'Профессиональный ноутбук Apple с большим Liquid Retina XDR дисплеем и мощной аппаратной платформой.',
    category: 'Ноутбуки',
    brand: 'Apple',
    rating: 4.9,
    image_url: publicAssetUrl('MacBookPro16.png'),
    video_url: publicAssetUrl('macbookpro16.mp4'),
    status: 'active',
    weight: 2.1,
  },
  {
    id: 4,
    name: 'Sony WH-1000XM5',
    price: 35000,
    description: 'Беспроводные наушники Sony с активным шумоподавлением и длительным временем работы.',
    category: 'Аудио',
    brand: 'Sony',
    rating: 4.7,
    image_url: publicAssetUrl('SonyWH_1000XM5.jpg'),
    status: 'active',
    weight: 0.25,
  },
  {
    id: 5,
    name: 'Xiaomi Robot Vacuum S20+',
    price: 42000,
    description: 'Робот-пылесос Xiaomi для сухой и влажной уборки с построением карты помещения.',
    category: 'Бытовая техника',
    brand: 'Xiaomi',
    rating: 4.6,
    image_url: publicAssetUrl('XiaomiRobotVacuumS20-.jpg'),
    status: 'active',
    weight: 3.8,
  },
  {
    id: 6,
    name: 'Dreame H12 Pro FlexReach',
    price: 52000,
    description: 'Моющий беспроводной пылесос Dreame для ухода за твердыми напольными покрытиями.',
    category: 'Бытовая техника',
    brand: 'Dreame',
    rating: 4.6,
    image_url: publicAssetUrl('DreameH12ProFlexReach.jpg'),
    status: 'active',
    weight: 5.1,
  },
  {
    id: 7,
    name: 'HONOR MagicBook X14 Plus 2025',
    price: 78000,
    description: 'Компактный ноутбук HONOR для учебы, работы и повседневных задач.',
    category: 'Ноутбуки',
    brand: 'HONOR',
    rating: 4.5,
    image_url: publicAssetUrl('HONORMagicBookX14Plus2025.jpg'),
    status: 'active',
    weight: 1.4,
  },
  {
    id: 8,
    name: 'DEXP SBS510M Side-by-Side',
    price: 68000,
    description: 'Вместительный холодильник Side-by-Side DEXP для хранения большого объема продуктов.',
    category: 'Бытовая техника',
    brand: 'DEXP',
    rating: 4.4,
    image_url: publicAssetUrl('SidebySideDEXPSBS510M.jpg'),
    status: 'active',
    weight: 85,
  },
];

const normalizeService = (item: any): Service => ({
  ...item,
  id: Number(item.id),
  price: Number(item.price || 0),
  rating: item.rating == null ? undefined : Number(item.rating),
  image_url: toMediaUrl(item.image_url),
  video_url: toMediaUrl(item.video_url),
});

const applyMockFilters = (services: Service[], filters: ServiceFilters = {}) => {
  return services.filter((service) => {
    if (filters.search && !service.name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    if (filters.category && filters.category !== 'all' && service.category !== filters.category) {
      return false;
    }
    if (filters.priceFrom != null && service.price < filters.priceFrom) {
      return false;
    }
    if (filters.priceTo != null && service.price > filters.priceTo) {
      return false;
    }
    if (filters.dateFrom && service.created_at && service.created_at.slice(0, 10) < filters.dateFrom) {
      return false;
    }
    if (filters.dateTo && service.created_at && service.created_at.slice(0, 10) > filters.dateTo) {
      return false;
    }
    return true;
  });
};

const buildServiceQuery = (filters: ServiceFilters = {}) => {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.category && filters.category !== 'all') params.set('category', filters.category);
  if (filters.priceFrom != null) params.set('price_min', String(filters.priceFrom));
  if (filters.priceTo != null) params.set('price_max', String(filters.priceTo));
  if (filters.dateFrom) params.set('date_from', filters.dateFrom);
  if (filters.dateTo) params.set('date_to', filters.dateTo);
  return params.toString();
};

const extractList = (json: any): Service[] => {
  const data = json?.data || json?.results || json;
  return Array.isArray(data) ? data.map(normalizeService) : [];
};

export async function fetchServices(filters: ServiceFilters = {}): Promise<Service[]> {
  const query = buildServiceQuery(filters);
  const url = `${API_BASE_URL}/services/${query ? `?${query}` : ''}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const services = extractList(await response.json());
    return filters.limit ? services.slice(0, filters.limit) : services;
  } catch (error) {
    console.warn('Backend недоступен, использую mock-товары:', error);
    const services = applyMockFilters(MOCK_SERVICES, filters);
    return filters.limit ? services.slice(0, filters.limit) : services;
  }
}

export async function fetchServiceById(serviceId: number): Promise<Service> {
  try {
    const response = await fetch(`${API_BASE_URL}/services/${serviceId}/`, {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    return normalizeService(json?.data || json);
  } catch (error) {
    console.warn('Backend недоступен, использую mock-товар:', error);
    const service = MOCK_SERVICES.find((item) => item.id === serviceId) || MOCK_SERVICES[0];
    return { ...service, id: serviceId };
  }
}
